import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(banners, { status: 200 });
  } catch (error: any) {
    console.error("GET Banners Error:", error.message);
    return NextResponse.json({ message: "Gagal mengambil data banner" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl, altText, isActive } = body;

    if (!imageUrl) {
      return NextResponse.json({ message: "URL Gambar wajib diisi" }, { status: 400 });
    }

    const newBanner = await prisma.banner.create({
      data: {
        imageUrl,
        altText: altText || null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json(newBanner, { status: 201 });
  } catch (error: any) {
    console.error("POST Banner Error:", error);
    return NextResponse.json({ message: `Gagal menambahkan banner: ${error.message}` }, { status: 500 });
  }
}
