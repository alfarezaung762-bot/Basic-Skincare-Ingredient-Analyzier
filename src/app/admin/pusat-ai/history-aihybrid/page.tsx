"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import AdminHeader from "@/components/admin/AdminHeader";
import { AccessDeniedModal } from "@/components/admin/AccessDeniedModal";

interface CacheHistoryItem {
  id: string;
  cacheKey: string;
  ingredientsInput: string;
  modelUsed: string;
  aiResponse: any;
  createdAt: string;
}

export default function AIHybridHistoryPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [historyItems, setHistoryItems] = useState<CacheHistoryItem[]>([]);
  const [selectedModelFilter, setSelectedModelFilter] = useState("all");
  const [uniqueModels, setUniqueModels] = useState<string[]>([]);
  
  // Interactive Modal / Detail State
  const [selectedItemDetail, setSelectedItemDetail] = useState<CacheHistoryItem | null>(null);
  const [deleteConfirmType, setDeleteConfirmType] = useState<"single" | "model" | "all" | null>(null);
  const [targetIdToDelete, setTargetIdToDelete] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

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
      const isAdmin = profile.role === "ADMIN";
      if (!superAdminCheck && !isAdmin) {
        setAccessDeniedMessage("Anda tidak memiliki wewenang untuk mengakses Pusat AI.");
        return;
      }
      setIsSuperAdmin(superAdminCheck);
      setIsAuthorized(true);
      fetchHistory();
    } catch {
      sessionStorage.clear();
      router.push("/admin/login");
    }
  }, [router]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pusat-ai");
      if (res.ok) {
        const data = await res.json();
        setHistoryItems(data || []);
        
        // Ekstrak daftar model unik untuk dropdown filter
        const models = Array.from(new Set((data || []).map((item: any) => item.modelUsed))) as string[];
        setUniqueModels(models);
      }
    } catch (error) {
      console.error("Gagal menarik data riwayat cache:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  const executeDelete = async () => {
    setIsActionLoading(true);
    try {
      let url = "/api/pusat-ai";
      if (deleteConfirmType === "single" && targetIdToDelete) {
        url += `?id=${targetIdToDelete}`;
      } else if (deleteConfirmType === "model" && selectedModelFilter !== "all") {
        url += `?model=${encodeURIComponent(selectedModelFilter)}`;
      } else if (deleteConfirmType === "all") {
        url += `?all=true`;
      } else {
        alert("Operasi hapus tidak valid.");
        setDeleteConfirmType(null);
        setIsActionLoading(false);
        return;
      }

      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        // Refresh local state based on what was deleted
        if (deleteConfirmType === "single" && targetIdToDelete) {
          setHistoryItems(prev => prev.filter(item => item.id !== targetIdToDelete));
        } else if (deleteConfirmType === "model" && selectedModelFilter !== "all") {
          setHistoryItems(prev => prev.filter(item => item.modelUsed !== selectedModelFilter));
          setSelectedModelFilter("all");
        } else if (deleteConfirmType === "all") {
          setHistoryItems([]);
          setSelectedModelFilter("all");
        }
        setDeleteConfirmType(null);
        setTargetIdToDelete(null);
        
        // Re-extract unique models
        const updatedModels = Array.from(new Set(historyItems.map(item => item.modelUsed))) as string[];
        setUniqueModels(updatedModels);
      } else {
        alert("Gagal menghapus cache.");
      }
    } catch (error) {
      console.error("Gagal melakukan penghapusan:", error);
      alert("Terjadi kesalahan sistem saat menghapus.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter items based on dropdown selection
  const filteredItems = selectedModelFilter === "all"
    ? historyItems
    : historyItems.filter(item => item.modelUsed === selectedModelFilter);

  // Hitung stats
  const totalEntries = historyItems.length;
  const geminiCount = historyItems.filter(item => item.modelUsed.includes("gemini")).length;
  const openRouterCount = historyItems.filter(item => !item.modelUsed.includes("gemini") && !item.modelUsed.startsWith("ep-")).length;
  const byteplusCount = historyItems.filter(item => item.modelUsed.startsWith("ep-")).length;

  if (accessDeniedMessage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <AccessDeniedModal isOpen={true} message={accessDeniedMessage} onClose={() => router.push("/admin/login")} />
      </div>
    );
  }

  if (!isAuthorized || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-violet-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden p-4 md:p-8 lg:p-12">
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <AdminHeader
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          title="Riwayat & Cache AI-Hybrid"
          subtitle="Manajemen data cache hasil analisis kecocokan dan interaksi formulasi bahan aktif skincare."
        />

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm">
          <Link href="/admin/pusat-ai" className="text-violet-600 dark:text-violet-400 hover:underline font-bold">← Pusat AI</Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 dark:text-slate-300 font-bold">📜 Riwayat & Cache</span>
        </motion.div>

        {/* STATS PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-violet-100 dark:border-violet-900/50 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Riwayat Cache</p>
            <h3 className="text-3xl font-black text-violet-600 dark:text-violet-400 mt-1">{totalEntries} <span className="text-sm font-bold text-slate-500">entri</span></h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">Bahan terbebas dari LLM call berikutnya</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cache Gemini</p>
            <h3 className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{geminiCount} <span className="text-sm font-bold text-slate-500">entri</span></h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">Model Gemini bawaan sistem</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cache BytePlus (Ark)</p>
            <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{byteplusCount} <span className="text-sm font-bold text-slate-500">entri</span></h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">Model berbasis BytePlus Ark</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-orange-100 dark:border-orange-900/50 shadow-sm"
          >
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cache OpenRouter</p>
            <h3 className="text-3xl font-black text-orange-600 dark:text-orange-400 mt-1">{openRouterCount} <span className="text-sm font-bold text-slate-500">entri</span></h3>
            <p className="text-xs text-slate-400 mt-2 font-medium">Model dari router multi-provider</p>
          </motion.div>
        </div>

        {/* WORKSPACE & ACTIONS */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-6"
        >
          {/* Header Kontrol */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">📋 Daftar Cache Terdaftar</h2>
              <p className="text-xs text-slate-500 font-medium">Filter berdasarkan model AI atau bersihkan cache secara massal jika diperlukan.</p>
            </div>

            {/* Filter & Global Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Dropdown Filter Model */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Model:</span>
                <select
                  value={selectedModelFilter}
                  onChange={(e) => setSelectedModelFilter(e.target.value)}
                  className="px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none text-slate-700 dark:text-slate-300"
                >
                  <option value="all">Semua Model ({totalEntries})</option>
                  {uniqueModels.map(model => (
                    <option key={model} value={model}>
                      {model} ({historyItems.filter(item => item.modelUsed === model).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Hapus Kategori */}
              {selectedModelFilter !== "all" && (
                <button
                  onClick={() => setDeleteConfirmType("model")}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1"
                >
                  <span>🗑️</span> Hapus Cache Model
                </button>
              )}

              {/* Hapus Semua */}
              {totalEntries > 0 && (
                <button
                  onClick={() => setDeleteConfirmType("all")}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm flex items-center gap-1"
                >
                  <span>💥</span> Bersihkan Semua Cache
                </button>
              )}
            </div>
          </div>

          {/* Tabel Riwayat */}
          <div className="overflow-x-auto">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <span className="text-4xl block">📦</span>
                <p className="text-sm font-bold text-slate-400">Tidak ada riwayat cache yang terdaftar.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal Dibuat</th>
                    <th className="py-3 px-4">Model AI</th>
                    <th className="py-3 px-4">Bahan Komposisi</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  <AnimatePresence mode="popLayout">
                    {filteredItems.map((item) => (
                      <motion.tr
                        key={item.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -20 }}
                        transition={{ duration: 0.2 }}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all group cursor-pointer"
                        onClick={() => setSelectedItemDetail(item)}
                      >
                        {/* Tanggal */}
                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {new Date(item.createdAt).toLocaleString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>

                        {/* Model */}
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase ${
                            item.modelUsed.includes("gemini")
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : item.modelUsed.startsWith("ep-")
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                          }`}>
                            {item.modelUsed}
                          </span>
                        </td>

                        {/* Ingredients */}
                        <td className="py-3.5 px-4 text-sm font-medium text-slate-700 dark:text-slate-300 max-w-md truncate">
                          {item.ingredientsInput}
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setTargetIdToDelete(item.id);
                              setDeleteConfirmType("single");
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Hapus Cache"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>

      {/* MODAL DETAIL CACHE */}
      <AnimatePresence>
        {selectedItemDetail && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-slate-900 max-w-2xl w-full rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-slate-100">🔍 Detail Cache AI-Hybrid</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Model: <span className="font-mono font-bold text-violet-600 dark:text-violet-400">{selectedItemDetail.modelUsed}</span></p>
                </div>
                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Ingredients Input */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bahan/Komposisi Input</h4>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl font-medium text-sm text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800">
                    {selectedItemDetail.ingredientsInput}
                  </div>
                </div>

                {/* AI Response Output */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hasil Analisis AI (Respons JSON)</h4>
                  <pre className="p-4 bg-slate-950 rounded-xl font-mono text-xs text-emerald-400 border border-slate-800 overflow-x-auto max-h-[300px] custom-scrollbar">
                    {JSON.stringify(selectedItemDetail.aiResponse, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 dark:bg-slate-800/30 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setSelectedItemDetail(null)}
                  className="px-5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-colors"
                >
                  Tutup Detail
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM DELETE MODAL */}
      <AnimatePresence>
        {deleteConfirmType && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-800 space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center text-2xl mx-auto">
                ⚠️
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                  {deleteConfirmType === "single" && "Hapus Cache Spesifik?"}
                  {deleteConfirmType === "model" && "Hapus Cache Model AI?"}
                  {deleteConfirmType === "all" && "Bersihkan Semua Cache?"}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {deleteConfirmType === "single" && "Hasil analisis untuk komposisi bahan ini akan dihapus dari cache database secara permanen."}
                  {deleteConfirmType === "model" && `Semua cache yang diproses oleh model ${selectedModelFilter} akan dihapus.`}
                  {deleteConfirmType === "all" && "Seluruh riwayat cache pencarian AI-Hybrid akan dikosongkan. Pencarian berikutnya akan memaksa LLM API baru."}
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setDeleteConfirmType(null);
                    setTargetIdToDelete(null);
                  }}
                  disabled={isActionLoading}
                  className="flex-1 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  onClick={executeDelete}
                  disabled={isActionLoading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {isActionLoading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    "Hapus"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
