"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ResearchEngine = {
  provider: "gemini" | "byteplus" | "deepseek";
  model: string;
};

interface DeepResearchContextType {
  isResearching: boolean;
  researchProgress: any;
  researchLog: any[];
  researchSummary: any;
  showResearchModal: boolean;
  setShowResearchModal: (show: boolean) => void;
  startResearch: (names: string[], adminName: string, adminRole: string, engine: ResearchEngine) => Promise<void>;
}

const DeepResearchContext = createContext<DeepResearchContextType | undefined>(undefined);

export function DeepResearchProvider({ children }: { children: ReactNode }) {
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState<any>(null);
  const [researchLog, setResearchLog] = useState<any[]>([]);
  const [researchSummary, setResearchSummary] = useState<any>(null);
  const [showResearchModal, setShowResearchModal] = useState(false);

  const startResearch = async (names: string[], adminName: string, adminRole: string, engine: ResearchEngine) => {
    if (isResearching) return;

    setIsResearching(true);
    setShowResearchModal(true);
    setResearchLog([]);
    setResearchSummary(null);
    setResearchProgress(null);

    try {
      const res = await fetch("/api/admin/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names, adminName, adminRole, provider: engine.provider, model: engine.model }),
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
      setResearchSummary({ success: 0, failed: names.length, skipped: 0, totalAliasesFound: 0, totalReportsCleaned: 0 });
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <DeepResearchContext.Provider
      value={{
        isResearching,
        researchProgress,
        researchLog,
        researchSummary,
        showResearchModal,
        setShowResearchModal,
        startResearch,
      }}
    >
      {children}

      {/* MODAL DEEP RESEARCH PROGRESS */}
      <AnimatePresence>
        {showResearchModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-100 max-h-[85vh] flex flex-col"
            >
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

              {isResearching && researchProgress?.status === "researching" && (
                <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3 shrink-0">
                  <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 capitalize">{researchProgress.name}</p>
                    <p className="text-[10px] text-blue-600 font-medium">Menganalisis dengan AI...</p>
                  </div>
                </div>
              )}

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
                    Tutup
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING MINI-INDICATOR */}
      {isResearching && !showResearchModal && (
        <button 
          onClick={() => setShowResearchModal(true)}
          className="fixed bottom-6 right-6 z-[900] bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 transition-all active:scale-95 animate-pulse"
        >
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          <div className="text-left">
            <p className="text-xs font-bold">🔬 Deep Research</p>
            <p className="text-[10px] opacity-80">{researchProgress ? `${researchProgress.current}/${researchProgress.total} bahan` : "Memulai..."}</p>
          </div>
        </button>
      )}
    </DeepResearchContext.Provider>
  );
}

export function useDeepResearch() {
  const context = useContext(DeepResearchContext);
  if (context === undefined) {
    throw new Error("useDeepResearch must be used within a DeepResearchProvider");
  }
  return context;
}
