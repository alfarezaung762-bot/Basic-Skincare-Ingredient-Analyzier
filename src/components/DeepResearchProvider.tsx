"use client";

import React, { createContext, useContext, useState, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type ResearchEngine = {
  provider: "gemini" | "byteplus" | "openrouter";
  model: string;
  useReasoning?: boolean;
};

interface DeepResearchContextType {
  isResearching: boolean;
  researchProgress: any;
  researchLog: any[];
  researchSummary: any;
  showResearchModal: boolean;
  setShowResearchModal: (show: boolean) => void;
  startResearch: (names: string[], adminName: string, adminRole: string, engine: ResearchEngine, useLiveSearch: boolean) => Promise<void>;
  cancelResearch: () => void;
}

const DeepResearchContext = createContext<DeepResearchContextType | undefined>(undefined);

export function DeepResearchProvider({ children }: { children: ReactNode }) {
  const [isResearching, setIsResearching] = useState(false);
  const [researchProgress, setResearchProgress] = useState<any>(null);
  const [researchLog, setResearchLog] = useState<any[]>([]);
  const [researchSummary, setResearchSummary] = useState<any>(null);
  const [showResearchModal, setShowResearchModal] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelResearch = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsResearching(false);
    // Keep modal open to show partial results
  };

  const startResearch = async (names: string[], adminName: string, adminRole: string, engine: ResearchEngine, useLiveSearch: boolean = false) => {
    if (isResearching) return;

    setIsResearching(true);
    setShowResearchModal(true);
    setResearchLog([]);
    setResearchSummary(null);
    setResearchProgress(null);

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const res = await fetch("/api/admin/deep-research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names, adminName, adminRole, provider: engine.provider, model: engine.model, useLiveSearch, useReasoning: engine.useReasoning }),
        signal: controller.signal,
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
                // Gunakan skippedDetails untuk info lebih lengkap
                const details = event.skippedDetails || [];
                setResearchLog(prev => [...prev, ...details.map((d: any) => ({
                  name: d.name,
                  status: "skipped",
                  error: d.matchType === 'name'
                    ? `Sudah terdaftar sebagai bahan INCI: ${d.existingInci}`
                    : `Sudah terdaftar sebagai alias dari INCI: ${d.existingInci}`,
                  conflictInci: d.existingInci,
                }))]);
              }
            } else if (event.type === "alias_conflict") {
              // Tambahkan log konflik alias (bahan tetap disimpan tapi beberapa alias dibuang)
              setResearchLog(prev => [...prev, {
                name: event.name,
                status: "warning",
                error: `${event.conflicts.length} alias dibuang: ${event.conflicts.map((c: any) => `"${c.alias}" → milik ${c.existingInci}`).join("; ")}`,
                conflictInci: event.conflicts[0]?.existingInci,
              }]);
            } else if (event.type === "alias_update") {
              // Bahan terdeteksi sebagai alias — tampilkan info dan tandai untuk removal dari tabel report
              setResearchLog(prev => [...prev, {
                name: event.name,
                status: "alias_added",
                error: event.message,
                conflictInci: event.existingInci,
              }]);
            } else if (event.type === "progress") {
              setResearchProgress(event);
              if (event.status !== "researching") {
                setResearchLog(prev => [...prev, {
                  name: event.name,
                  status: event.status,
                  error: event.error || event.reason,
                  aliasCount: event.aliasCount,
                  model: event.model,
                  conflictInci: event.conflictInci,
                  conflictType: event.conflictType,
                  triedModels: event.triedModels,
                  usedExternalSource: event.usedExternalSource,
                  sumberYangDigunakan: event.sumberYangDigunakan,
                }]);
              }
            } else if (event.type === "complete") {
              setResearchSummary(event.summary);
            }
          } catch (e) { /* skip invalid JSON */ }
        }
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Deep Research dibatalkan oleh user.");
        // Don't overwrite summary — partial results may already be logged
        if (!researchSummary) {
          setResearchSummary({ 
            success: researchLog.filter(l => l.status === "done").length, 
            failed: researchLog.filter(l => l.status === "error").length, 
            skipped: 0, totalAliasesFound: 0, totalReportsCleaned: 0,
            cancelled: true,
          });
        }
      } else {
        console.error("Deep Research Error:", error);
        setResearchSummary({ success: 0, failed: names.length, skipped: 0, totalAliasesFound: 0, totalReportsCleaned: 0 });
      }
    } finally {
      setIsResearching(false);
      abortControllerRef.current = null;
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
        cancelResearch,
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
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-slate-100 dark:border-slate-700 max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-start mb-5 shrink-0">
                <div>
                  <h4 className="font-black text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    🔬 Deep Research AI
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-1 block">
                    {isResearching ? "Sedang menganalisis..." : researchSummary ? "Selesai!" : "Mempersiapkan..."}
                  </span>
                </div>
                {!isResearching ? (
                  <button onClick={() => setShowResearchModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors font-bold" title="Tutup">✕</button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={cancelResearch} className="px-3 py-1.5 text-[10px] font-bold bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/70 rounded-lg transition-colors" title="Batalkan analisis">
                      ⏹ Batalkan
                    </button>
                    <button onClick={() => setShowResearchModal(false)} className="px-3 py-1.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Proses tetap berjalan di latar belakang">
                      ⬇️ Minimize
                    </button>
                  </div>
                )}
              </div>

              {researchProgress && (
                <div className="mb-4 shrink-0">
                  <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                    <span>{researchProgress.current}/{researchProgress.total} bahan</span>
                    <span className="text-slate-400 dark:text-slate-500">{isResearching ? `⏳ ~${(researchProgress.total - researchProgress.current) * 10} detik lagi` : "✅ Selesai"}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700">
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
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl border border-blue-100 dark:border-blue-800 flex items-center gap-3 shrink-0">
                  <div className="w-5 h-5 border-2 border-blue-200 dark:border-blue-700 border-t-blue-600 rounded-full animate-spin shrink-0"></div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 dark:text-blue-200 capitalize">{researchProgress.name}</p>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">Menganalisis dengan AI...</p>
                  </div>
                </div>
              )}

              <div className="overflow-y-auto flex-1 space-y-2 pr-1 mb-4">
                {researchLog.map((log, idx) => (
                  <div key={idx} className={`p-3 rounded-xl border text-xs font-bold ${
                    log.status === "done" ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" :
                    log.status === "error" ? "bg-red-50 dark:bg-red-950/40 border-red-100 dark:border-red-800 text-red-700 dark:text-red-300" :
                    log.status === "warning" ? "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300" :
                    log.status === "alias_added" ? "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300" :
                    "bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                  }`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="shrink-0">{log.status === "done" ? "✅" : log.status === "error" ? "❌" : log.status === "warning" ? "⚠️" : log.status === "alias_added" ? "🔗" : "⏭️"}</span>
                        <span className="capitalize truncate">{log.name}</span>
                        {log.usedExternalSource && (
                          <span className="bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm">SUMBER LUAR</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {log.aliasCount !== undefined && log.aliasCount > 0 && (
                          <span className="bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border dark:border-slate-700 text-[9px]">+{log.aliasCount} alias</span>
                        )}
                        {log.model && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500">{log.model.split("-").slice(0,3).join("-")}</span>
                        )}
                      </div>
                    </div>
                    {/* Detail konflik/error di bawah nama */}
                    {log.error && (
                      <div className={`mt-1.5 text-[10px] font-medium leading-relaxed pl-6 break-words whitespace-pre-wrap max-h-40 overflow-y-auto pr-2 ${
                        log.status === "warning" ? "text-amber-600 dark:text-amber-400" :
                        log.status === "skipped" ? "text-slate-500 dark:text-slate-400" :
                        log.status === "alias_added" ? "text-blue-600 dark:text-blue-400" :
                        log.status === "done" ? "text-emerald-600 dark:text-emerald-400" :
                        "text-red-500 dark:text-red-400"
                      }`}>
                        {log.error}
                      </div>
                    )}
                    {/* Accordion untuk sumber_yang_digunakan */}
                    {log.sumberYangDigunakan && (
                      <details className="mt-2 ml-6 group">
                        <summary className="text-[10px] font-bold text-slate-500 dark:text-slate-400 cursor-pointer list-none flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 w-fit">
                          <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          Lihat Sumber Referensi
                        </summary>
                        <div className="mt-2 p-2.5 bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-medium text-slate-600 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">
                          {log.sumberYangDigunakan}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
                {researchLog.length === 0 && isResearching && (
                  <div className="text-center py-8 opacity-50">
                    <div className="w-8 h-8 border-3 border-slate-200 dark:border-slate-700 border-t-slate-600 dark:border-t-slate-300 rounded-full animate-spin mx-auto mb-3"></div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Memulai analisis...</p>
                  </div>
                )}
              </div>

              {researchSummary && (
                <div className="shrink-0 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 text-center">
                      <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{researchSummary.success}</p>
                      <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Berhasil</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-xl border border-red-100 dark:border-red-800 text-center">
                      <p className="text-2xl font-black text-red-600 dark:text-red-400">{researchSummary.failed}</p>
                      <p className="text-[9px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest">Gagal</p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800 text-center">
                      <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{researchSummary.totalAliasesFound}</p>
                      <p className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Alias</p>
                    </div>
                  </div>
                  {researchSummary.totalReportsCleaned > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-xl border border-amber-100 dark:border-amber-800 text-center">
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">🧹 {researchSummary.totalReportsCleaned} laporan otomatis dibersihkan</p>
                    </div>
                  )}
                  <button 
                    onClick={() => setShowResearchModal(false)} 
                    className="w-full py-3 bg-slate-900 dark:bg-slate-100 hover:bg-black dark:hover:bg-white text-white dark:text-slate-900 text-sm font-bold rounded-xl transition-all active:scale-95"
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
