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

export default function HistoryPage() {
  const router = useRouter();
  const [histories, setHistories] = useState<AnalysisHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    } catch (error) {
      alert("Terjadi kesalahan.");
    }
  };

  const deleteHistory = async (id: string) => {
    if (!confirm("Hapus riwayat ini?")) return;
    try {
      const res = await fetch(`/api/analyze/history?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setHistories(prev => prev.filter(h => h.id !== id));
      } else {
        alert("Gagal menghapus riwayat");
      }
    } catch (error) {
      alert("Terjadi kesalahan.");
    }
  };

  const analyzeAgain = (history: AnalysisHistory) => {
    sessionStorage.setItem("lastAnalysisProduct", history.productName || "");
    sessionStorage.setItem("lastAnalysisIngredients", history.ingredientsInput);
    sessionStorage.setItem("lastAnalysisType", history.productType);
    router.push("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  const savedHistories = histories.filter(h => h.isSaved);
  const recentHistories = histories.filter(h => !h.isSaved);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white dark:bg-slate-800 rounded-full shadow hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-700 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Riwayat Analisis</h1>
        </div>

        {/* Tab Disimpan */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <span>⭐</span> Disimpan ({savedHistories.length}/5)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {savedHistories.map(h => (
                <HistoryCard 
                  key={h.id} 
                  history={h} 
                  onToggleSave={() => toggleSave(h.id, h.isSaved)} 
                  onDelete={() => deleteHistory(h.id)} 
                  onAnalyze={() => analyzeAgain(h)}
                />
              ))}
            </AnimatePresence>
            {savedHistories.length === 0 && (
              <p className="text-sm text-slate-500 italic col-span-2">Belum ada riwayat yang disimpan.</p>
            )}
          </div>
        </section>

        {/* Tab Terbaru (Otomatis) */}
        <section>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            <span>🕒</span> Riwayat Terbaru (Otomatis)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {recentHistories.map(h => (
                <HistoryCard 
                  key={h.id} 
                  history={h} 
                  onToggleSave={() => toggleSave(h.id, h.isSaved)} 
                  onDelete={() => deleteHistory(h.id)} 
                  onAnalyze={() => analyzeAgain(h)}
                />
              ))}
            </AnimatePresence>
            {recentHistories.length === 0 && (
              <p className="text-sm text-slate-500 italic col-span-2">Belum ada riwayat terbaru.</p>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

function HistoryCard({ history, onToggleSave, onDelete, onAnalyze }: { history: AnalysisHistory, onToggleSave: () => void, onDelete: () => void, onAnalyze: () => void }) {
  const date = new Date(history.createdAt).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' });
  
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} 
      animate={{ opacity: 1, scale: 1 }} 
      exit={{ opacity: 0, scale: 0.9 }}
      className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-slate-900 dark:text-slate-100">{history.productName || "Tanpa Nama"}</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{date} • {history.productType}</p>
        </div>
        <button onClick={onToggleSave} className="text-xl hover:scale-110 transition" title={history.isSaved ? "Hapus dari Disimpan" : "Simpan Riwayat"}>
          {history.isSaved ? "⭐" : "☆"}
        </button>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 text-center bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Match</p>
          <p className={`font-black text-lg ${history.matchScore >= 75 ? 'text-emerald-600' : history.matchScore >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
            {history.matchScore}
          </p>
        </div>
        <div className="flex-1 text-center bg-slate-50 dark:bg-slate-800 rounded-xl p-2">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Safety</p>
          <p className={`font-black text-lg ${history.safetyScore >= 80 ? 'text-emerald-600' : history.safetyScore >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
            {history.safetyScore}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <button onClick={onAnalyze} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors">
          Analisis Ulang
        </button>
        <button onClick={onDelete} className="px-3 py-2 bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 rounded-xl transition-colors" title="Hapus Permanen">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </motion.div>
  );
}
