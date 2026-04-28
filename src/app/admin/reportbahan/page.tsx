// src/app/admin/reportbahan/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Interface untuk Laporan Sistem (Bahan Asing)
interface UnknownReport {
  id: string;
  name: string;
  reportCount: number;
  createdAt: string;
}

// Interface untuk Laporan Pengguna (Ketidaksesuaian)
interface MismatchReport {
  id: string;
  ingredientName: string;
  reason: string;
  createdAt: string;
}

export default function AdminReportBahan() {
  const router = useRouter();
  
  // STATE DATA
  const [unknownReports, setUnknownReports] = useState<UnknownReport[]>([]);
  const [mismatchReports, setMismatchReports] = useState<MismatchReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // STATE NAVIGASI & MODAL
  const [activeTab, setActiveTab] = useState<"SYSTEM" | "USER">("SYSTEM");
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  // Pengecekan Keamanan & Tarik Data API secara Real-time (Polling)
  useEffect(() => {
    const isAuth = sessionStorage.getItem("isAdminAuth");
    if (!isAuth) {
      router.push("/admin/login");
      return;
    }
    
    // 1. Tarikan Pertama (Menampilkan animasi loading)
    fetchReports(true);

    // 2. Polling: Tarik data secara diam-diam setiap 5 detik
    const intervalId = setInterval(() => {
      fetchReports(false); // False = Jangan tampilkan animasi loading
    }, 5000);

    // Bersihkan interval jika admin berpindah halaman
    return () => clearInterval(intervalId);
  }, [router]);

  // Modifikasi fungsi agar bisa menerima parameter 'isInitial'
  const fetchReports = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    
    try {
      const res = await fetch("/api/admin/reportbahan");
      if (res.ok) {
        const data = await res.json();
        setUnknownReports(data.unknownReports || []);
        setMismatchReports(data.mismatchReports || []);
      }
    } catch (error) {
      console.error("Gagal mengambil laporan:", error);
    } finally {
      if (isInitial) setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    router.push("/admin/login");
  };

  // Hapus Laporan Bahan Asing (Sistem)
  const handleDeleteUnknown = async (id: string, name: string) => {
    if (!window.confirm(`Abaikan dan hapus bahan "${name}" dari antrean sistem?`)) return;
    try {
      const res = await fetch(`/api/admin/reportbahan?id=${id}&type=unknown`, { method: "DELETE" });
      if (res.ok) setUnknownReports(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      alert("Terjadi kesalahan.");
    }
  };

  // Hapus SEMUA Laporan Ketidaksesuaian untuk satu bahan (Pengguna)
  const handleDeleteMismatchGroup = async (ingredientName: string) => {
    if (!window.confirm(`Abaikan dan hapus semua laporan pengguna terkait "${ingredientName}"?`)) return;
    
    // Ambil semua ID laporan untuk bahan ini
    const reportsToDelete = mismatchReports.filter(r => r.ingredientName === ingredientName);
    
    try {
      // Hapus satu per satu secara paralel
      await Promise.all(
        reportsToDelete.map(r => 
          fetch(`/api/admin/reportbahan?id=${r.id}&type=mismatch`, { method: "DELETE" })
        )
      );
      
      // Update UI
      setMismatchReports(prev => prev.filter(r => r.ingredientName !== ingredientName));
      setSelectedIngredient(null); // Tutup modal
    } catch (error) {
      alert("Terjadi kesalahan saat menghapus laporan pengguna.");
    }
  };

  // LOGIKA PENGELOMPOKAN CERDAS (Anti-Spam Tampilan)
  const groupedMismatch = mismatchReports.reduce((acc, report) => {
    if (!acc[report.ingredientName]) acc[report.ingredientName] = [];
    acc[report.ingredientName].push(report);
    return acc;
  }, {} as Record<string, MismatchReport[]>);

  // Trik Edit Cepat: Set pencarian ke Session Storage, lalu lempar ke Dasbor Utama
  const handleQuickEdit = (ingredientName: string) => {
    sessionStorage.setItem("admin_search", ingredientName);
    router.push("/admin/dashboard");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 relative overflow-hidden">
      {/* Latar Belakang Estetik */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-rose-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 pointer-events-none"></div>

      {/* POP-UP MODAL TINJAUAN KELUHAN */}
      <AnimatePresence>
        {selectedIngredient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedIngredient(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <h4 className="font-black text-xl text-slate-900 capitalize tracking-tight">{selectedIngredient}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1 block">
                    {groupedMismatch[selectedIngredient]?.length || 0} Laporan Pengguna
                  </span>
                </div>
                <button onClick={() => setSelectedIngredient(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors font-bold">✕</button>
              </div>
              
              {/* Daftar Keluhan (Bisa di-scroll jika banyak) */}
              <div className="overflow-y-auto pr-2 space-y-3 mb-6 flex-1">
                {groupedMismatch[selectedIngredient]?.map((report, idx) => (
                  <div key={report.id} className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 relative">
                    <span className="absolute top-3 right-3 text-[9px] font-bold text-rose-300">#{idx + 1}</span>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed pr-6">"{report.reason}"</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-3 block">
                      Dilaporkan pada: {new Date(report.createdAt).toLocaleDateString('id-ID')}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3 shrink-0 pt-4 border-t border-slate-100 mt-auto">
                <button 
                  onClick={() => handleDeleteMismatchGroup(selectedIngredient)}
                  className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-colors shadow-sm"
                >
                  🗑️ Abaikan Semua
                </button>
                <button 
                  onClick={() => handleQuickEdit(selectedIngredient)}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl border border-transparent transition-colors shadow-sm"
                >
                  ✍️ Cari & Edit Bahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header Admin */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>🎛️</span> Admin Control Panel
            </h1>
            <p className="text-sm text-slate-500 font-medium">Kelola antrean pelaporan bahan untuk AI.</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95">
            Logout
          </button>
        </div>

        {/* Menu Navigasi (Dengan 2 Lencana Real-time) */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-wrap gap-3">
          <Link href="/admin/dashboard" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            📚 Kamus Bahan Utama
          </Link>
          
          {/* Tab Aktif */}
          <div className="px-6 py-3 font-bold text-sm rounded-xl flex items-center gap-3 bg-slate-900 text-white shadow-lg cursor-default">
            <span>❓ Pusat Tinjauan</span>
            <div className="flex gap-1">
              <span title="Laporan Sistem" className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm transition-all duration-300">
                🤖 {unknownReports.length}
              </span>
              <span title="Laporan Pengguna" className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm transition-all duration-300">
                👤 {Object.keys(groupedMismatch).length}
              </span>
            </div>
          </div>

          <Link href="/admin/products" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            <span>🛒 Katalog Produk</span>
          </Link>
        </motion.div>

        {/* Konten Utama */}
        <div className="bg-white/90 backdrop-blur-sm min-h-[500px] p-6 md:p-8 rounded-3xl shadow-sm border border-white">
          
          {/* TAB NAVIGASI */}
          <div className="flex gap-4 mb-8 border-b border-slate-100 pb-4">
            <button 
              onClick={() => setActiveTab("SYSTEM")}
              className={`pb-2 px-2 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${activeTab === "SYSTEM" ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              🤖 Laporan Sistem (Bahan Asing) 
              {unknownReports.length > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[10px] transition-all">{unknownReports.length}</span>}
            </button>
            <button 
              onClick={() => setActiveTab("USER")}
              className={`pb-2 px-2 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${activeTab === "USER" ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              👤 Laporan Pengguna (Ketidaksesuaian)
              {Object.keys(groupedMismatch).length > 0 && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-[10px] transition-all">{Object.keys(groupedMismatch).length}</span>}
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium animate-pulse">Menarik data pelaporan...</p>
            </div>
          ) : (
            <>
              {/* === TAB 1: LAPORAN SISTEM === */}
              {activeTab === "SYSTEM" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <p className="text-sm text-slate-500 mb-6 font-medium">Bahan yang dimasukkan pengguna tetapi belum ada di database.</p>
                  
                  {unknownReports.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <span className="text-4xl block mb-4 opacity-50">✨</span>
                      <p className="text-slate-700 font-bold text-lg mb-1">Sistem Bersih!</p>
                      <p className="text-slate-500 text-sm font-medium">Tidak ada bahan asing yang antre untuk direview.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-4 whitespace-nowrap">Nama Bahan (INCI)</th>
                            <th className="p-4 text-center whitespace-nowrap">Frekuensi Deteksi</th>
                            <th className="p-4 whitespace-nowrap">Laporan Pertama</th>
                            <th className="p-4 text-right whitespace-nowrap">Tindakan Admin</th>
                          </tr>
                        </thead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100">
                          {unknownReports.map((report) => (
                            <motion.tr variants={itemVariants} key={report.id} className="hover:bg-amber-50/30 transition-colors group">
                              <td className="p-4 font-black text-amber-700 lowercase">{report.name}</td>
                              <td className="p-4 text-center">
                                <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-black text-xs border border-amber-200 shadow-sm">{report.reportCount}x Dicari</span>
                              </td>
                              <td className="p-4 text-slate-500 font-medium text-xs">{new Date(report.createdAt).toLocaleDateString('id-ID')}</td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => handleDeleteUnknown(report.id, report.name)} className="text-slate-400 hover:text-red-600 font-bold text-xs px-2 py-1">🗑️ Abaikan</button>
                                  <Link href={`/admin/dashboard/create?name=${encodeURIComponent(report.name)}`} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 shadow-sm active:scale-95 flex items-center gap-1.5">
                                    <span>✨</span> Buat Kamus
                                  </Link>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </motion.tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* === TAB 2: LAPORAN PENGGUNA === */}
              {activeTab === "USER" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <p className="text-sm text-slate-500 mb-6 font-medium">Bahan terdaftar yang dilaporkan memiliki ketidaksesuaian fungsi atau manfaat oleh pengguna.</p>
                  
                  {Object.keys(groupedMismatch).length === 0 ? (
                    <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                      <span className="text-4xl block mb-4 opacity-50">🎉</span>
                      <p className="text-slate-700 font-bold text-lg mb-1">Pengguna Puas!</p>
                      <p className="text-slate-500 text-sm font-medium">Tidak ada keluhan ketidaksesuaian data saat ini.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                          <tr>
                            <th className="p-4 whitespace-nowrap">Nama Bahan (INCI)</th>
                            <th className="p-4 text-center whitespace-nowrap">Total Keluhan</th>
                            <th className="p-4 whitespace-nowrap text-right">Tindakan Admin</th>
                          </tr>
                        </thead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100">
                          {Object.entries(groupedMismatch).map(([ingredientName, reports]) => (
                            <motion.tr variants={itemVariants} key={ingredientName} className="hover:bg-rose-50/30 transition-colors group">
                              <td className="p-4 font-black text-rose-700 capitalize">{ingredientName}</td>
                              <td className="p-4 text-center">
                                <span className="inline-block bg-rose-100 text-rose-800 px-3 py-1 rounded-full font-black text-xs border border-rose-200 shadow-sm">{reports.length} Keluhan</span>
                              </td>
                              <td className="p-4 text-right">
                                <button 
                                  onClick={() => setSelectedIngredient(ingredientName)} 
                                  className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 shadow-sm active:scale-95 flex items-center justify-center gap-1.5 ml-auto"
                                >
                                  <span>🔍</span> Tinjau Keluhan
                                </button>
                              </td>
                            </motion.tr>
                          ))}
                        </motion.tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}