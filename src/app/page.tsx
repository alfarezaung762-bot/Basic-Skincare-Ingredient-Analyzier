// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LoginButton, LogoutButton } from "@/components/AuthButtons";
import Link from "next/link";
import { prisma } from "@/lib/prisma"; // 👈 Tambahan: Memanggil Prisma
import { redirect } from "next/navigation";

export default async function HomePage() {
  // Mengecek sesi login di sisi server (Server-Side Rendering)
  const session = await getServerSession(authOptions);

  // Jika BELUM login: Tampilkan Landing Page Minimalis
  if (!session) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 font-sans text-center">
        <div className="max-w-xl w-full space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
              SkinTech <span className="text-gray-400">Analyzer</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Pahami setiap tetes skincare Anda. Analisis kecocokan bahan dengan teknologi AI berdasarkan profil unik kulit Anda.
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <LoginButton />
          </div>
        </div>
      </main>
    );
  }

  // 1. Ambil ID User dari Sesi
  const userId = (session.user as any).id;

  // 2. Cari data User terbaru langsung dari Database beserta data profilnya
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true } // 👈 PENTING: Meminta Prisma sekalian mengambil data profil
  });

  // 3. LOGIKA SATPAM: Jika User belum punya profil, otomatis tendang ke halaman isi profil
  if (!dbUser?.profile) {
    redirect("/profile");
  }

  // 4. Prioritaskan nama dari Database, jika kosong baru pakai dari Sesi
  const displayName = dbUser?.name || session.user?.name;

  // Jika SUDAH login dan SUDAH punya profil: Tampilkan Dashboard bergaya Bento Grid
  return (
    <main className="min-h-screen bg-[#F4F4F5] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Top Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-sm gap-4">
          <div>
            {/* 👇 Menampilkan nama yang sudah pasti ter-update */}
            <h2 className="text-2xl font-bold text-gray-900">Halo, {displayName} 👋</h2>
            <p className="text-gray-500 text-sm mt-1">Siap merawat kulitmu hari ini?</p>
          </div>
          <div className="flex gap-3">
            <Link href="/profile" className="px-6 py-2 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-all text-sm flex items-center">
              Profil Kulit
            </Link>
            <LogoutButton />
          </div>
        </header>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Menu 1: Single Ingredient (Bigger Card) */}
          <Link href="/analyze/single" className="group col-span-1 md:col-span-2 bg-white rounded-3xl p-8 hover:shadow-md transition-all border border-transparent hover:border-gray-200 flex flex-col justify-between min-h-[240px]">
            <div>
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">🔬</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Single Ingredient</h3>
              <p className="text-gray-500 line-clamp-2">Pindai atau ketik komposisi produk untuk melihat Match Score & Safety Score khusus untuk profil kulitmu.</p>
            </div>
            <div className="text-blue-600 font-medium group-hover:translate-x-2 transition-transform w-fit mt-4">
              Mulai Analisis →
            </div>
          </Link>

          {/* Menu 2: Combine */}
          <Link href="/analyze/combine" className="group bg-white rounded-3xl p-8 hover:shadow-md transition-all border border-transparent hover:border-gray-200 flex flex-col justify-between min-h-[240px]">
            <div>
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">🧪</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Combine</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Cek kecocokan antara Face Wash lama dengan Moisturizer baru.</p>
            </div>
          </Link>

          {/* Menu 3: Compare */}
          <Link href="/analyze/compare" className="group bg-white rounded-3xl p-8 hover:shadow-md transition-all border border-transparent hover:border-gray-200 flex flex-col justify-between min-h-[240px]">
            <div>
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-2xl">⚖️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Compare</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Bandingkan 2 produk untuk mencari alternatif yang lebih aman.</p>
            </div>
          </Link>

          {/* Edukasi Widget & Riwayat */}
          <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-zinc-900 text-white rounded-3xl p-8 flex flex-col justify-center">
                <h3 className="text-xl font-bold mb-3">Edukasi Basic Skincare 💡</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">
                  Pastikan rutinitasmu mencakup Cleanser, Moisturizer, dan Sunscreen sebelum mencoba menambahkan bahan aktif keras.
                </p>
             </div>
             <Link href="/history" className="bg-white rounded-3xl p-8 hover:shadow-md transition-all border border-transparent hover:border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Riwayat Analisis 🕒</h3>
                  <p className="text-gray-500 text-sm mt-1">Lihat kembali produk yang sudah kamu pindai.</p>
                </div>
                <div className="w-12 h-12 shrink-0 bg-gray-50 rounded-full flex items-center justify-center group-hover:bg-gray-100 transition-colors">
                  <span className="text-xl">→</span>
                </div>
             </Link>
          </div>

        </div>
      </div>
    </main>
  );
}