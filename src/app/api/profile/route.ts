// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getSubscriptionConfig } from "@/lib/config";

// ==========================================
// GET: MENGAMBIL DATA PROFIL PENGGUNA
// ==========================================
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Akses ditolak. Silakan login." }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Cari user di database dengan relasi profil
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      return NextResponse.json({ message: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    // Ambil konfigurasi langganan dari DB
    const config = await getSubscriptionConfig();
    const initialPoints = config.initialPoints;
    const dailyRefresh = config.dailyRefresh;

    // --- LAZY DAILY REFRESH LOGIC ---
    const now = new Date();
    const lastRefresh = user.lastPointRefresh || now;

    // Hitung perbedaan hari kalender (berdasarkan pergantian hari pada pukul 24:00/00:00)
    const d1 = new Date(lastRefresh);
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(now);
    d2.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((d2.getTime() - d1.getTime()) / (24 * 60 * 60 * 1000));

    let updatedPoints = user.points ?? initialPoints;
    let shouldUpdateUser = false;
    let updateData: any = {};

    if (diffDays > 0) {
      updatedPoints = (user.points ?? initialPoints) + (diffDays * dailyRefresh);
      updateData.points = updatedPoints;
      updateData.lastPointRefresh = now;
      shouldUpdateUser = true;
    }

    // Pengaman jika points bernilai null di database (migrasi user lama)
    if (user.points === null || user.points === undefined) {
      updateData.points = initialPoints;
      shouldUpdateUser = true;
    }
    if (!user.lastPointRefresh) {
      updateData.lastPointRefresh = now;
      shouldUpdateUser = true;
    }

    if (shouldUpdateUser) {
      user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: { profile: true },
      });
    }

    // Kirimkan format objek gabungan agar tetap kompatibel dengan pembacaan langsung `.skinType`
    // maupun pembacaan properti `.profile`
    return NextResponse.json({
      profile: user.profile,
      points: user.points ?? initialPoints,
    }, { status: 200 });

  } catch (error) {
    console.error("API GET Profile Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}

// ==========================================
// POST: MENYIMPAN / MEMPERBARUI PROFIL
// ==========================================
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Akses ditolak. Silakan login." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { name, skinType, age, severity, primaryFocus, allergies, isPregnantOrNursing } = body;

    // 1. Perbarui Nama di tabel User (Bawaan Google)
    if (name) {
      await prisma.user.update({
        where: { id: userId },
        data: { name: name },
      });
    }

    // 2. Simpan/Perbarui data Profil Kulit
    const profile = await prisma.profile.upsert({
      where: { userId: userId },
      update: {
        skinType,
        age: Number(age),
        severity,
        primaryFocus,
        allergies,
        isPregnantOrNursing,
      },
      create: {
        userId,
        skinType,
        age: Number(age),
        severity,
        primaryFocus,
        allergies,
        isPregnantOrNursing,
      }
    });

    return NextResponse.json({ message: "Profil berhasil disimpan!" }, { status: 200 });

  } catch (error) {
    console.error("API Profile Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server." }, { status: 500 });
  }
}