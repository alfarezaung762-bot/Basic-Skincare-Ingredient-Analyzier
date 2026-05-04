import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const banner = await prisma.banner.findUnique({
      where: { id: resolvedParams.id },
    });
    
    if (!banner) return NextResponse.json({ message: "Banner tidak ditemukan" }, { status: 404 });
    return NextResponse.json(banner, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Gagal mengambil banner" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const body = await req.json();
    
    const updatedBanner = await prisma.banner.update({
      where: { id: resolvedParams.id },
      data: {
        imageUrl: body.imageUrl,
        altText: body.altText || null,
        isActive: Boolean(body.isActive),
      },
    });

    return NextResponse.json(updatedBanner, { status: 200 });
  } catch (error) {
    console.error("PUT Error:", error);
    return NextResponse.json({ message: "Gagal mengupdate banner" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    await prisma.banner.delete({
      where: { id: resolvedParams.id },
    });
    
    return NextResponse.json({ message: "Berhasil dihapus" }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ message: "Gagal menghapus banner" }, { status: 500 });
  }
}
