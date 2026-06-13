import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Ambil daftar semua transaksi beserta data nama & email user
    const transactions = await prisma.pointTransaction.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json(transactions);
  } catch (error: any) {
    console.error("API GET Transactions Error:", error);
    return NextResponse.json({ message: "Gagal mengambil riwayat transaksi." }, { status: 500 });
  }
}
