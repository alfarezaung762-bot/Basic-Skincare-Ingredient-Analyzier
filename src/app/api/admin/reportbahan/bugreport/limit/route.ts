// src/app/api/admin/reportbahan/bugreport/limit/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ count: 0, max: 2, isGuest: true }, { status: 200 });
    }

    const userId = (session.user as any).id;

    // Hitung jumlah laporan hari ini
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todayCount = await prisma.bugReport.count({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    return NextResponse.json({ count: todayCount, max: 2, isGuest: false }, { status: 200 });
  } catch (error: any) {
    console.error("GET BugReport Limit Error:", error);
    return NextResponse.json({ message: "Gagal memuat status kuota laporan." }, { status: 500 });
  }
}
