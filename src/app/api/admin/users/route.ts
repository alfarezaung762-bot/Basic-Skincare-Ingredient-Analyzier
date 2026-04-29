// src/app/api/admin/users/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// MENGAMBIL DAFTAR SEMUA ADMIN
export async function GET() {
  try {
    const users = await prisma.adminAccount.findMany({
      select: { 
        id: true, 
        username: true, 
        role: true, 
        permissions: true, 
        createdAt: true 
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal mengambil data akun" }, { status: 500 });
  }
}

// MEMBUAT AKUN ADMIN BARU
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, role, permissions } = body;

    if (!username || !password || !role) {
      return NextResponse.json({ message: "Data formulir tidak lengkap!" }, { status: 400 });
    }

    // Cek apakah username sudah ada
    const existingUser = await prisma.adminAccount.findUnique({
      where: { username }
    });

    if (existingUser) {
      return NextResponse.json({ message: "ID/Username ini sudah terpakai!" }, { status: 400 });
    }

    await prisma.adminAccount.create({
      data: {
        username,
        password, // (Catatan: Untuk produksi skala besar, sandi ini idealnya dienkripsi)
        role,
        permissions: role === "VIEWER" ? [] : permissions // VIEWER tidak butuh hak akses modifikasi
      }
    });

    return NextResponse.json({ message: "Akun berhasil dibuat!" }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

// MENGHAPUS AKUN ADMIN
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID Akun diperlukan" }, { status: 400 });
    }

    // Mencegah akun terhapus jika itu adalah satu-satunya Superadmin
    const targetUser = await prisma.adminAccount.findUnique({ where: { id } });
    if (targetUser?.role === "SUPERADMIN") {
      const superadminCount = await prisma.adminAccount.count({ where: { role: "SUPERADMIN" } });
      if (superadminCount <= 1) {
        return NextResponse.json({ message: "Tidak dapat menghapus satu-satunya SUPERADMIN!" }, { status: 403 });
      }
    }

    await prisma.adminAccount.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Akun berhasil dicabut dan dihapus" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal menghapus akun" }, { status: 500 });
  }
}