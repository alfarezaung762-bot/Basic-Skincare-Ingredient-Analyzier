// src/app/api/ingredients/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ========================================================
// 1. GET: Mengambil 1 bahan spesifik untuk halaman Edit
// ========================================================
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

// ========================================================
// 2. PUT: Mengupdate seluruh data bahan (Dari halaman Edit)
// ========================================================
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params; // Buka bungkus promise
    const body = await req.json();
    
    // Proses update ke database dengan Arsitektur V3
    const updatedIngredient = await prisma.ingredientDictionary.update({
      where: { id: resolvedParams.id },
      data: {
        name: body.name.toLowerCase().trim(),
        aliases: body.aliases ? body.aliases.toLowerCase().trim() : null,
        type: body.type,
        functionalCategory: body.functionalCategory || "UMUM",
        benefits: body.benefits,
        comedogenicRating: Number(body.comedogenicRating) || 0,
        safeForPregnancy: Boolean(body.safeForPregnancy),
        safeForSensitive: Boolean(body.safeForSensitive),
        
        // --- DATA ARSITEKTUR V3 ---
        isKeyActive: Boolean(body.isKeyActive),
        strengthLevel: Number(body.strengthLevel) || 1,
        blacklistedSkinTypes: body.blacklistedSkinTypes || null,
        blacklistReason: body.blacklistReason || null,
        targetFocus: body.targetFocus || null,
        aiContext: body.aiContext || null, // <-- TAMBAHAN BARU
        isVerified: Boolean(body.isVerified), // <-- TAMBAHAN BARU (Bisa diubah dari halaman Edit)
      },
    });

    return NextResponse.json(updatedIngredient, { status: 200 });
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ message: "Gagal mengupdate bahan" }, { status: 500 });
  }
}

// ========================================================
// 3. PATCH: Mengupdate status verifikasi (Ceklis di Tabel)
// ========================================================
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await req.json();
    const { isVerified } = body;

    const updatedIngredient = await prisma.ingredientDictionary.update({
      where: { id: resolvedParams.id },
      data: { isVerified: Boolean(isVerified) },
    });

    return NextResponse.json(updatedIngredient, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Gagal memverifikasi bahan" }, { status: 500 });
  }
}

// ========================================================
// 4. DELETE: Menghapus bahan
// ========================================================
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