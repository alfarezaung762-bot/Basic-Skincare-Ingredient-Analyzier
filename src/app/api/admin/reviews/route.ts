// src/app/api/admin/reviews/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Memastikan data selalu segar (tidak di-cache)
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const reviews = await prisma.productReview.findMany({
      orderBy: { createdAt: "desc" }, // Menampilkan ulasan terbaru di paling atas
      include: {
        user: { select: { name: true, email: true } },
        product: { select: { namaProduk: true, gambarUrl: true } } // <-- Mengambil gambarUrl di sini
      }
    });
    return NextResponse.json(reviews);
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal mengambil daftar ulasan" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID Ulasan diperlukan" }, { status: 400 });
    }

    await prisma.productReview.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Ulasan berhasil dihapus secara permanen" });
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal menghapus ulasan" }, { status: 500 });
  }
}