"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import AdminHeader from "@/components/admin/AdminHeader";
import { AccessDeniedModal } from "@/components/admin/AccessDeniedModal";

export default function PusatAIPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    if (!profileString) { router.push("/admin/login"); return; }
    try {
      const profile = JSON.parse(profileString);
      setAdminName(profile.username || "Admin");
      setAdminRole(profile.role || "STAFF");
      const superAdminCheck = profile.role === "SUPERADMIN";
      const isAdmin = profile.role === "ADMIN";
      if (!superAdminCheck && !isAdmin) {
        setAccessDeniedMessage("Anda tidak memiliki wewenang untuk mengakses Pusat AI.");
        return;
      }
      setIsSuperAdmin(superAdminCheck);
      setIsAuthorized(true);
    } catch { sessionStorage.clear(); router.push("/admin/login"); }
    finally { setIsLoading(false); }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  if (accessDeniedMessage) {
    return (<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><AccessDeniedModal isOpen={true} message={accessDeniedMessage} onClose={() => router.push("/admin/login")} /></div>);
  }
  if (!isAuthorized || isLoading) {
    return (<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-emerald-600 rounded-full animate-spin"></div></div>);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden p-4 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <AdminHeader adminName={adminName} adminRole={adminRole} onLogout={handleLogout} title="Pusat AI (Command Center)" subtitle="Atur parameter dan perilaku asisten AI untuk deep research dan analisis skincare." />

        {/* Menu Navigasi Utama */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex flex-nowrap overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap md:pb-0 custom-scrollbar">
          <Link href="/admin/dashboard" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"><span>📚 Kamus Bahan Utama</span></Link>
          <Link href="/admin/reportbahan" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"><span>❓ Pusat Tinjauan</span></Link>
          <Link href="/admin/products" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"><span>🛒 Katalog Produk</span></Link>
          <Link href="/admin/products/review" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"><span>⭐ Moderasi Ulasan</span></Link>
          {(isSuperAdmin || (adminRole === "ADMIN" && sessionStorage.getItem("adminProfile")?.includes("MANAGE_BENNER"))) && (
            <Link href="/admin/benner" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"><span>🖼️ Kelola Banner</span></Link>
          )}
          <div className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg flex items-center gap-2 bg-emerald-900 text-white shadow-md cursor-default"><span>🧠 Pusat AI</span></div>
        </motion.div>

        {/* CARD NAVIGASI KE SUB-PAGE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Deep Research */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
            <Link href="/admin/pusat-ai/deepresearch" className="block group">
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg transition-all duration-300 space-y-4 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🔬</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">Deep Research</h3>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-500">Konfigurasi Riset Bahan</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Atur sumber prioritas per parameter, system prompt AI, dan protokol anti-halusinasi untuk riset bahan skincare.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">Sumber Prioritas</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">System Prompt</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">Anti-Halusinasi</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform">Buka Konfigurasi →</div>
              </div>
            </Link>
          </motion.div>

          {/* Card AI Hybrid Analyzer */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <Link href="/admin/pusat-ai/aihybrid" className="block group">
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-lg transition-all duration-300 space-y-4 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">🧠</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">AI Hybrid Analyzer</h3>
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-500">Konfigurasi Analisis Formulasi</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Atur prompt identitas AI, urutan model fallback, sumber referensi, dan perilaku analisis interaksi antar bahan.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">Prompt AI</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">Model Cascade</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">Sumber Referensi</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform">Buka Konfigurasi →</div>
              </div>
            </Link>
          </motion.div>

          {/* Card OCR AI Vision Scanner */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.35 }}>
            <Link href="/admin/pusat-ai/ocr-ai" className="block group">
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-600 hover:shadow-lg transition-all duration-300 space-y-4 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📷</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">OCR Label Scanner</h3>
                    <p className="text-xs font-bold text-teal-600 dark:text-teal-500">Konfigurasi AI Vision</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Atur prompt OCR, urutan model vision fallback, dan perilaku ekstraksi teks bahan kosmetik dari foto label.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800">Prompt OCR</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800">Model Vision</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-100 dark:border-teal-800">Dual-Photo</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-teal-600 dark:text-teal-400 group-hover:translate-x-1 transition-transform">Buka Konfigurasi →</div>
              </div>
            </Link>
          </motion.div>

          {/* Card Riwayat & Cache AI Hybrid */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
            <Link href="/admin/pusat-ai/history-aihybrid" className="block group">
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-600 hover:shadow-lg transition-all duration-300 space-y-4 h-full">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/50 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📜</div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">Riwayat & Cache</h3>
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-500">Kelola Hasil Pemindaian AI</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Lihat daftar riwayat pencarian AI-Hybrid, periksa model yang digunakan, hapus cache usang, atau bersihkan seluruh database cache secara massal.</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-800">Manajemen Cache</span>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-800">Hapus Selektif/Massal</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-violet-600 dark:text-violet-400 group-hover:translate-x-1 transition-transform">Buka Riwayat →</div>
              </div>
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
