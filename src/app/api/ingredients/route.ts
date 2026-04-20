import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// 1. Mengambil semua data bahan (GET)
export async function GET() {
  try {
    const ingredients = await prisma.ingredientDictionary.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(ingredients, { status: 200 });
  } catch (error: any) {
    console.error("GET Ingredients Error:", error.message);
    return NextResponse.json({ message: "Gagal mengambil data bahan" }, { status: 500 });
  }
}

// 2. Menambah bahan baru (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // PERUBAHAN: Menangkap functionalCategory
    const { 
      name, aliases, type, functionalCategory, benefits, warnings, comedogenicRating, 
      safeForPregnancy, safeForSensitive, goodForSkinTypes, targetFocus 
    } = body;

    // Cek jika nama kosong
    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Nama bahan tidak boleh kosong." }, { status: 400 });
    }

    // Proses pembuatan data di Prisma
    const newIngredient = await prisma.ingredientDictionary.create({
      data: {
        name: name.toLowerCase().trim(),
        aliases: aliases ? aliases.toLowerCase().trim() : null,
        type: type || "BASIC",
        functionalCategory: functionalCategory || "UMUM", // PERUBAHAN: Default ke UMUM
        benefits: benefits || "",
        warnings: warnings || null,
        comedogenicRating: Number(comedogenicRating) || 0,
        safeForPregnancy: Boolean(safeForPregnancy),
        safeForSensitive: Boolean(safeForSensitive),
        goodForSkinTypes: goodForSkinTypes || null,
        targetFocus: targetFocus || null,
      },
    });

    return NextResponse.json(newIngredient, { status: 201 });
  } catch (error: any) {
    // Menampilkan error spesifik di terminal VS Code
    console.error("POST Ingredient Error Detail:", error);

    // Mencegah duplikasi nama bahan
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "Bahan dengan nama ini sudah ada di kamus." }, { status: 400 });
    }

    return NextResponse.json({ message: `Gagal menyimpan: ${error.message}` }, { status: 500 });
  }
}