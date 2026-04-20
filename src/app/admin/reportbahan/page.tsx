// src/app/admin/reportbahan/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminReportBahan() {
  const router = useRouter();

  // Pengecekan Keamanan
  useEffect(() => {
    const isAuth = sessionStorage.getItem("isAdminAuth");
    if (!isAuth) {
      router.push("/admin/login");
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Admin */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>🎛️</span> Admin Control Panel
            </h1>
            <p className="text-sm text-slate-500 font-medium">Kelola database bahan untuk logika Analyzer AI.</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm rounded-xl transition-colors border border-red-200">
            Logout
          </button>
        </div>

        {/* Menu Navigasi */}
        <div className="flex gap-2">
          <Link href="/admin/dashboard" className="px-6 py-3 font-bold text-sm rounded-xl transition-all bg-white text-slate-600 border border-slate-200 hover:bg-slate-100">
            📚 Kamus Bahan Utama
          </Link>
          <Link href="/admin/reportbahan" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-black text-white shadow-md">
            <span>❓ Review Bahan Baru</span>
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">Baru</span>
          </Link>
        </div>

        {/* Konten Utama */}
        <div className="bg-white min-h-[500px] p-6 rounded-3xl shadow-sm border border-slate-200">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Laporan Bahan Tidak Dikenal</h2>
            <p className="text-sm text-slate-500 mb-6 font-medium">
              Bahan-bahan ini dimasukkan oleh pengguna tetapi belum ada di Kamus Utama.
            </p>
            <div className="text-center text-slate-500 py-20 font-medium">
              Belum ada data bahan yang perlu direview (Fitur ini akan segera dihubungkan ke Database).
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  );
}