// src/app/api/analyze/reviews/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, rating, komentar, userEmail } = body;

    if (!productId || !rating || !komentar || !userEmail) {
      return NextResponse.json({ message: "Data ulasan tidak lengkap." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    if (!user) {
      return NextResponse.json({ message: "Akun pengguna tidak ditemukan." }, { status: 404 });
    }

    const existingReview = await prisma.productReview.findFirst({
      where: { productId, userId: user.id }
    });

    if (existingReview) {
      if (existingReview.isDeleted && existingReview.editCount < 2) {
        // Rewrite allowed!
        const rewrittenReview = await prisma.productReview.update({
          where: { id: existingReview.id },
          data: {
            rating: Number(rating),
            komentar,
            isDeleted: false,
            editCount: 2 // Has consumed the rewrite chance
          },
          include: {
            user: { select: { name: true } }
          }
        });

        return NextResponse.json({ 
          ...rewrittenReview, 
          isRewritten: true,
          message: "Ulasan berhasil ditulis ulang. Anda telah menggunakan kesempatan penulisan ulang Anda."
        }, { status: 200 });
      }

      // Blocked if not deleted, or if already rewritten
      return NextResponse.json({ 
        message: "Anda tidak dapat menulis ulasan baru. Hapus ulasan sebelumnya terlebih dahulu (jika masih memiliki kesempatan).",
        existingReviewId: existingReview.id,
        isMaxEdits: true
      }, { status: 409 });
    }

    // New review
    const newReview = await prisma.productReview.create({
      data: {
        productId,
        userId: user.id,
        rating: Number(rating),
        komentar,
      },
      include: {
        user: { select: { name: true } }
      }
    });

    return NextResponse.json(newReview, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal menyimpan ulasan: " + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const reviewId = searchParams.get('id');
    const userEmail = searchParams.get('email');

    if (!reviewId || !userEmail) {
      return NextResponse.json({ message: "Parameter tidak lengkap." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) return NextResponse.json({ message: "Akses ditolak." }, { status: 403 });

    const review = await prisma.productReview.findUnique({ where: { id: reviewId } });
    if (!review || review.userId !== user.id) {
      return NextResponse.json({ message: "Ulasan tidak ditemukan atau Anda tidak berhak." }, { status: 404 });
    }

    if (review.editCount >= 2) {
      return NextResponse.json({ message: "Anda sudah mencapai batas maksimum hapus dan tulis ulang." }, { status: 409 });
    }

    // Soft delete
    await prisma.productReview.update({
      where: { id: reviewId },
      data: {
        isDeleted: true,
        editCount: 1 // Marks that it was deleted once
      }
    });

    return NextResponse.json({ message: "Ulasan berhasil dihapus. Anda dapat menulis ulang 1 kali." }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal menghapus ulasan." }, { status: 500 });
  }
}