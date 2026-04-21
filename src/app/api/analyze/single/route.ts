// src/app/api/analyze/single/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { runScoringEngine, UserProfile, ProductInput } from "../perhitunganlogic/scoringEngine";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Harap login terlebih dahulu." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    
    // MENANGKAP PARAMETER MODE DARI FRONTEND
    const { productName, productType, ingredients, mode } = await req.json();

    if (!ingredients) {
      return NextResponse.json({ message: "Komposisi (ingredients) tidak boleh kosong." }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ message: "Harap isi profil kulit Anda terlebih dahulu di menu Profil." }, { status: 400 });
    }

    const dictionary = await prisma.ingredientDictionary.findMany();

    const userProfileInput: UserProfile = {
      skinType: profile.skinType,
      age: profile.age,
      isPregnantOrNursing: profile.isPregnantOrNursing,
      severity: profile.severity,
      primaryFocus: profile.primaryFocus,
      allergies: profile.allergies || "",
    };

    const productInput: ProductInput = {
      productName: productName || "Produk Tanpa Nama",
      productType: productType,
      ingredientsRaw: ingredients,
    };

    const engineResult = runScoringEngine(userProfileInput, productInput, dictionary);

    const detectedContext = engineResult.detectedIngredients.map(
      (ing) => `- ${ing.name} (Tipe: ${ing.type}, Fungsi: ${ing.functionalCategory}): ${ing.benefits}`
    ).join("\n");

    const unknownContext = engineResult.unknownIngredients.join(", ");

    const systemPrompt = `
      Anda adalah seorang Ahli Dermatologi AI kelas dunia. Anda beroperasi di bawah aturan mutlak berikut:

      ATURAN 1 (DILARANG MENGHITUNG SKOR):
      Skor produk ini sudah dikunci oleh sistem pusat berdasarkan kondisi pengguna (Tipe Kulit: ${profile.skinType}, Hamil/Menyusui: ${profile.isPregnantOrNursing ? "Ya" : "Tidak"}). DILARANG mengubahnya:
      - Match Score: ${engineResult.matchScore}% (${engineResult.matchLabel})
      - Safety Score: ${engineResult.safetyScore}% (${engineResult.safetyLabel})

      ATURAN 2 (JELASKAN PENALTI KEPADA PENGGUNA):
      Sistem pusat memberikan penalti berikut pada skor. Gunakan informasi ini sebagai acuan penjelasan:
      - Pengurangan Kecocokan: ${engineResult.matchFlags.length > 0 ? engineResult.matchFlags.join(" | ") : "Tidak ada pengurangan."}
      - Pengurangan Keamanan: ${engineResult.safetyFlags.length > 0 ? engineResult.safetyFlags.join(" | ") : "Tidak ada pengurangan."}

      ATURAN 3 (RUJUKAN PASTI - RAG):
      Untuk bahan yang dikenali ini, gunakan HANYA manfaat dan fungsi dari database kami:
      ${detectedContext || "Tidak ada bahan yang terverifikasi."}

      ATURAN 4 (TUGAS ANALISIS AI):
      Sistem pusat menemukan bahan asing ini: [${unknownContext || "Tidak ada"}]. 
      Lakukan analisis singkat terkait fungsi dan tingkat keamanannya khusus untuk bahan-bahan asing tersebut.

      KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON PERSIS SEPERTI DI BAWAH INI.
      PENTING: Gunakan format poin-poin pendek. Gunakan ikon ✅ untuk hal positif dan ikon ❌ untuk hal negatif/penalti. JANGAN gunakan paragraf bertele-tele!
      {
        "matchExplanation": "✅ Poin positif pertama.\\n✅ Poin positif kedua.\\n❌ Poin negatif (jika ada).",
        "safetyExplanation": "✅ Poin aman pertama.\\n❌ Poin bahaya (jika ada).",
        "aiUnknownAnalysis": "Analisis AI independen untuk bahan asing secara singkat. (Isi dengan 'Semua bahan di produk ini telah terverifikasi oleh Admin' jika tidak ada bahan asing)",
        "recommendations": ["Saran pemakaian 1", "Saran alternatif 2"]
      }
    `;

    let responseText = "";
    let analysisData = null;

    // ==============================================================
    // 7. SISTEM AI (HANYA BERJALAN JIKA USER MEMILIH HYBRID)
    // ==============================================================
    if (mode !== "FAST") {
      const fallbackModels = [
        "gemini-3.1-pro-preview",
        "gemini-3-flash",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-1.5-flash-latest"
      ];
      
      for (const modelName of fallbackModels) {
        try {
          console.log(`Mencoba model AI: ${modelName}...`);
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(systemPrompt);
          responseText = await result.response.text();
          
          const cleanedResponse = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
          analysisData = JSON.parse(cleanedResponse);
          
          console.log(`✅ Berhasil menggunakan model: ${modelName}`);
          break; 
        } catch (err: any) {
          console.warn(`⚠️ Model ${modelName} gagal: ${err.message}.`);
        }
      }
    }

    // ==============================================================
    // 8. MODE CEPAT (FAST) ATAU SABUK PENGAMAN JIKA AI GAGAL
    // ==============================================================
    if (!analysisData) {
      if (mode === "FAST") {
        console.log("⚡ Menjalankan Analisis via Sistem Cepat (Tanpa AI).");
      } else {
        console.warn("🚨 SEMUA MODEL AI GAGAL / LIMIT HABIS. BERALIH KE SISTEM CEPAT.");
      }
      
      analysisData = {
        matchExplanation: engineResult.matchFlags.length > 0 
          ? engineResult.matchFlags.map(flag => `❌ ${flag}`).join('\n')
          : "✅ Produk ini terpantau ideal dan tidak memiliki kandungan yang bertentangan dengan kebutuhan kecocokan profil Anda.",
          
        safetyExplanation: engineResult.safetyFlags.length > 0
          ? engineResult.safetyFlags.map(flag => `❌ ${flag}`).join('\n')
          : "✅ Berdasarkan kalkulasi sistem pusat, tidak ditemukan bahan keras atau toksik yang berisiko mengiritasi profil kulit Anda.",
          
        aiUnknownAnalysis: engineResult.unknownIngredients.length > 0
          ? "⚠️ Sistem mendeteksi bahan asing yang belum diverifikasi oleh database kami. Pada Mode Sistem Cepat, AI dinonaktifkan sehingga evaluasi mendalam untuk bahan asing dilewati. Harap waspada jika Anda memiliki riwayat alergi."
          : "✅ Seluruh bahan dalam formulasi ini telah terdaftar resmi dan terverifikasi di database medis kami.",
          
        recommendations: mode === "FAST" 
          ? [
              "Mode Sistem Cepat sedang aktif. Analisis naratif AI dimatikan untuk mempercepat hasil.",
              "Skor persentase yang Anda lihat dijamin 100% akurat karena dihitung langsung oleh algoritma medis pusat kami.",
              "Lakukan patch test (uji tempel) di area rahang jika ini adalah produk baru bagi Anda."
            ]
          : [
              "Server AI eksternal kami saat ini sedang sibuk, analisis naratif dinonaktifkan sementara.",
              "Lakukan patch test (uji tempel) di belakang telinga jika ini adalah pertama kalinya Anda menggunakan produk ini."
            ]
      };
    }

    // 9. Simpan Analisis ke Tabel History
    const savedHistory = await prisma.analysisHistory.create({
      data: {
        userId: userId,
        productName: productName || "Produk Analisis",
        productType: productType,
        ingredientsInput: ingredients,
        matchScore: engineResult.matchScore,
        safetyScore: engineResult.safetyScore,
        aiResponse: analysisData, 
      }
    });

    return NextResponse.json({ 
      engineResult: engineResult,
      analysis: analysisData,
      historyId: savedHistory.id
    }, { status: 200 });

  } catch (error: any) {
    console.error("Endpoint Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan sistem fatal saat memproses data." }, 
      { status: 500 }
    );
  }
}