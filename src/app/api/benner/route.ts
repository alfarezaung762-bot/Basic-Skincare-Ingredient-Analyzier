import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(banners, { status: 200 });
  } catch (error: any) {
    console.error("GET Public Banners Error:", error.message);
    return NextResponse.json({ message: "Gagal mengambil data banner" }, { status: 500 });
  }
}
