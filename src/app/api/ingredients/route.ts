// src/app/api/ingredients/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// BARIS AJAIB: Memaksa Next.js selalu mengambil data terbaru dari database (Anti-Cache)
export const dynamic = "force-dynamic"; 

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
    
    // Menangkap variabel baru dari form Admin
    const { 
      name, aliases, type, functionalCategory, benefits, warnings, comedogenicRating, 
      safeForPregnancy, safeForSensitive, 
      isKeyActive, strengthLevel, blacklistedSkinTypes, blacklistReason, targetFocus 
    } = body;

    // Cek jika nama kosong
    if (!name || name.trim() === "") {
      return NextResponse.json({ message: "Nama bahan tidak boleh kosong." }, { status: 400 });
    }

    // Proses pembuatan data di Prisma dengan kolom baru
    const newIngredient = await prisma.ingredientDictionary.create({
      data: {
        name: name.toLowerCase().trim(),
        aliases: aliases ? aliases.toLowerCase().trim() : null,
        type: type || "BASIC",
        functionalCategory: functionalCategory || "UMUM",
        benefits: benefits || "",
        warnings: warnings || null,
        comedogenicRating: Number(comedogenicRating) || 0,
        safeForPregnancy: Boolean(safeForPregnancy),
        safeForSensitive: Boolean(safeForSensitive),
        
        // --- DATA ARSITEKTUR V3 ---
        isKeyActive: Boolean(isKeyActive),
        strengthLevel: Number(strengthLevel) || 1,
        blacklistedSkinTypes: blacklistedSkinTypes || null,
        blacklistReason: blacklistReason || null,
        targetFocus: targetFocus || null,
      },
    });

    return NextResponse.json(newIngredient, { status: 201 });
  } catch (error: any) {
    console.error("POST Ingredient Error Detail:", error);

    // Mencegah duplikasi nama bahan
    if (error.code === 'P2002') {
      return NextResponse.json({ message: "Bahan dengan nama ini sudah ada di kamus." }, { status: 400 });
    }

    return NextResponse.json({ message: `Gagal menyimpan: ${error.message}` }, { status: 500 });
  }
}