import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const histories = await prisma.analysisHistory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(histories, { status: 200 });
  } catch (error: any) {
    console.error("GET History Error:", error);
    return NextResponse.json({ message: "Failed to fetch history" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const body = await req.json();
    const { historyId, isSaved } = body;

    // Pastikan user memiliki history ini
    const history = await prisma.analysisHistory.findUnique({
      where: { id: historyId }
    });

    if (!history || history.userId !== userId) {
      return NextResponse.json({ message: "History tidak ditemukan" }, { status: 404 });
    }

    // Maksimal 5 history disimpan
    if (isSaved) {
      const savedCount = await prisma.analysisHistory.count({
        where: { userId, isSaved: true }
      });
      if (savedCount >= 5) {
        return NextResponse.json({ message: "Maksimal 5 riwayat yang dapat disimpan." }, { status: 400 });
      }
    }

    const updated = await prisma.analysisHistory.update({
      where: { id: historyId },
      data: { isSaved }
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error("PUT History Error:", error);
    return NextResponse.json({ message: "Failed to update history" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    
    const userId = (session.user as any).id;
    const url = new URL(req.url);
    const historyId = url.searchParams.get("id");

    if (!historyId) {
      return NextResponse.json({ message: "ID history dibutuhkan" }, { status: 400 });
    }

    const history = await prisma.analysisHistory.findUnique({
      where: { id: historyId }
    });

    if (!history || history.userId !== userId) {
      return NextResponse.json({ message: "History tidak ditemukan" }, { status: 404 });
    }

    await prisma.analysisHistory.delete({
      where: { id: historyId }
    });

    return NextResponse.json({ message: "Berhasil dihapus" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE History Error:", error);
    return NextResponse.json({ message: "Failed to delete history" }, { status: 500 });
  }
}
