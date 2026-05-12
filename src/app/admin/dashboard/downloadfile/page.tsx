// src/app/admin/dashboard/downloadfile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DownloadFilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [filter, setFilter] = useState({
    statusFilter: "VERIFIED", // ALL, VERIFIED, UNVERIFIED
    typeFilter: "ALL"         // ALL, BASIC, BUFFER, HARSH, TOXIC
  });

  const [columns, setColumns] = useState({
    aliases: true,
    type: true,
    functionalCategory: true,
    isKeyActive: true,
    benefits: true,
    aiContext: true,
    comedogenicRating: true,
    safeForPregnancy: true,
    safeForSensitive: true,
    targetFocus: true,
    blacklistedSkinTypes: true,
  });

  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    
    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    try {
      const profile = JSON.parse(profileString);
      const isSuperAdmin = profile.role === "SUPERADMIN";
      const hasPermission = profile.permissions && profile.permissions.includes("MANAGE_KAMUS");

      if (!isSuperAdmin && !hasPermission) {
        alert("Akses Ditolak: Anda tidak memiliki izin untuk mengunduh data.");
        router.push("/admin/login");
      }
    } catch (error) {
      sessionStorage.clear();
      router.push("/admin/login");
    }
  }, [router]);

  const handleColumnChange = (key: keyof typeof columns) => {
    setColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDownload = async () => {
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await fetch("/api/admin/downloadfile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statusFilter: filter.statusFilter,
          typeFilter: filter.typeFilter,
          columns
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal mengunduh file.");
      }

      const blob = await response.blob();
      
      // Generate filename based on date and filters
      const date = new Date().toISOString().split('T')[0];
      const statusText = filter.statusFilter === 'ALL' ? 'semua' : filter.statusFilter === 'VERIFIED' ? 'ditinjau' : 'tertunda';
      const typeText = filter.typeFilter === 'ALL' ? '' : `-${filter.typeFilter.toLowerCase()}`;
      const filename = `bahan-${statusText}${typeText}-${date}.txt`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: "success", text: "File berhasil diunduh!" });

      // Optional: Redirect back after 2 seconds
      setTimeout(() => {
         router.push("/admin/dashboard");
      }, 2000);

    } catch (error: any) {
      setMessage({ type: "error", text: error.message || "Terjadi kesalahan." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/dashboard" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-black dark:hover:text-white transition-colors mb-6 inline-block">
          ← Kembali ke Dasbor Kamus
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Ekspor Data Bahan 📥</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">Download data bahan dalam format teks untuk Deep Research AI atau keperluan pencadangan.</p>

          {message.text && (
            <div className={`p-4 mb-6 rounded-xl text-sm font-bold border ${message.type === "success" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
              {message.text}
            </div>
          )}

          <div className="space-y-8">
            
            {/* BAGIAN 1: FILTER BARIS */}
            <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase mb-4">1. Filter Data yang Akan Diunduh</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Status Tinjauan</label>
                  <select 
                    value={filter.statusFilter} 
                    onChange={(e) => setFilter({...filter, statusFilter: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 outline-none text-sm font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">🔵 Semua Bahan</option>
                    <option value="VERIFIED">✅ Hanya yang Sudah Ditinjau</option>
                    <option value="UNVERIFIED">⏳ Hanya yang Belum Ditinjau</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Sifat Kimia</label>
                  <select 
                    value={filter.typeFilter} 
                    onChange={(e) => setFilter({...filter, typeFilter: e.target.value})} 
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 outline-none text-sm font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">🔵 Semua Sifat</option>
                    <option value="BASIC">BASIC (Standar)</option>
                    <option value="BUFFER">BUFFER (Penenang)</option>
                    <option value="HARSH">HARSH (Keras/Aktif)</option>
                    <option value="TOXIC">TOXIC (Berbahaya)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* BAGIAN 2: SPESIFIKASI KOLOM */}
            <div className="bg-slate-50 dark:bg-slate-800/30 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase mb-4">2. Pilih Kolom Data</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Nama INCI Bahan selalu disertakan secara default.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.aliases} onChange={() => handleColumnChange('aliases')} className="w-5 h-5 accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Sinonim / Alias</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.type} onChange={() => handleColumnChange('type')} className="w-5 h-5 accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Sifat Kimia & Level Kekuatan</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.functionalCategory} onChange={() => handleColumnChange('functionalCategory')} className="w-5 h-5 accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Fungsi Khusus</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.isKeyActive} onChange={() => handleColumnChange('isKeyActive')} className="w-5 h-5 accent-yellow-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Indikator Bahan Aktif Utama ⭐</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.benefits} onChange={() => handleColumnChange('benefits')} className="w-5 h-5 accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Manfaat Singkat</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.aiContext} onChange={() => handleColumnChange('aiContext')} className="w-5 h-5 accent-purple-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Analisis Mendalam AI 🤖</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.comedogenicRating} onChange={() => handleColumnChange('comedogenicRating')} className="w-5 h-5 accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Tingkat Komedogenik (0-5)</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.safeForPregnancy} onChange={() => handleColumnChange('safeForPregnancy')} className="w-5 h-5 accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Aman Bumil 🤰</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.safeForSensitive} onChange={() => handleColumnChange('safeForSensitive')} className="w-5 h-5 accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Aman Sensitif 🌡️</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={columns.targetFocus} onChange={() => handleColumnChange('targetFocus')} className="w-5 h-5 accent-indigo-600" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Fokus Perawatan</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer md:col-span-2">
                  <input type="checkbox" checked={columns.blacklistedSkinTypes} onChange={() => handleColumnChange('blacklistedSkinTypes')} className="w-5 h-5 accent-red-600" />
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">Dilarang Keras Untuk (Blacklist Mutlak) 🚫</span>
                </label>
              </div>
            </div>

            <button 
              onClick={handleDownload}
              disabled={isLoading} 
              className="w-full py-4 mt-8 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-md text-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><span>📥</span> Generate & Download Teks</>
              )}
            </button>
            <p className="text-xs text-center text-slate-400 mt-3">File output disesuaikan dengan skema prompt Deep Research AI.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
