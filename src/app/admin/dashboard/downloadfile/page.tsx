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

  // Toggle untuk sertakan prompt Deep Research
  const [includePrompt, setIncludePrompt] = useState(false);
  const [includeResponseFormat, setIncludeResponseFormat] = useState(false);

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

  // Hitung jumlah kolom aktif untuk tampilan mode prompt
  const activeColumnCount = Object.values(columns).filter(Boolean).length;
  const activeColumnNames = Object.entries(columns)
    .filter(([, v]) => v)
    .map(([k]) => {
      const labelMap: Record<string, string> = {
        aliases: "Sinonim", type: "Sifat Kimia", functionalCategory: "Fungsi Khusus",
        isKeyActive: "Bahan Aktif", benefits: "Manfaat", aiContext: "Analisis AI",
        comedogenicRating: "Komedogenik", safeForPregnancy: "Aman Bumil",
        safeForSensitive: "Aman Sensitif", targetFocus: "Fokus Perawatan",
        blacklistedSkinTypes: "Blacklist",
      };
      return labelMap[k] || k;
    });

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
          columns,
          includePrompt,
          includeResponseFormat: includePrompt && includeResponseFormat,
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
      const promptText = includePrompt ? '-prompt' : '';
      const filename = `bahan-${statusText}${typeText}${promptText}-${date}.txt`;

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage({ type: "success", text: `File berhasil diunduh! ${includePrompt ? '(Prompt Deep Research disertakan)' : ''}` });

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
            <div className={`p-4 mb-6 rounded-xl text-sm font-bold border ${message.type === "success" ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800" : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800"}`}>
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

            {/* BAGIAN 3: SERTAKAN PROMPT DEEP RESEARCH */}
            <div className={`p-5 rounded-2xl border transition-all duration-300 ${includePrompt ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700' : 'bg-slate-50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700'}`}>
              <h2 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase mb-4">3. Validasi Manual via Gemini</h2>
              
              <label className="flex items-start gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={includePrompt} 
                  onChange={(e) => setIncludePrompt(e.target.checked)} 
                  className="w-6 h-6 accent-emerald-600 mt-0.5 shrink-0" 
                />
                <div className="space-y-1">
                  <span className={`text-sm font-bold transition-colors ${includePrompt ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    🧠 Sertakan Prompt Deep Research
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Menyertakan instruksi AI lengkap (aturan parameter, sumber referensi, kill switch) di awal file. 
                    File bisa langsung di-copy-paste ke <strong>Google Gemini</strong> untuk validasi manual jika Deep Research internal gagal/error.
                  </p>
                </div>
              </label>

              {includePrompt && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: "auto" }} 
                  transition={{ duration: 0.2 }}
                  className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-emerald-200 dark:border-emerald-800 space-y-3"
                >
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <span>✅</span>
                    <span>Prompt akan otomatis disesuaikan dengan kolom yang dipilih di Bagian 2</span>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="font-bold text-slate-700 dark:text-slate-300">Mode prompt saat ini:</p>
                    {activeColumnCount >= 10 ? (
                      <p className="text-emerald-600 dark:text-emerald-400 font-bold">📋 LENGKAP — Semua {activeColumnCount} parameter akan disertakan</p>
                    ) : (
                      <div>
                        <p className="text-amber-600 dark:text-amber-400 font-bold">🎯 KHUSUS — Hanya {activeColumnCount} parameter:</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {activeColumnNames.map((name, i) => (
                            <span key={i} className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Toggle Format Jawaban */}
                  <div className="pt-3 border-t border-emerald-100 dark:border-emerald-800/50">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={includeResponseFormat} 
                        onChange={(e) => setIncludeResponseFormat(e.target.checked)} 
                        className="w-5 h-5 accent-amber-600 mt-0.5 shrink-0" 
                      />
                      <div className="space-y-1">
                        <span className={`text-sm font-bold transition-colors ${includeResponseFormat ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>
                          📝 Sertakan Format Jawaban Koreksi
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                          Menambahkan template format jawaban agar AI <strong>hanya melaporkan data yang SALAH</strong> (skip yang benar), 
                          disertai nilai koreksi, alasan klinis, sumber referensi + link.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="pt-2 border-t border-emerald-100 dark:border-emerald-800/50">
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-relaxed">
                      💡 <strong>Tips:</strong> Untuk validasi yang lebih fokus, uncheck kolom yang tidak perlu di Bagian 2. 
                      Misal hanya centang "Komedogenik" → prompt yang dihasilkan hanya berisi aturan komedogenik + data komedogenik bahan.
                    </p>
                  </div>
                </motion.div>
              )}
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
            <p className="text-xs text-center text-slate-400 mt-3">
              {includePrompt 
                ? "File output berisi Prompt Deep Research + Data Bahan — siap copy-paste ke Gemini." 
                : "File output disesuaikan dengan skema prompt Deep Research AI."
              }
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
