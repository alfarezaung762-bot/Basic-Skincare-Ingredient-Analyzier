import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mengambil 1 bahan spesifik untuk diedit (GET)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params; // Buka bungkus promise
    const ingredient = await prisma.ingredientDictionary.findUnique({
      where: { id: resolvedParams.id },
    });
    
    if (!ingredient) return NextResponse.json({ message: "Bahan tidak ditemukan" }, { status: 404 });
    return NextResponse.json(ingredient, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Gagal mengambil bahan" }, { status: 500 });
  }
}

// Mengupdate bahan (PUT)
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params; // Buka bungkus promise
    const body = await req.json();
    
    const updatedIngredient = await prisma.ingredientDictionary.update({
      where: { id: resolvedParams.id },
      data: {
        name: body.name.toLowerCase().trim(),
        aliases: body.aliases ? body.aliases.toLowerCase().trim() : null,
        type: body.type,
        functionalCategory: body.functionalCategory, // PERUBAHAN: Memasukkan update kategori fungsional
        benefits: body.benefits,
        warnings: body.warnings,
        comedogenicRating: Number(body.comedogenicRating),
        safeForPregnancy: body.safeForPregnancy,
        safeForSensitive: body.safeForSensitive,
        goodForSkinTypes: body.goodForSkinTypes,
        badForSkinTypes: body.badForSkinTypes,
        targetFocus: body.targetFocus,
      },
    });
    return NextResponse.json(updatedIngredient, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Gagal mengupdate bahan" }, { status: 500 });
  }
}

// Menghapus bahan (DELETE)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params; // Buka bungkus promise
    await prisma.ingredientDictionary.delete({
      where: { id: resolvedParams.id },
    });
    return NextResponse.json({ message: "Berhasil dihapus" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Gagal menghapus bahan" }, { status: 500 });
  }
}