import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { statusFilter, typeFilter, columns } = await req.json();

    // Build query based on selected filters
    const where: any = {};

    if (statusFilter === "VERIFIED") {
      where.isVerified = true;
    } else if (statusFilter === "UNVERIFIED") {
      where.isVerified = false;
    }

    if (typeFilter && typeFilter !== "ALL") {
      where.type = typeFilter;
    }

    // Retrieve ingredients from dictionary
    const ingredients = await prisma.ingredientDictionary.findMany({
      where,
      orderBy: { name: "asc" },
    });

    // Generate beautifully formatted plain text content
    let textContent = `==================================================\n`;
    textContent += `EKSPOR DATA KAMUS BAHAN KECANTIKAN\n`;
    textContent += `Tanggal Ekspor: ${new Date().toLocaleString("id-ID")}\n`;
    textContent += `Filter Status: ${statusFilter}\n`;
    textContent += `Filter Tipe Kimia: ${typeFilter}\n`;
    textContent += `Jumlah Bahan: ${ingredients.length}\n`;
    textContent += `==================================================\n\n`;

    ingredients.forEach((ing, index) => {
      textContent += `${index + 1}. [NAMA INCI: ${ing.name.toUpperCase()}]\n`;
      
      if (columns.aliases && ing.aliases) {
        textContent += `   - Sinonim/Alias: ${ing.aliases}\n`;
      }
      if (columns.type) {
        textContent += `   - Sifat Kimia: ${ing.type} (Level Kekuatan: ${ing.strengthLevel})\n`;
      }
      if (columns.functionalCategory) {
        textContent += `   - Fungsi Utama: ${ing.functionalCategory}\n`;
      }
      if (columns.isKeyActive) {
        textContent += `   - Bahan Aktif Utama: ${ing.isKeyActive ? "YA ⭐" : "TIDAK"}\n`;
      }
      if (columns.benefits) {
        textContent += `   - Manfaat Singkat: ${ing.benefits || "-"}\n`;
      }
      if (columns.comedogenicRating !== undefined) {
        textContent += `   - Rating Komedogenik (0-5): ${ing.comedogenicRating}\n`;
      }
      if (columns.safeForPregnancy) {
        textContent += `   - Aman untuk Bumil/Busui: ${ing.safeForPregnancy ? "YA ✅" : "TIDAK ❌"}\n`;
      }
      if (columns.safeForSensitive) {
        textContent += `   - Aman untuk Kulit Sensitif: ${ing.safeForSensitive ? "YA ✅" : "TIDAK ❌"}\n`;
      }
      if (columns.targetFocus && ing.targetFocus) {
        textContent += `   - Fokus Perawatan: ${ing.targetFocus}\n`;
      }
      if (columns.blacklistedSkinTypes && ing.blacklistedSkinTypes) {
        textContent += `   - Dilarang untuk Tipe Kulit: ${ing.blacklistedSkinTypes}\n`;
        if (ing.blacklistReason) {
          textContent += `     Alasan: ${ing.blacklistReason}\n`;
        }
      }
      if (columns.aiContext && ing.aiContext) {
        textContent += `   - Analisis Mendalam AI:\n${ing.aiContext.split('\n').map(line => `     ${line}`).join('\n')}\n`;
      }
      textContent += `\n`;
    });

    // Return plain text response
    return new Response(textContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="ingredients-export.txt"`,
      },
    });

  } catch (error: any) {
    console.error("Export Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan sistem saat mengekspor data." },
      { status: 500 }
    );
  }
}
