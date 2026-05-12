import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { statusFilter, typeFilter, columns } = body;

    // Build filter query
    const whereClause: any = {};
    if (statusFilter === "VERIFIED") {
      whereClause.isVerified = true;
    } else if (statusFilter === "UNVERIFIED") {
      whereClause.isVerified = false;
    }

    if (typeFilter && typeFilter !== "ALL") {
      whereClause.type = typeFilter;
    }

    const ingredients = await prisma.ingredientDictionary.findMany({
      where: whereClause,
      orderBy: { name: 'asc' }
    });

    // Create header prompt for Deep Research AI / Quality Control
    const promptHeader = `================================================================================
[ 🤖 SYSTEM PROMPT & DATABASE SCHEMA RULES UNTUK MESIN AI ]
Instruksi: Anda adalah AI Skincare Expert dan Lead Quality Control (QC). 
Berikut adalah data bahan dari "Basic Skincare Ingredient Analyzer".

TUGAS UTAMA ANDA:
Lakukan audit (Deep Research) pada setiap bahan yang terlampir. Cocokkan semua nilai parameter (Sifat Kimia, Level Kekuatan, Komedogenik, Aman Bumil, Aman Sensitif, dll) dengan sumber ilmiah dermatologi kosmetik yang valid (contoh: INCI Decoder, Paula's Choice Ingredient Dictionary, CIR - Cosmetic Ingredient Review, atau jurnal medis).

JIKA ANDA MENEMUKAN KESALAHAN DATA PADA BAHAN APAPUN, ANDA WAJIB MERESPON DENGAN FORMAT BERIKUT UNTUK SETIAP KESALAHAN:

[ 🚨 LAPORAN KOREKSI DATA ]
- NAMA BAHAN     : [Nama INCI bahan yang salah]
- PARAMETER SALAH: [Sebutkan parameternya, contoh: Komedogenik (Tertulis: 3)]
- KOREKSI BENAR  : [Nilai yang seharusnya, contoh: 0]
- SUMBER VALID   : [Sebutkan sumber referensi medis/kosmetiknya]
- ALASAN MEDIS   : [Jelaskan singkat mengapa data sebelumnya salah]
--------------------------------------------------------------------------------

ATURAN LOGIKA SISTEM (Gunakan sebagai dasar evaluasi):
1. SIFAT KIMIA:
   - BASIC  : Netral/alami (Kekuatan selalu 1).
   - BUFFER : Penenang/Soothing (Ceramide, Panthenol).
   - HARSH  : Asam/Aktif Keras (AHA, BHA, Retinol, Vit C).
   - TOXIC  : Masuk daftar hitam/berbahaya.

2. LEVEL KEKUATAN (Eksklusif HARSH & BUFFER):
   - Level 1 (Lembut/Pemula), Level 2 (Menengah), Level 3 (Sangat Kuat/Resep).

3. FUNGSI KHUSUS:
   SURFAKTAN, UV_FILTER, PELEMBAP_HUMEKTAN, PELEMBAP_EMOLIEN, PELEMBAP_OKLUSIF, UMUM.

4. PARAMETER KEAMANAN:
   - KOMEDOGENIK (0-5), AMAN BUMIL (YA/TIDAK), AMAN SENSITIF (YA/TIDAK).
   - BLACKLIST MUTLAK: Tipe kulit yang dilarang keras memakai bahan ini.

================================================================================
(Daftar Bahan Hasil Eksport Dimulai di Sini)

`;

    let content = promptHeader;

    if (ingredients.length === 0) {
      content += `\n[ TIDAK ADA DATA YANG COCOK DENGAN FILTER ]\n`;
    }

    ingredients.forEach((ing) => {
      content += `==== NAMA INCI: ${ing.name} ====\n`;
      if (columns.aliases && ing.aliases) content += `ALIAS           : ${ing.aliases}\n`;
      if (columns.type) content += `SIFAT KIMIA     : ${ing.type} (Kekuatan: ${ing.strengthLevel})\n`;
      if (columns.functionalCategory) content += `FUNGSI KHUSUS   : ${ing.functionalCategory}\n`;
      if (columns.isKeyActive) content += `BAHAN AKTIF     : ${ing.isKeyActive ? "YA ⭐" : "TIDAK"}\n`;
      if (columns.benefits && ing.benefits) content += `MANFAAT         : ${ing.benefits}\n`;
      if (columns.aiContext && ing.aiContext) content += `ANALISIS AI     : ${ing.aiContext}\n`;
      if (columns.comedogenicRating) content += `KOMEDOGENIK     : ${ing.comedogenicRating}\n`;
      if (columns.safeForPregnancy) content += `AMAN BUMIL      : ${ing.safeForPregnancy ? "YA" : "TIDAK"}\n`;
      if (columns.safeForSensitive) content += `AMAN SENSITIF   : ${ing.safeForSensitive ? "YA" : "TIDAK"}\n`;
      if (columns.targetFocus && ing.targetFocus) content += `FOKUS PERAWATAN : ${ing.targetFocus}\n`;
      if (columns.blacklistedSkinTypes && ing.blacklistedSkinTypes) {
        content += `BLACKLIST MUTLAK: ${ing.blacklistedSkinTypes} (Alasan: ${ing.blacklistReason || '-'}) \n`;
      }
      content += `\n`;
    });

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="skincare_data_${Date.now()}.txt"`,
      },
    });

  } catch (error) {
    console.error("API Download Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan server saat men-generate file." }, { status: 500 });
  }
}
