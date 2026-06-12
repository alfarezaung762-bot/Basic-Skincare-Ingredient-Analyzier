// src/app/api/subscription/purchase/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Akses ditolak. Silakan login." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { packageName, paymentType } = body;

    if (!packageName || !paymentType) {
      return NextResponse.json({ message: "Paket dan metode pembayaran wajib dipilih." }, { status: 400 });
    }

    // Tentukan jumlah poin dan harga berdasarkan nama paket
    let amount = 0;
    let price = 0;

    if (packageName === "PRO") {
      amount = 100;
      price = 10000;
    } else if (packageName === "PRO_PLUS") {
      amount = 500;
      price = 30000;
    } else {
      return NextResponse.json({ message: "Paket langganan tidak valid." }, { status: 400 });
    }

    // Validasi metode pembayaran
    const validPaymentTypes = ["GOPAY", "DANA", "BANK_VA"];
    if (!validPaymentTypes.includes(paymentType)) {
      return NextResponse.json({ message: "Metode pembayaran tidak didukung." }, { status: 400 });
    }

    // Ambil data user saat ini
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ message: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    // Tambahkan poin ke saldo user
    const currentPoints = user.points ?? 10;
    const newPoints = currentPoints + amount;

    // Transaksi Database: Tambah poin & Simpan riwayat transaksi sebagai SUCCESS
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { points: newPoints }
      }),
      prisma.pointTransaction.create({
        data: {
          userId,
          amount,
          price,
          packageName,
          paymentType,
          status: "SUCCESS"
        }
      })
    ]);

    return NextResponse.json({
      message: `Pembelian ${packageName} berhasil! Saldo poin Anda sekarang ${newPoints}.`,
      points: newPoints
    }, { status: 200 });

  } catch (error) {
    console.error("API Purchase Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server saat memproses transaksi." }, { status: 500 });
  }
}
