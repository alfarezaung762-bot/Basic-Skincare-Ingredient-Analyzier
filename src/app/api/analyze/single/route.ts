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
    const { productName, productType, ingredients } = await req.json();

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

    // PROMPT DIPERBARUI: Memaksa AI menjawab dengan poin (✅/❌) agar rapi di UI
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

    // SISTEM FALLBACK AI
// ==============================================================
    // 7. SISTEM FALLBACK AI & GRACEFUL DEGRADATION
    // ==============================================================
    const fallbackModels = [
      "gemini-3.1-pro-preview",    // Seri 3.1
      "gemini-3-flash",            // Seri 3
      "gemini-2.5-pro",            // Seri 2.5 Pro
      "gemini-2.5-flash",          // Seri 2.5 Flash
      "gemini-1.5-flash-latest"    // Warisan/Legacy yang paling aman
    ];
    
    let responseText = "";
    let analysisData = null;

    for (const modelName of fallbackModels) {
      try {
        console.log(`Mencoba model AI: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(systemPrompt);
        responseText = await result.response.text();
        
        // Bersihkan output
        const cleanedResponse = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        analysisData = JSON.parse(cleanedResponse);
        
        console.log(`✅ Berhasil menggunakan model: ${modelName}`);
        break; // Jika berhasil, hentikan loop
      } catch (err: any) {
        console.warn(`⚠️ Model ${modelName} gagal: ${err.message}.`);
      }
    }

    // ==============================================================
    // 8. SABUK PENGAMAN (JIKA SEMUA AI MATI / LIMIT HABIS)
    // ==============================================================
    if (!analysisData) {
      console.warn("🚨 SEMUA MODEL AI GAGAL / LIMIT HABIS. MENGGUNAKAN MODE TEMPLATE OTOMATIS.");
      
      // Kita buat JSON tiruan menggunakan data dari Mesin Matematika (Tahap 3)
      analysisData = {
        matchExplanation: engineResult.matchFlags.length > 0 
          ? engineResult.matchFlags.map(flag => `❌ ${flag}`).join('\n')
          : "✅ Produk ini sangat ideal dan memenuhi standar kebutuhan kecocokan profil Anda.",
          
        safetyExplanation: engineResult.safetyFlags.length > 0
          ? engineResult.safetyFlags.map(flag => `❌ ${flag}`).join('\n')
          : "✅ Formulasi produk ini terpantau sangat aman dan minim risiko iritasi untuk Anda.",
          
        aiUnknownAnalysis: engineResult.unknownIngredients.length > 0
          ? "⚠️ Sistem mendeteksi bahan asing yang belum diverifikasi. Karena server AI sedang kelebihan beban, kami belum bisa memberikan estimasi real-time. Harap waspada jika Anda memiliki riwayat alergi."
          : "✅ Semua bahan di dalam produk ini telah terdaftar dan terverifikasi di database medis kami.",
          
        recommendations: [
          "Lakukan patch test (uji tempel) di belakang telinga jika ini adalah pertama kalinya Anda menggunakan produk ini.",
          "Server AI kami saat ini sedang sibuk. Analisis naratif dinonaktifkan sementara, namun skor persentase Anda dijamin 100% akurat berdasarkan sistem pusat."
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

    // 10. Kirim Hasil Gabungan ke Frontend
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