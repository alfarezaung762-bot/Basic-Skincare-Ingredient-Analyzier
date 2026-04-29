// src/app/api/admin/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json({ message: "ID dan Password wajib diisi" }, { status: 400 });
    }

    // LOGIKA AUTO-SEED: Jika database kosong, buatkan akun SUPERADMIN pertama secara otomatis
    const totalAdmins = await prisma.adminAccount.count();
    if (totalAdmins === 0 && username === "admin" && password === "admin") {
      const firstAdmin = await prisma.adminAccount.create({
        data: {
          username: "admin",
          password: "admin", // Catatan: Untuk aplikasi produksi nyata, sandi ini harus dienkripsi (hashed)
          role: "SUPERADMIN",
          permissions: ["MANAGE_KAMUS", "MANAGE_TINJAUAN", "MANAGE_KATALOG", "MANAGE_ULASAN"]
        }
      });
      
      return NextResponse.json({
        message: "Login berhasil (Akun Superadmin pertama otomatis dibuat)",
        user: { 
          username: firstAdmin.username, 
          role: firstAdmin.role, 
          permissions: firstAdmin.permissions 
        }
      }, { status: 200 });
    }

    // Pengecekan akun standar ke pangkalan data
    const admin = await prisma.adminAccount.findUnique({
      where: { username }
    });

    // Validasi keberadaan akun dan kecocokan kata sandi
    if (!admin || admin.password !== password) {
      return NextResponse.json({ message: "ID atau Password salah!" }, { status: 401 });
    }

    // Jika berhasil masuk, kirimkan "Kartu Identitas" ke antarmuka (tanpa menyertakan kata sandi)
    return NextResponse.json({
      message: "Login berhasil",
      user: {
        username: admin.username,
        role: admin.role,
        permissions: admin.permissions
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Login Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server peladen" }, { status: 500 });
  }
}