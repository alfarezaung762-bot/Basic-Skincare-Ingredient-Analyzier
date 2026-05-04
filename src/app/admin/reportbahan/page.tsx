// src/app/admin/reportbahan/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AccessDeniedModal } from "@/components/admin/AccessDeniedModal";

interface UnknownReport {
  id: string;
  name: string;
  reportCount: number;
  createdAt: string;
}

interface MismatchReport {
  id: string;
  ingredientName: string;
  reason: string;
  createdAt: string;
}

export default function AdminReportBahan() {
  const router = useRouter();
  
  const [unknownReports, setUnknownReports] = useState<UnknownReport[]>([]);
  const [mismatchReports, setMismatchReports] = useState<MismatchReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // STATE BARU: Keamanan & Hak Akses Lintas Batas
  const [isViewer, setIsViewer] = useState(false);
  const [canManageKamus, setCanManageKamus] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  const [activeTab, setActiveTab] = useState<"SYSTEM" | "USER">("SYSTEM");
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  // STATE DEEP RESEARCH
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState<{current: number; total: number; name: string; status: string; error?: string; aliasCount?: number; reportsCleaned?: number; model?: string} | null>(null);
  const [researchLog, setResearchLog] = useState<{name: string; status: string; error?: string; aliasCount?: number; model?: string}[]>([]);
  const [researchSummary, setResearchSummary] = useState<{success: number; failed: number; skipped: number; totalAliasesFound: number; totalReportsCleaned: number} | null>(null);
  const [showResearchModal, setShowResearchModal] = useState(false);

  // ========================================================
  // 1. PENGAMANAN HALAMAN (ROUTE GUARD) & POLLING DATA
  // ========================================================
  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    
    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    try {
      const profile = JSON.parse(profileString);
      setAdminName(profile.username || "Admin");
      setAdminRole(profile.role || "STAFF");
      const superAdminCheck = profile.role === "SUPERADMIN";
      const isViewOnly = profile.role === "VIEWER";
      const hasTinjauanAccess = profile.permissions && profile.permissions.includes("MANAGE_TINJAUAN");
      const hasKamusAccess = profile.permissions && profile.permissions.includes("MANAGE_KAMUS");

      // Tolak jika bukan Superadmin, bukan Viewer, dan tidak punya izin Manage Tinjauan
      if (!superAdminCheck && !isViewOnly && !hasTinjauanAccess) {
        setAccessDeniedMessage("Anda tidak memiliki wewenang memantau Pusat Tinjauan.");
        return;
      }

      // Tetapkan status Hak Akses ke dalam State
      setIsViewer(isViewOnly);
      setIsSuperAdmin(superAdminCheck);
      // Seseorang bisa menekan tombol Buat/Edit Kamus JIKA mereka Superadmin ATAU punya izin Kamus (dan BUKAN Viewer)
      setCanManageKamus((superAdminCheck || hasKamusAccess) && !isViewOnly);
      setIsAuthorized(true);

      // Mulai Tarik Data
      fetchReports(true);

      const intervalId = setInterval(() => {
        fetchReports(false); 
      }, 5000);

      return () => clearInterval(intervalId);

    } catch (error) {
      sessionStorage.clear();
      router.push("/admin/login");
    }
  }, [router]);

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
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  const handleDeleteUnknown = async (id: string, name: string) => {
    if (isViewer) return; // Cegah Viewer jika memaksa fungsi
    
    if (!window.confirm(`Abaikan dan hapus bahan "${name}" dari antrean sistem?`)) return;
    try {
      const res = await fetch(`/api/admin/reportbahan?id=${id}&type=unknown`, { method: "DELETE" });
      if (res.ok) setUnknownReports(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      alert("Terjadi kesalahan.");
    }
  };

  const handleDeleteMismatchGroup = async (ingredientName: string) => {
    if (isViewer) return; // Cegah Viewer jika memaksa fungsi

    if (!window.confirm(`Abaikan dan hapus semua laporan pengguna terkait "${ingredientName}"?`)) return;
    
    const reportsToDelete = mismatchReports.filter(r => r.ingredientName === ingredientName);
    
    try {
      await Promise.all(
        reportsToDelete.map(r => 
          fetch(`/api/admin/reportbahan?id=${r.id}&type=mismatch`, { method: "DELETE" })
        )
      );
      
      setMismatchReports(prev => prev.filter(r => r.ingredientName !== ingredientName));
      setSelectedIngredient(null); 
    } catch (error) {
      alert("Terjadi kesalahan saat menghapus laporan pengguna.");
    }
  };

  const groupedMismatch = mismatchReports.reduce((acc, report) => {
    if (!acc[report.ingredientName]) acc[report.ingredientName] = [];
    acc[report.ingredientName].push(report);
    return acc;
  }, {} as Record<string, MismatchReport[]>);

  const handleQuickEdit = (ingredientName: string) => {
    if (!canManageKamus) return; // Cegah jika tidak ada akses
    sessionStorage.setItem("admin_search", ingredientName);
    router.push("/admin/dashboard");
  };

  // ========================================================
  // DEEP RESEARCH HANDLERS
  // ========================================================
  const toggleSelectId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 15) next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === unknownReports.length || selectedIds.size >= 15) {
      setSelectedIds(new Set());
    } else {
      const ids = unknownReports.slice(0, 15).map(r => r.id);
      setSelectedIds(new Set(ids));
    }
  };

  const handleDeepResearch = async () => {
    if (!canManageKamus || selectedIds.size === 0 || isResearching) return;

    const selectedNames = unknownReports
      .filter(r => selectedIds.has(r.id))
      .map(r => r.name);

    setIsResearching(true);
    setShowResearchModal(true);
    setResearchLog([]);
    setResearchSummary(null);
    setResearchProgress(null);

    try {
      const res = await fetch("/api/admin/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names: selectedNames, adminName, adminRole }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Gagal memulai deep research");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "init") {
              if (event.skippedCount > 0) {
                setResearchLog(prev => [...prev, ...event.skipped.map((n: string) => ({ name: n, status: "skipped", error: "Sudah ada di kamus" }))]);
              }
            } else if (event.type === "progress") {
              setResearchProgress(event);
              if (event.status !== "researching") {
                setResearchLog(prev => [...prev, { name: event.name, status: event.status, error: event.error, aliasCount: event.aliasCount, model: event.model }]);
              }
            } else if (event.type === "complete") {
              setResearchSummary(event.summary);
            }
          } catch (e) { /* skip invalid JSON */ }
        }
      }
    } catch (error: any) {
      console.error("Deep Research Error:", error);
      setResearchSummary({ success: 0, failed: selectedNames.length, skipped: 0, totalAliasesFound: 0, totalReportsCleaned: 0 });
    } finally {
      setIsResearching(false);
      setSelectedIds(new Set());
      fetchReports(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  if (accessDeniedMessage) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <AccessDeniedModal isOpen={true} message={accessDeniedMessage} onClose={() => router.push("/admin/dashboard")} />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12 relative overflow-hidden">

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
              
              {/* AKSI MODAL DENGAN PERENDERAN BERSYARAT */}
              <div className="flex gap-3 shrink-0 pt-4 border-t border-slate-100 mt-auto">
                {!isViewer && (
                  <button 
                    onClick={() => handleDeleteMismatchGroup(selectedIngredient)}
                    className="flex-1 py-3 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition-colors shadow-sm active:scale-95"
                  >
                    🗑️ Abaikan Semua
                  </button>
                )}
                
                {canManageKamus && (
                  <button 
                    onClick={() => handleQuickEdit(selectedIngredient)}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl border border-transparent transition-colors shadow-sm active:scale-95"
                  >
                    ✍️ Cari & Edit Bahan
                  </button>
                )}

                {/* Info jika tidak ada tombol yang bisa ditekan oleh Viewer */}
                {isViewer && !canManageKamus && (
                  <div className="flex-1 py-3 text-center text-xs font-bold text-slate-400 italic bg-slate-50 rounded-xl border border-slate-100">
                    Mode Pemantau: Aksi dinonaktifkan
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DEEP RESEARCH PROGRESS */}
      <AnimatePresence>
        {showResearchModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-5 shrink-0">
                <div>
                  <h4 className="font-black text-xl text-slate-900 flex items-center gap-2">
                    🔬 Deep Research AI
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1 block">
                    {isResearching ? "Sedang menganalisis..." : researchSummary ? "Selesai!" : "Mempersiapkan..."}
                  </span>
                </div>
                {!isResearching ? (
                  <button onClick={() => setShowResearchModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors font-bold" title="Tutup">✕</button>
                ) : (
                  <button onClick={() => setShowResearchModal(false)} className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors" title="Proses tetap berjalan di latar belakang">
                    ⬇️ Minimize
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              {researchProgress && (
                <div className="mb-4 shrink-0">
                  <div className="flex justify-between text-xs font-bold text-slate-600 mb-2">
                    <span>{researchProgress.current}/{researchProgress.total} bahan</span>
                    <span className="text-slate-400">{isResearching ? `⏳ ~${(researchProgress.total - researchProgress.current) * 10} detik lagi` : "✅ Selesai"}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(researchProgress.current / researchProgress.total) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              )}

              {/* Currently Processing */}
              {isResearching && researchProgress?.status === "researching" && (
                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3 shrink-0">
                  <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 capitalize">{researchProgress.name}</p>
                    <p className="text-[10px] text-blue-600 font-medium">Menganalisis dengan Gemini AI...</p>
                  </div>
                </div>
              )}

              {/* Log Scroll */}
              <div className="overflow-y-auto flex-1 space-y-2 pr-1 mb-4">
                {researchLog.map((log, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between gap-2 ${
                    log.status === "done" ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                    log.status === "error" ? "bg-red-50 border-red-100 text-red-700" :
                    "bg-slate-50 border-slate-100 text-slate-500"
                  }`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0">{log.status === "done" ? "✅" : log.status === "error" ? "❌" : "⏭️"}</span>
                      <span className="capitalize truncate">{log.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {log.aliasCount !== undefined && log.aliasCount > 0 && (
                        <span className="bg-white px-2 py-0.5 rounded-md border text-[9px]">+{log.aliasCount} alias</span>
                      )}
                      {log.status === "error" && (
                        <span className="text-[9px] text-red-500 max-w-[120px] truncate">{log.error}</span>
                      )}
                      {log.model && (
                        <span className="text-[9px] text-slate-400">{log.model.split("-").slice(0,3).join("-")}</span>
                      )}
                    </div>
                  </div>
                ))}
                {researchLog.length === 0 && isResearching && (
                  <div className="text-center py-8 opacity-50">
                    <div className="w-8 h-8 border-3 border-slate-200 border-t-slate-600 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs text-slate-500 font-medium">Memulai analisis...</p>
                  </div>
                )}
              </div>

              {/* Summary */}
              {researchSummary && (
                <div className="shrink-0 pt-4 border-t border-slate-100 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-center">
                      <p className="text-2xl font-black text-emerald-700">{researchSummary.success}</p>
                      <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Berhasil</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 text-center">
                      <p className="text-2xl font-black text-red-600">{researchSummary.failed}</p>
                      <p className="text-[9px] font-bold text-red-500 uppercase tracking-widest">Gagal</p>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 text-center">
                      <p className="text-2xl font-black text-indigo-700">{researchSummary.totalAliasesFound}</p>
                      <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Alias</p>
                    </div>
                  </div>
                  {researchSummary.totalReportsCleaned > 0 && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 text-center">
                      <p className="text-xs font-bold text-amber-800">🧹 {researchSummary.totalReportsCleaned} laporan otomatis dibersihkan</p>
                    </div>
                  )}
                  <button 
                    onClick={() => setShowResearchModal(false)} 
                    className="w-full py-3 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all active:scale-95"
                  >
                    Tutup & Kembali ke Tinjauan
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING MINI-INDICATOR saat modal di-minimize tapi proses masih jalan */}
      {isResearching && !showResearchModal && (
        <button 
          onClick={() => setShowResearchModal(true)}
          className="fixed bottom-6 right-6 z-[90] bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 transition-all active:scale-95 animate-pulse"
        >
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <div className="text-left">
            <p className="text-xs font-bold">🔬 Deep Research</p>
            <p className="text-[10px] opacity-80">{researchProgress ? `${researchProgress.current}/${researchProgress.total} bahan` : "Memulai..."}</p>
          </div>
        </button>
      )}

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Admin */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>🎛️</span> Admin Control Panel
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Kelola antrean pelaporan bahan untuk AI.</p>
          </div>
          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 mt-2 md:mt-0">
            <div className="text-left md:text-right">
              <p className="text-sm font-black text-slate-900">{adminName}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{adminRole}</p>
            </div>
            <button onClick={handleLogout} className="px-5 py-2 shrink-0 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95">
              Logout
            </button>
          </div>
        </div>

        {/* Menu Navigasi (Dengan 2 Lencana Real-time) */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex flex-nowrap overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap md:pb-0 custom-scrollbar">
          <Link href="/admin/dashboard" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900">
            <span>📚 Kamus Bahan Utama</span>
          </Link>
          
          <div className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg flex items-center gap-2 bg-slate-900 text-white shadow-md cursor-default">
            <span>❓ Pusat Tinjauan</span>
            <div className="flex gap-1 ml-1">
              <span title="Laporan Sistem" className="bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-md transition-all duration-300">
                🤖 {unknownReports.length}
              </span>
              <span title="Laporan Pengguna" className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-md transition-all duration-300">
                👤 {Object.keys(groupedMismatch).length}
              </span>
            </div>
          </div>

          <Link href="/admin/products" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900">
            <span>🛒 Katalog Produk</span>
          </Link>

          <Link href="/admin/products/review" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900">
            <span>⭐ Moderasi Ulasan</span>
          </Link>

          {/* PERENDERAN BERSYARAT: Tombol Manajemen Banner (Hanya Admin dengan Izin / Superadmin) */}
          {(isSuperAdmin || (adminRole === "ADMIN" && sessionStorage.getItem("adminProfile")?.includes("MANAGE_BENNER"))) && (
            <Link href="/admin/benner" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50">
              <span>🖼️ Kelola Banner</span>
            </Link>
          )}

          {isSuperAdmin && (
            <Link href="/admin/management" className="shrink-0 md:ml-auto px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-purple-700 border border-purple-200 hover:bg-purple-50">
              <span>👑 Manajemen Akun</span>
            </Link>
          )}
        </motion.div>

        {/* Konten Utama */}
        <div className="bg-white min-h-[500px] p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
          
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
              {activeTab === "SYSTEM" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <p className="text-sm text-slate-500 mb-4 font-medium">Bahan yang dimasukkan pengguna tetapi belum ada di database.</p>
                  
                  {/* SELECTION BAR + DEEP RESEARCH BUTTON */}
                  {unknownReports.length > 0 && canManageKamus && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={toggleSelectAll}
                          disabled={isResearching}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-1.5 bg-white border border-slate-200 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                          {selectedIds.size > 0 ? "Bersihkan Pilihan" : `Pilih Semua (max 15)`}
                        </button>
                        {selectedIds.size > 0 && (
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                            {selectedIds.size}/{Math.min(unknownReports.length, 15)} dipilih
                          </span>
                        )}
                      </div>
                      {selectedIds.size > 0 && (
                        <button 
                          onClick={handleDeepResearch}
                          disabled={isResearching}
                          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {isResearching ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                              Sedang Riset...
                            </>
                          ) : (
                            <>🔬 Deep Research ({selectedIds.size} bahan)</>
                          )}
                        </button>
                      )}
                    </div>
                  )}

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
                            {canManageKamus && (
                              <th className="p-4 w-12">
                                <input 
                                  type="checkbox" 
                                  checked={selectedIds.size > 0 && selectedIds.size === Math.min(unknownReports.length, 15)}
                                  onChange={toggleSelectAll}
                                  disabled={isResearching}
                                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer disabled:opacity-50"
                                />
                              </th>
                            )}
                            <th className="p-4 whitespace-nowrap">Nama Bahan (INCI)</th>
                            <th className="p-4 text-center whitespace-nowrap">Frekuensi Deteksi</th>
                            <th className="p-4 whitespace-nowrap">Laporan Pertama</th>
                            <th className="p-4 text-right whitespace-nowrap">Tindakan Admin</th>
                          </tr>
                        </thead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100">
                          {unknownReports.map((report) => (
                            <motion.tr variants={itemVariants} key={report.id} className={`hover:bg-amber-50/30 transition-colors group ${selectedIds.has(report.id) ? "bg-indigo-50/40" : ""}`}>
                              {canManageKamus && (
                                <td className="p-4">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedIds.has(report.id)}
                                    onChange={() => toggleSelectId(report.id)}
                                    disabled={isResearching || (!selectedIds.has(report.id) && selectedIds.size >= 15)}
                                    className="w-4 h-4 rounded accent-indigo-600 cursor-pointer disabled:opacity-50"
                                  />
                                </td>
                              )}
                              <td className="p-4 font-black text-amber-700 lowercase">{report.name}</td>
                              <td className="p-4 text-center">
                                <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-black text-xs border border-amber-200 shadow-sm">{report.reportCount}x Dicari</span>
                              </td>
                              <td className="p-4 text-slate-500 font-medium text-xs">{new Date(report.createdAt).toLocaleDateString('id-ID')}</td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                  
                                  {/* PERENDERAN BERSYARAT: Tombol Abaikan/Hapus */}
                                  {!isViewer ? (
                                    <button onClick={() => handleDeleteUnknown(report.id, report.name)} className="text-slate-400 hover:text-red-600 font-bold text-xs px-2 py-1">🗑️ Abaikan</button>
                                  ) : (
                                    <span className="text-[10px] font-bold text-slate-400 italic mr-2">Hanya Pantau</span>
                                  )}

                                  {/* PERENDERAN BERSYARAT: Tombol Buat Kamus (Hanya jika punya izin Kamus) */}
                                  {canManageKamus && (
                                    <Link href={`/admin/dashboard/create?name=${encodeURIComponent(report.name)}`} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 shadow-sm active:scale-95 flex items-center gap-1.5">
                                      <span>✨</span> Buat Kamus
                                    </Link>
                                  )}

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