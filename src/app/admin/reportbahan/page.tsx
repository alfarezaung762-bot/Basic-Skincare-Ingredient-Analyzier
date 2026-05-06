// src/app/admin/reportbahan/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { splitAliases } from "@/lib/splitAliases";
import { AccessDeniedModal } from "@/components/admin/AccessDeniedModal";
import AdminHeader from "@/components/admin/AdminHeader";
import { useDeepResearch, ResearchEngine } from "@/components/DeepResearchProvider";

interface UnknownReport {
  id: string;
  name: string;
  reportCount: number;
  createdAt: string;
  analyzedBy?: string | null;
}

interface MismatchReport {
  id: string;
  ingredientName: string;
  reason: string;
  createdAt: string;
  analyzedBy?: string | null;
}

export default function AdminReportBahan() {
  const router = useRouter();
  
  const [unknownReports, setUnknownReports] = useState<UnknownReport[]>([]);
  const [mismatchReports, setMismatchReports] = useState<MismatchReport[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
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
  const { isResearching, startResearch } = useDeepResearch();
  const [selectedEngine, setSelectedEngine] = useState<ResearchEngine>({ provider: "gemini", model: "gemini-2.5-pro" });
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

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
      const [reportsRes, ingredientsRes] = await Promise.all([
        fetch("/api/admin/reportbahan"),
        fetch("/api/ingredients")
      ]);

      if (reportsRes.ok && ingredientsRes.ok) {
        const data = await reportsRes.json();
        const ingredientsData = await ingredientsRes.json();

        // Bangun kamus nama dan alias yang sudah ada (normalisasi)
        const normalizeString = (str: string) => str ? str.toLowerCase().replace(/[\s\-_]+/g, "") : "";
        const existingSet = new Set<string>();

        ingredientsData.forEach((item: any) => {
          existingSet.add(normalizeString(item.name));
          if (item.aliases) {
            splitAliases(item.aliases).forEach(cleanAlias => {
              existingSet.add(cleanAlias);
            });
          }
        });

        // Filter unknownReports yang belum ada di database
        const filteredUnknownReports = (data.unknownReports || []).filter((r: any) => !existingSet.has(normalizeString(r.name)));

        setUnknownReports(filteredUnknownReports);
        setMismatchReports(data.mismatchReports || []);
        setIngredients(ingredientsData);
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
      else if (next.size < 50) next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const filtered = unknownReports.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      const ids = filtered.slice(0, 50).map(r => r.id);
      setSelectedIds(new Set(ids));
    }
  };

  const handleDeepResearch = () => {
    if (!canManageKamus || selectedIds.size === 0 || isResearching) return;
    
    const selectedNames = unknownReports
      .filter(r => selectedIds.has(r.id))
      .map(r => r.name);
      
    // Jika custom endpoint dipilih, gunakan isinya
    const engineToUse = { ...selectedEngine };
    if (engineToUse.provider === "byteplus" && engineToUse.model === "custom") {
      if (!customEndpoint.trim()) {
        alert("Silakan masukkan Endpoint ID terlebih dahulu!");
        return;
      }
      engineToUse.model = customEndpoint.trim();
    }
    
    startResearch(selectedNames, adminName, adminRole, engineToUse);
    setSelectedIds(new Set());
  };

  const handleToggleClaim = async (id: string, type: "unknown" | "mismatch", currentClaim: string | null | undefined) => {
    if (isViewer) return;
    
    const action = currentClaim ? "unclaim" : "claim";
    
    // Jika sedang di-claim orang lain, beri peringatan (tapi admin masih bisa ambil alih jika perlu)
    if (currentClaim && currentClaim !== adminName && action === "claim") {
      if (!window.confirm(`Bahan ini sedang dianalisis oleh ${currentClaim}. Ambil alih?`)) return;
    }

    try {
      const res = await fetch("/api/admin/reportbahan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type, adminName, action })
      });
      
      if (res.ok) {
        // Update local state untuk feedback instan
        if (type === "unknown") {
          setUnknownReports(prev => prev.map(r => r.id === id ? { ...r, analyzedBy: action === "claim" ? adminName : null } : r));
        } else {
          setMismatchReports(prev => prev.map(r => r.id === id ? { ...r, analyzedBy: action === "claim" ? adminName : null } : r));
        }
      }
    } catch (error) {
      console.error("Gagal update status analisis:", error);
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 flex items-center justify-center">
        <AccessDeniedModal isOpen={true} message={accessDeniedMessage} onClose={() => router.push("/admin/dashboard")} />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 dark:border-slate-800 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 p-4 md:p-8 lg:p-12 relative overflow-hidden">

      {/* POP-UP MODAL TINJAUAN KELUHAN */}
      <AnimatePresence>
        {selectedIngredient && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedIngredient(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 dark:border-slate-800 dark:border-slate-800 max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6 shrink-0">
                <div>
                  <h4 className="font-black text-xl text-slate-900 dark:text-slate-100 dark:text-slate-100 capitalize tracking-tight">{selectedIngredient}</h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 dark:text-slate-400 mt-1 block">
                    {groupedMismatch[selectedIngredient]?.length || 0} Laporan Pengguna
                  </span>
                </div>
                <button onClick={() => setSelectedIngredient(null)} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 dark:bg-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-400 hover:bg-slate-200 rounded-full transition-colors font-bold">✕</button>
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
              <div className="flex gap-3 shrink-0 pt-4 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 mt-auto">
                {!isViewer && (
                  <button 
                    onClick={() => handleDeleteMismatchGroup(selectedIngredient)}
                    className="flex-1 py-3 bg-white dark:bg-slate-900 dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-950 dark:hover:bg-slate-800/50 dark:bg-slate-950 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 dark:border-slate-800 transition-colors shadow-sm active:scale-95"
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
                  <div className="flex-1 py-3 text-center text-xs font-bold text-slate-400 italic bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 dark:border-slate-800">
                    Mode Pemantau: Aksi dinonaktifkan
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DEEP RESEARCH PROGRESS DIPINDAHKAN KE GLOBAL PROVIDER */}

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Header Admin */}
        <AdminHeader 
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          title="Admin Control Panel"
          subtitle="Kelola antrean pelaporan bahan untuk AI."
        />

        {/* Menu Navigasi (Dengan 2 Lencana Real-time) */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex flex-nowrap overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap md:pb-0 custom-scrollbar">
          <Link href="/admin/dashboard" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-950 dark:hover:bg-slate-800/50 dark:bg-slate-950 hover:text-slate-900 dark:text-slate-100 dark:text-slate-100">
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

          <Link href="/admin/products" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-950 dark:hover:bg-slate-800/50 dark:bg-slate-950 hover:text-slate-900 dark:text-slate-100 dark:text-slate-100">
            <span>🛒 Katalog Produk</span>
          </Link>

          <Link href="/admin/products/review" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-600 border border-slate-200 dark:border-slate-800 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-950 dark:hover:bg-slate-800/50 dark:bg-slate-950 hover:text-slate-900 dark:text-slate-100 dark:text-slate-100">
            <span>⭐ Moderasi Ulasan</span>
          </Link>

          {/* PERENDERAN BERSYARAT: Tombol Manajemen Banner (Hanya Admin dengan Izin / Superadmin) */}
          {(isSuperAdmin || (adminRole === "ADMIN" && sessionStorage.getItem("adminProfile")?.includes("MANAGE_BENNER"))) && (
            <Link href="/admin/benner" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 text-indigo-600 border border-indigo-200 hover:bg-indigo-50">
              <span>🖼️ Kelola Banner</span>
            </Link>
          )}

          {isSuperAdmin && (
            <Link href="/admin/management" className="shrink-0 md:ml-auto px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 dark:bg-slate-900 text-purple-700 border border-purple-200 hover:bg-purple-50">
              <span>👑 Manajemen Akun</span>
            </Link>
          )}
        </motion.div>

        {/* Konten Utama */}
        <div className="bg-white dark:bg-slate-900 dark:bg-slate-900 min-h-[500px] p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 dark:border-slate-800">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 pb-4">
            <div className="flex gap-4">
              <button 
                onClick={() => setActiveTab("SYSTEM")}
                className={`pb-2 px-2 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${activeTab === "SYSTEM" ? 'border-slate-900 text-slate-900 dark:text-slate-100 dark:text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                🤖 Laporan Sistem (Bahan Asing) 
                {unknownReports.length > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md text-[10px] transition-all">{unknownReports.length}</span>}
              </button>
              <button 
                onClick={() => setActiveTab("USER")}
                className={`pb-2 px-2 text-sm font-bold transition-all flex items-center gap-2 border-b-2 ${activeTab === "USER" ? 'border-slate-900 text-slate-900 dark:text-slate-100 dark:text-slate-100' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                👤 Laporan Pengguna
                {Object.keys(groupedMismatch).length > 0 && <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md text-[10px] transition-all">{Object.keys(groupedMismatch).length}</span>}
              </button>
            </div>
            
            {/* SEARCH INPUT (Tersedia untuk Kedua Tab) */}
            <div className="relative w-full md:w-72">
              <input 
                type="text" 
                placeholder={activeTab === "SYSTEM" ? "Cari bahan asing..." : "Cari bahan atau keluhan..."} 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-800 dark:border-slate-800 border-t-slate-800 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium animate-pulse">Menarik data pelaporan...</p>
            </div>
          ) : (
            <>
              {activeTab === "SYSTEM" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium mb-6">Bahan yang dimasukkan pengguna tetapi belum ada di database.</p>
                  
                  {/* SELECTION BAR + DEEP RESEARCH BUTTON */}
                  {unknownReports.length > 0 && canManageKamus && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-950 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={toggleSelectAll}
                          disabled={isResearching}
                          className="text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-100 dark:text-slate-100 px-3 py-1.5 bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:border-slate-800 rounded-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                          {selectedIds.size > 0 ? "Bersihkan Pilihan" : `Pilih Semua (max 50)`}
                        </button>
                        {selectedIds.size > 0 && (
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                            {selectedIds.size}/{Math.min(unknownReports.length, 50)} dipilih
                          </span>
                        )}
                      </div>
                      {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2">
                          <select 
                            value={JSON.stringify(selectedEngine)} 
                            onChange={(e) => setSelectedEngine(JSON.parse(e.target.value))}
                            disabled={isResearching}
                            className="px-3 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:border-slate-800 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <optgroup label="Google Gemini">
                              <option value={JSON.stringify({provider: "gemini", model: "gemini-3.1-flash-lite-preview"})}>Gemini 3.1 Flash-Lite Preview</option>
                              <option value={JSON.stringify({provider: "gemini", model: "gemini-3.1-flash-preview"})}>Gemini 3.1 Flash Preview</option>
                              <option value={JSON.stringify({provider: "gemini", model: "gemini-3-flash-preview"})}>Gemini 3 Flash Preview</option>
                              <option value={JSON.stringify({provider: "gemini", model: "gemini-3-flash"})}>Gemini 3 Flash</option>
                              <option value={JSON.stringify({provider: "gemini", model: "gemini-2.5-pro"})}>Gemini 2.5 Pro</option>
                              <option value={JSON.stringify({provider: "gemini", model: "gemini-2.5-flash"})}>Gemini 2.5 Flash</option>
                            </optgroup>
                            <optgroup label="Google Gemma">
                              <option value={JSON.stringify({provider: "gemini", model: "gemma-4-31b-it"})}>Gemma 4 31B</option>
                              <option value={JSON.stringify({provider: "gemini", model: "gemma-4-26b-a4b-it"})}>Gemma 4 26B MoE</option>
                              <option value={JSON.stringify({provider: "gemini", model: "gemma-3-27b-it"})}>Gemma 3 27B</option>
                              <option value={JSON.stringify({provider: "gemini", model: "gemma-3-12b-it"})}>Gemma 3 12B</option>
                              <option value={JSON.stringify({provider: "gemini", model: "gemma-3-4b-it"})}>Gemma 3 4B</option>
                            </optgroup>
                            <optgroup label="ByteDance Ark (Endpoint Aktif)">
                              <option value={JSON.stringify({provider: "byteplus", model: "ep-20260505074455-nplpn"})}>DeepSeek-V3.2 (Active)</option>
                              <option value={JSON.stringify({provider: "byteplus", model: "ep-20260505075908-hgqh7"})}>GLM-4.7 (Active)</option>
                              <option value={JSON.stringify({provider: "byteplus", model: "ep-20260505075317-2sht5"})}>GPT-OSS-120B (Active)</option>
                              <option value={JSON.stringify({provider: "byteplus", model: "custom"})}>-- Gunakan Endpoint ID Custom --</option>
                            </optgroup>
                          </select>

                          {selectedEngine.provider === "byteplus" && selectedEngine.model === "custom" && (
                            <input 
                              type="text"
                              placeholder="Masukkan Endpoint ID (ep-...)"
                              value={customEndpoint}
                              onChange={(e) => setCustomEndpoint(e.target.value)}
                              className="px-3 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 dark:bg-slate-900 border border-indigo-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                            />
                          )}
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
                              <>🔬 Riset ({selectedIds.size})</>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {unknownReports.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-950 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 dark:border-slate-800">
                      <span className="text-4xl block mb-4 opacity-50">✨</span>
                      <p className="text-slate-700 font-bold text-lg mb-1">Sistem Bersih!</p>
                      <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm font-medium">Tidak ada bahan asing yang antre untuk direview.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 dark:border-slate-800 shadow-sm">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-100 dark:bg-slate-800 dark:bg-slate-800/80 text-slate-600 font-bold border-b border-slate-200 dark:border-slate-800 dark:border-slate-800">
                          <tr>
                            {canManageKamus && (
                              <th className="p-4 w-12">
                                <input 
                                  type="checkbox" 
                                  checked={selectedIds.size > 0 && selectedIds.size === Math.min(unknownReports.length, 50)}
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
                          {unknownReports
                            .filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map((report) => {
                              const isClaimedByMe = report.analyzedBy === adminName;
                              const isClaimedByOther = report.analyzedBy && report.analyzedBy !== adminName;
                              
                              return (
                                <motion.tr 
                                  variants={itemVariants} 
                                  key={report.id} 
                                  className={`transition-colors group relative ${
                                    selectedIds.has(report.id) ? "bg-indigo-50/40" : 
                                    isClaimedByMe ? "bg-emerald-50 border-l-4 border-l-emerald-500" :
                                    isClaimedByOther ? "bg-slate-100 dark:bg-slate-800 dark:bg-slate-800/50 grayscale-[0.5]" : "hover:bg-amber-50/30"
                                  }`}
                                >
                                  {canManageKamus && (
                                    <td className="p-4">
                                      <input 
                                        type="checkbox" 
                                        checked={selectedIds.has(report.id)}
                                        onChange={() => toggleSelectId(report.id)}
                                        disabled={isResearching || Boolean(report.analyzedBy && report.analyzedBy !== adminName) || (!selectedIds.has(report.id) && selectedIds.size >= 50)}
                                        className="w-4 h-4 rounded accent-indigo-600 cursor-pointer disabled:opacity-50"
                                      />
                                    </td>
                                  )}
                                  <td className="p-4">
                                    <div className="flex flex-col items-start">
                                      <span className={`font-black lowercase text-lg ${isClaimedByOther ? "text-slate-400" : "text-amber-700"}`}>
                                        {report.name}
                                      </span>
                                      {report.analyzedBy && (
                                        <span className={`text-[10px] font-black mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md w-fit shadow-sm border ${isClaimedByMe ? "bg-emerald-100 text-emerald-700 border-emerald-300" : "bg-slate-200 text-slate-600 border-slate-300"}`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${isClaimedByMe ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}></span> 
                                          {isClaimedByMe ? "Sedang Anda Cek" : `Di Cek: ${report.analyzedBy}`}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="inline-block bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-black text-xs border border-amber-200 shadow-sm">{report.reportCount}x Dicari</span>
                                  </td>
                                  <td className="p-4 text-slate-500 dark:text-slate-400 dark:text-slate-400 font-medium text-xs">{new Date(report.createdAt).toLocaleDateString('id-ID')}</td>
                                  <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                                      
                                      {/* CLAIM BUTTON */}
                                      {!isViewer && (
                                        <button 
                                          onClick={() => handleToggleClaim(report.id, "unknown", report.analyzedBy)}
                                          disabled={Boolean(report.analyzedBy && report.analyzedBy !== adminName)}
                                          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all ${
                                            isClaimedByMe 
                                              ? "bg-emerald-600 text-white border-emerald-700 shadow-sm hover:bg-emerald-700" 
                                              : "bg-white dark:bg-slate-900 dark:bg-slate-900 text-slate-600 border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-950 dark:hover:bg-slate-800/50 dark:bg-slate-950 shadow-sm"
                                          } disabled:opacity-30`}
                                          title={isClaimedByMe ? "Selesai Pengecekan" : "Tandai Sedang Anda Cek"}
                                        >
                                          {isClaimedByMe ? "✓ Selesai" : "⏳ Cek Bahan"}
                                        </button>
                                      )}

                                      {/* PERENDERAN BERSYARAT: Tombol Abaikan/Hapus */}
                                      {!isViewer ? (
                                        <button onClick={() => handleDeleteUnknown(report.id, report.name)} className="text-slate-400 hover:text-red-600 font-bold text-xs px-2 py-1">🗑️ Abaikan</button>
                                      ) : (
                                        <span className="text-[10px] font-bold text-slate-400 italic mr-2">Hanya Pantau</span>
                                      )}

                                      {/* PERENDERAN BERSYARAT: Tombol Buat Kamus (Hanya jika punya izin Kamus) */}
                                      {canManageKamus && (
                                        <Link href={`/admin/dashboard/create?name=${encodeURIComponent(report.name)}`} className="bg-black text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-800 shadow-sm active:scale-95 flex items-center gap-1.5">
                                          <span>✨</span> Buat
                                        </Link>
                                      )}

                                    </div>
                                  </td>
                                </motion.tr>
                              );
                            })}
                        </motion.tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "USER" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-400 mb-6 font-medium">Bahan terdaftar yang dilaporkan memiliki ketidaksesuaian fungsi atau manfaat oleh pengguna.</p>
                  
                  {Object.keys(groupedMismatch).length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-950 dark:bg-slate-950/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 dark:border-slate-800">
                      <span className="text-4xl block mb-4 opacity-50">🎉</span>
                      <p className="text-slate-700 font-bold text-lg mb-1">Pengguna Puas!</p>
                      <p className="text-slate-500 dark:text-slate-400 dark:text-slate-400 text-sm font-medium">Tidak ada keluhan ketidaksesuaian data saat ini.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 dark:border-slate-800 shadow-sm">
                      <table className="w-full text-left text-sm text-slate-700">
                        <thead className="bg-slate-100 dark:bg-slate-800 dark:bg-slate-800/80 text-slate-600 font-bold border-b border-slate-200 dark:border-slate-800 dark:border-slate-800">
                          <tr>
                            <th className="p-4 whitespace-nowrap">Nama Bahan (INCI)</th>
                            <th className="p-4 text-center whitespace-nowrap">Total Keluhan</th>
                            <th className="p-4 whitespace-nowrap text-right">Tindakan Admin</th>
                          </tr>
                        </thead>
                        <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100">
                          {Object.entries(groupedMismatch)
                            .filter(([ingredientName, reports]) => {
                              const sq = searchQuery.toLowerCase();
                              if (ingredientName.toLowerCase().includes(sq)) return true;
                              
                              // Check if search matches any alias of this ingredient
                              const ingredient = ingredients.find(i => i.name.toLowerCase() === ingredientName.toLowerCase());
                              if (ingredient && ingredient.aliases && ingredient.aliases.toLowerCase().includes(sq)) return true;

                              return reports.some(r => r.reason.toLowerCase().includes(sq));
                            })
                            .map(([ingredientName, reports]) => (
                            <motion.tr variants={itemVariants} key={ingredientName} className="hover:bg-rose-50/30 transition-colors group">
                              <td className="p-4 font-black text-rose-700 capitalize">{ingredientName}</td>
                              <td className="p-4 text-center">
                                <span className="inline-block bg-rose-100 text-rose-800 px-3 py-1 rounded-full font-black text-xs border border-rose-200 shadow-sm">{reports.length} Keluhan</span>
                              </td>
                              <td className="p-4 text-right">
                                <button 
                                  onClick={() => setSelectedIngredient(ingredientName)} 
                                  className="bg-white dark:bg-slate-900 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 dark:border-slate-800 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-950 dark:hover:bg-slate-800/50 dark:bg-slate-950 shadow-sm active:scale-95 flex items-center justify-center gap-1.5 ml-auto"
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