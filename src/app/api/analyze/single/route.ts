// src/app/api/analyze/single/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Mengambil API Key dari .env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    // 1. Cek Autentikasi Pengguna
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Harap login terlebih dahulu." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { productName, productType, ingredients } = await req.json();

    if (!ingredients) {
      return NextResponse.json({ message: "Komposisi (ingredients) tidak boleh kosong." }, { status: 400 });
    }

    // 2. Tarik Profil Kulit Pengguna dari Database
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ message: "Harap isi profil kulit Anda terlebih dahulu di menu Profil." }, { status: 400 });
    }

    // 3. Meracik Instruksi (Prompt Engineering) untuk Gemini
    const systemPrompt = `
      Anda adalah seorang Ahli Dermatologi AI kelas dunia. Tugas Anda adalah menganalisis kecocokan komposisi skincare dengan profil kulit spesifik klien.

      DATA KLIEN:
      - Jenis Kulit: ${profile.skinType}
      - Umur: ${profile.age} tahun
      - Keparahan Masalah: ${profile.severity}
      - Fokus Perawatan: ${profile.primaryFocus}
      - Alergi/Sensitivitas: ${profile.allergies || "Tidak ada"}
      - Status Hamil/Menyusui: ${profile.isPregnantOrNursing ? "YA" : "TIDAK"}

      PRODUK YANG DIANALISIS:
      - Jenis Produk: ${productType}
      - Komposisi (Ingredients): ${ingredients}

      INSTRUKSI:
      Analisis bahan-bahan tersebut dan perhatikan khusus Red Flags (seperti comedogenic untuk kulit berminyak, bahan keras untuk kulit sensitif, atau larangan keras bahan aktif seperti Retinol untuk ibu hamil/menyusui).

      KEMBALIKAN OUTPUT HANYA DALAM FORMAT JSON PERSIS SEPERTI DI BAWAH INI TANPA TAMBAHAN TEKS LAIN ATAU MARKDOWN:
      {
        "matchScore": [Angka 0-100],
        "matchExplanation": "[Satu paragraf singkat penjelasan kecocokan produk ini dengan klien]",
        "safetyScore": [Angka 0-100],
        "safetyExplanation": "[Satu paragraf singkat penjelasan tingkat keamanan, iritasi, dan efek samping potensial]",
        "redFlags": ["[Daftar bahan berbahaya/menyumbat pori untuk klien ini, kosongkan jika aman]"],
        "recommendations": ["[Daftar saran alternatif atau cara pemakaian yang aman]"]
      }
    `;

    // 4. Memanggil Google Gemini AI (Model Flash yang super cepat)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(systemPrompt);
    const responseText = await result.response.text();

    // 5. Membersihkan Output AI (Berjaga-jaga jika AI menambahkan format ```json)
    let cleanedResponse = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    // 6. Mengubah string JSON menjadi Object Javascript
    const analysisData = JSON.parse(cleanedResponse);

    // [OPSIONAL: Di masa depan, kita bisa menyimpan analisis ini ke tabel History di sini]

    // 7. Kirim hasil analisis ke Frontend
    return NextResponse.json({ analysis: analysisData }, { status: 200 });

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    return NextResponse.json(
      { message: "Gagal menganalisis. AI sedang sibuk atau komposisi tidak terbaca." }, 
      { status: 500 }
    );
  }
}