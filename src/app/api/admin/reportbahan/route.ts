// src/app/api/admin/reportbahan/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic"; 

// ========================================================
// 1. POST: Menerima laporan dari komponen Analyzer
// ========================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // CEK JALUR 1: Laporan Ketidaksesuaian dari Pengguna (Manual)
    if (body.type === "mismatch") {
      const { ingredientName, reason } = body;
      
      if (!ingredientName || !reason) {
        return NextResponse.json({ message: "Nama bahan dan alasan keluhan wajib diisi" }, { status: 400 });
      }

      const newReport = await prisma.ingredientReport.create({
        data: {
          ingredientName: ingredientName.toLowerCase().trim(),
          reason: reason.trim(),
        }
      });

      return NextResponse.json({ 
        message: "Laporan ketidaksesuaian berhasil dikirim", 
        data: newReport 
      }, { status: 200 });
    }
    
    // CEK JALUR 2: Laporan Bahan Asing dari Sistem (Otomatis)
    else {
      const { name } = body;

      if (!name || name.trim() === "") {
        return NextResponse.json({ message: "Nama bahan tidak valid" }, { status: 400 });
      }

      const cleanName = name.toLowerCase().trim();

      const reportedIngredient = await prisma.unknownIngredient.upsert({
        where: { name: cleanName },
        update: { 
          reportCount: { increment: 1 },
          isReviewed: false 
        },
        create: { 
          name: cleanName, 
          reportCount: 1 
        },
      });

      return NextResponse.json({ 
        message: "Bahan asing otomatis dilaporkan", 
        data: reportedIngredient 
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error("POST Report Error:", error.message);
    return NextResponse.json({ message: "Gagal menyimpan laporan ke sistem" }, { status: 500 });
  }
}

// ========================================================
// 2. GET: Mengambil KEDUA daftar laporan untuk Dasbor Admin
// ========================================================
export async function GET() {
  try {
    // Tarik data bahan asing (Sistem)
    const unknownReports = await prisma.unknownIngredient.findMany({
      where: { isReviewed: false },
      orderBy: { reportCount: 'desc' }, 
    });

    // Tarik data keluhan pengguna (Manual)
    const mismatchReports = await prisma.ingredientReport.findMany({
      where: { isReviewed: false },
      orderBy: { createdAt: 'desc' }, // Yang terbaru di atas
    });
    
    // Gabungkan keduanya dalam satu respon JSON
    return NextResponse.json({
      unknownReports,
      mismatchReports
    }, { status: 200 });

  } catch (error: any) {
    console.error("GET Reports Error:", error.message);
    return NextResponse.json({ message: "Gagal mengambil data laporan bahan" }, { status: 500 });
  }
}

// ========================================================
// 3. DELETE: Menghapus laporan berdasarkan jenisnya
// ========================================================
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type"); // Ambil parameter tipe (mismatch/unknown)

    if (!id) return NextResponse.json({ message: "ID laporan tidak ditemukan" }, { status: 400 });

    // Hapus dari tabel keluhan pengguna
    if (type === "mismatch") {
      await prisma.ingredientReport.delete({
        where: { id },
      });
    } 
    // Hapus dari tabel bahan asing sistem
    else {
      await prisma.unknownIngredient.delete({
        where: { id },
      });
    }

    return NextResponse.json({ message: "Laporan berhasil dihapus" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE Report Error:", error.message);
    return NextResponse.json({ message: "Gagal menghapus laporan" }, { status: 500 });
  }
}