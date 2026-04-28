// src/app/api/analyze/reviews/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, rating, komentar, userEmail } = body;

    // Pastikan semua data terkirim
    if (!productId || !rating || !komentar || !userEmail) {
      return NextResponse.json({ message: "Data ulasan tidak lengkap." }, { status: 400 });
    }

    // Cari User ID berdasarkan Email dari session
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ message: "Akun pengguna tidak ditemukan." }, { status: 404 });
    }

    // Simpan permanen ke tabel ProductReview
    const newReview = await prisma.productReview.create({
      data: {
        productId,
        userId: user.id,
        rating: Number(rating),
        komentar,
      },
      // Kembalikan juga nama usernya agar bisa langsung tampil di layar
      include: {
        user: { select: { name: true } }
      }
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal menyimpan ulasan: " + error.message }, { status: 500 });
  }
}