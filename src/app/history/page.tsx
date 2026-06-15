"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ProductType } from "@prisma/client";

interface AnalysisHistory {
  id: string;
  productName: string | null;
  productType: ProductType;
  ingredientsInput: string;
  matchScore: number;
  safetyScore: number;
  isSaved: boolean;
  createdAt: string;
}

const TYPE_INFO: Record<string, { label: string; emoji: string; gradient: string }> = {
  FACEWASH: { label: "Face Wash", emoji: "🫧", gradient: "from-teal-400 to-cyan-400" },
  MOISTURIZER: { label: "Moisturizer", emoji: "💧", gradient: "from-indigo-400 to-violet-400" },
  SUNSCREEN: { label: "Sunscreen", emoji: "☀️", gradient: "from-amber-400 to-orange-400" },
};

// --- KOMPONEN KARTU ---
function HistoryCard({ history, onToggleSave, onDelete, onAnalyze }: {
  history: AnalysisHistory;
  onToggleSave: () => void;
  onDelete: () => void;
  onAnalyze: () => void;
}) {
  const date = new Date(history.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
  const time = new Date(history.createdAt).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' });
  const typeInfo = TYPE_INFO[history.productType] || { label: history.productType, emoji: "🧴", gradient: "from-slate-400 to-slate-500" };

  const scoreColor = (s: number) => s >= 80 ? "text-emerald-600" : s >= 60 ? "text-amber-500" : "text-rose-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: -4 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="glass-card glass-card-hover rounded-2xl relative overflow-hidden border border-slate-200/80 group"
    >
      {/* Gradient accent bar atas — warna sesuai tipe produk */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${typeInfo.gradient} opacity-50 group-hover:opacity-100 transition-opacity`} />

      <div className="p-3 sm:p-4 md:p-5">
        {/* Row 1: Info + Bookmark */}
        <div className="flex justify-between items-start mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-sm text-gray-900 truncate leading-tight">
              {history.productName || "Produk Tanpa Nama"}
            </h3>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                {typeInfo.emoji} {typeInfo.label}
              </span>
              <span className="text-[10px] text-slate-400">{date}, {time}</span>
            </div>
          </div>

          {/* Tombol Simpan — jelas sebagai bookmark */}
          <button
            onClick={onToggleSave}
            className={`shrink-0 ml-2 flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all active:scale-95 border ${
              history.isSaved
                ? "bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100"
                : "bg-white border-slate-200 text-slate-400 hover:border-teal-200 hover:text-teal-500 hover:bg-teal-50"
            }`}
            title={history.isSaved ? "Hapus dari Disimpan" : "Simpan Riwayat"}
          >
            {history.isSaved ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" /></svg>
                Tersimpan
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                Simpan
              </>
            )}
          </button>
        </div>

        {/* Row 2: Scores */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3">
          <div className="bg-slate-50 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-2 sm:px-3 text-center border border-slate-100">
            <p className="text-[9px] uppercase font-semibold text-slate-400 tracking-wide">Kecocokan</p>
            <p className={`font-black text-lg sm:text-xl leading-tight ${scoreColor(history.matchScore)}`}>{history.matchScore}</p>
          </div>
          <div className="bg-slate-50 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-2 sm:px-3 text-center border border-slate-100">
            <p className="text-[9px] uppercase font-semibold text-slate-400 tracking-wide">Keamanan</p>
            <p className={`font-black text-lg sm:text-xl leading-tight ${scoreColor(history.safetyScore)}`}>{history.safetyScore}</p>
          </div>
        </div>

        {/* Row 3: Actions */}
        <div className="flex gap-2">
          <button
            onClick={onAnalyze}
            className="flex-1 py-2.5 gradient-btn rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 btn-press"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            <span className="relative z-10">Analisis Ulang</span>
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2.5 bg-white border border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95 btn-press"
            title="Hapus Permanen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// --- HALAMAN UTAMA ---
export default function HistoryPage() {
  const router = useRouter();
  const [histories, setHistories] = useState<AnalysisHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"recent" | "saved">("recent");

  useEffect(() => {
    fetchHistories();
  }, []);

  const fetchHistories = async () => {
    try {
      const res = await fetch("/api/analyze/history");
      if (res.ok) {
        const data = await res.json();
        setHistories(data);
      }
    } catch (error) {
      console.error("Gagal mengambil history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSave = async (id: string, isSaved: boolean) => {
    try {
      const res = await fetch("/api/analyze/history", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyId: id, isSaved: !isSaved })
      });
      if (res.ok) {
        setHistories(prev => prev.map(h => h.id === id ? { ...h, isSaved: !isSaved } : h));
      } else {
        const err = await res.json();
        alert(err.message || "Gagal menyimpan riwayat");
      }
    } catch {
      alert("Terjadi kesalahan.");
    }
  };

  const deleteHistory = async (id: string) => {
    if (!confirm("Hapus riwayat ini?")) return;
    try {
      const res = await fetch(`/api/analyze/history?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistories(prev => prev.filter(h => h.id !== id));
      } else {
        alert("Gagal menghapus riwayat");
      }
    } catch {
      alert("Terjadi kesalahan.");
    }
  };

  const analyzeAgain = (history: AnalysisHistory) => {
    sessionStorage.setItem("lastAnalysisProduct", history.productName || "");
    sessionStorage.setItem("lastAnalysisIngredients", history.ingredientsInput);
    sessionStorage.setItem("lastAnalysisType", history.productType);
    sessionStorage.setItem("autoOpenAnalyzer", "true");
    router.push("/dashboard");
  };

  const savedHistories = histories.filter(h => h.isSaved);
  const recentHistories = histories.filter(h => !h.isSaved);
  const displayedHistories = activeTab === "saved" ? savedHistories : recentHistories;

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 flex items-center justify-center relative">
        <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <div className="w-10 h-10 border-[3px] border-slate-200 border-t-teal-500 rounded-full animate-spin" />
          <p className="text-xs font-medium text-slate-400">Memuat riwayat...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen p-3 sm:p-4 md:p-8 font-sans relative">
      {/* Background — sama persis seperti Dashboard */}
      <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <div className="ambient-blob ambient-blob-3" />

      <div className="max-w-3xl mx-auto space-y-6 relative z-10">

        {/* Header — glass card seperti Dashboard */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="glass-card rounded-3xl p-5 relative overflow-hidden border border-slate-200/50"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400" />

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all border bg-white border-slate-200 hover:bg-slate-50 hover:border-teal-200 text-teal-600 btn-press shrink-0"
            >
              ←
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">Riwayat <span className="gradient-text">Analisis</span></h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{histories.length} total riwayat tersimpan</p>
            </div>
          </div>
        </motion.header>

        {/* Tab Switcher — glass card */}
        <div className="glass-card rounded-2xl p-1.5 flex border border-slate-200/50">
          <button
            onClick={() => setActiveTab("recent")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "recent"
                ? "gradient-btn shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className={activeTab === "recent" ? "relative z-10" : ""}>🕒</span>
            <span className={activeTab === "recent" ? "relative z-10" : ""}>Terbaru ({recentHistories.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "saved"
                ? "gradient-btn shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className={activeTab === "saved" ? "relative z-10" : ""}>📌</span>
            <span className={activeTab === "saved" ? "relative z-10" : ""}>Disimpan ({savedHistories.length}/5)</span>
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {displayedHistories.length > 0 ? (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {displayedHistories.map((h) => (
                <HistoryCard
                  key={h.id}
                  history={h}
                  onToggleSave={() => toggleSave(h.id, h.isSaved)}
                  onDelete={() => deleteHistory(h.id)}
                  onAnalyze={() => analyzeAgain(h)}
                />
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={`empty-${activeTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-3xl border border-slate-200/50 py-16 text-center"
            >
              <p className="text-4xl mb-4">{activeTab === "saved" ? "📌" : "🔬"}</p>
              <p className="text-sm font-semibold text-slate-500">
                {activeTab === "saved" ? "Belum ada riwayat yang disimpan" : "Belum ada riwayat analisis"}
              </p>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
                {activeTab === "saved"
                  ? "Tekan tombol \"Simpan\" pada kartu riwayat untuk menyimpannya di sini."
                  : "Mulai analisis produk pertamamu di Dashboard."}
              </p>
              {activeTab === "recent" && (
                <Link href="/dashboard" className="inline-flex items-center gap-2 mt-6 gradient-btn px-6 py-2.5 rounded-xl text-xs font-bold btn-press">
                  <span className="relative z-10">Mulai Analisis →</span>
                </Link>
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}
