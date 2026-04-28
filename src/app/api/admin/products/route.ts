// src/app/api/admin/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mencegah Next.js melakukan cache agar tabel admin selalu menampilkan data terbaru
export const dynamic = "force-dynamic";

// ========================================================
// 1. POST: Menyimpan data produk baru ke Katalog
// ========================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      namaProduk,
      tipeProduk,
      gambarUrl,
      tautanAfiliasi,
      komposisiAsli,
      fokusProduk, // Akan berisi teks gabungan dari kotak centang
      isPinKreator,
      masalahKulitPin,
      catatanKreator, // Menggantikan rating dan teksUlasan
    } = body;

    // Validasi sederhana agar data yang masuk tidak kosong
    if (!namaProduk || !tipeProduk || !komposisiAsli) {
      return NextResponse.json(
        { message: "Data produk tidak lengkap (Nama, Tipe, dan Komposisi wajib diisi)" },
        { status: 400 }
      );
    }

    // Memasukkan data ke dalam tabel ProductCatalog
    const newProduct = await prisma.productCatalog.create({
      data: {
        namaProduk,
        tipeProduk, // Akan berisi "FACEWASH", "MOISTURIZER", atau "SUNSCREEN"
        gambarUrl: gambarUrl || "",
        tautanAfiliasi: tautanAfiliasi || "",
        komposisiAsli,
        fokusProduk: fokusProduk || "",
        isPinKreator: isPinKreator || false,
        masalahKulitPin: masalahKulitPin || null,
        catatanKreator: catatanKreator || null,
      },
    });

    return NextResponse.json(
      { message: "Produk berhasil ditambahkan ke katalog", data: newProduct },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("POST Product Error:", error.message);
    return NextResponse.json({ message: "Gagal menyimpan produk ke sistem" }, { status: 500 });
  }
}

// ========================================================
// 2. GET: Mengambil daftar seluruh produk untuk Dasbor Admin
// ========================================================
export async function GET() {
  try {
    // Mengambil seluruh produk, diurutkan dari yang paling baru ditambahkan
    const products = await prisma.productCatalog.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    return NextResponse.json(products, { status: 200 });
  } catch (error: any) {
    console.error("GET Products Error:", error.message);
    return NextResponse.json({ message: "Gagal mengambil data produk" }, { status: 500 });
  }
}

// ========================================================
// 3. DELETE: Menghapus produk dari Katalog
// ========================================================
export async function DELETE(req: Request) {
  try {
    // Mengambil ID produk dari parameter URL (misal: ?id=123)
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID produk tidak ditemukan" }, { status: 400 });
    }

    await prisma.productCatalog.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Produk berhasil dihapus dari katalog" }, { status: 200 });
  } catch (error: any) {
    console.error("DELETE Product Error:", error.message);
    return NextResponse.json({ message: "Gagal menghapus produk" }, { status: 500 });
  }
}

// ========================================================
// 4. PUT: Memperbarui data produk yang sudah ada di Katalog
// ========================================================
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      namaProduk,
      tipeProduk,
      gambarUrl,
      tautanAfiliasi,
      komposisiAsli,
      fokusProduk,
      isPinKreator,
      masalahKulitPin,
      catatanKreator,
    } = body;

    // Validasi sederhana agar sistem tahu produk mana yang harus diubah
    if (!id) {
      return NextResponse.json(
        { message: "Identitas (ID) produk tidak ditemukan." },
        { status: 400 }
      );
    }

    // Memperbarui data yang ada di dalam tabel ProductCatalog berdasarkan ID
    const updatedProduct = await prisma.productCatalog.update({
      where: { id: id },
      data: {
        namaProduk,
        tipeProduk,
        gambarUrl: gambarUrl || "",
        tautanAfiliasi: tautanAfiliasi || "",
        komposisiAsli,
        fokusProduk: fokusProduk || "",
        isPinKreator: isPinKreator || false,
        masalahKulitPin: masalahKulitPin || null,
        catatanKreator: catatanKreator || null,
      },
    });

    return NextResponse.json(
      { message: "Perubahan data produk berhasil disimpan.", data: updatedProduct },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PUT Product Error:", error.message);
    return NextResponse.json({ message: "Gagal memperbarui data produk di sistem." }, { status: 500 });
  }
}