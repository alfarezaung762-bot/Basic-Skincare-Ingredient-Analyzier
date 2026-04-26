// src/app/api/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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

    // Cari profil pengguna di database
    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ message: "Profil belum ditemukan." }, { status: 404 });
    }

    // Kirimkan data profil ke frontend
    return NextResponse.json(profile, { status: 200 });

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