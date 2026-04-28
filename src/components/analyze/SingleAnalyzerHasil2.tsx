// src/components/analyze/SingleAnalyzerHasil2.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion"; // Pastikan framer-motion diimpor untuk animasi pop-up

// --- TIPE DATA EXPORT ---
export interface IngredientDb {
  name: string;
  type: string;
  functionalCategory: string;
  benefits: string;
  comedogenicRating: number;
  safeForPregnancy: boolean;
  safeForSensitive: boolean;
  isKeyActive?: boolean;
  strengthLevel?: number;
}

export interface EngineResult {
  matchScore: number;
  matchLabel: string;
  matchFlags: string[];
  safetyScore: number;
  safetyLabel: string;
  safetyFlags: string[];
  detectedIngredients: IngredientDb[];
  unknownIngredients: string[];
  primaryProductFocus?: string | null;
  secondaryProductFocuses?: string[];
}

export interface AiAnalysis {
  aiUnknownAnalysis: string;
  recommendations: string[];
}

export interface FullAnalysisResponse {
  engineResult: EngineResult;
  analysis: AiAnalysis;
  historyId: string;
}

// --- KOMPONEN KARTU BAHAN DETAIL ---
const IngredientCard = ({ ing }: { ing: IngredientDb }) => {
  const getStyle = () => {
    if (ing.type === "TOXIC") return "bg-rose-50 text-rose-900 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
    if (ing.type === "HARSH") return "bg-orange-50 text-orange-900 border-orange-200";
    if (ing.isKeyActive) return "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
    if (ing.type === "BUFFER") return "bg-blue-50 border-blue-200 text-blue-900";
    return "bg-slate-50 border-slate-200 text-slate-900";
  };

  const isPulsing = ing.type === "TOXIC" || ing.type === "HARSH" || ing.isKeyActive;
  const getPulseColor = () => {
    if (ing.type === "TOXIC") return "bg-rose-500";
    if (ing.type === "HARSH") return "bg-orange-500";
    return "bg-emerald-500"; 
  };

  let strengthBadge = null;
  if (ing.type === "HARSH" && ing.strengthLevel) {
    strengthBadge = <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-orange-100 text-orange-800 rounded-md border border-orange-200 ml-2">🔥 Lvl {ing.strengthLevel}</span>;
  } else if (ing.type === "BUFFER" && ing.strengthLevel) {
    strengthBadge = <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-blue-100 text-blue-800 rounded-md border border-blue-200 ml-2">💧 Lvl {ing.strengthLevel}</span>;
  }

  return (
    <div className={`p-5 rounded-2xl border ${getStyle()} transition-all hover:-translate-y-1 relative`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          {isPulsing && (
            <span className="relative flex h-3 w-3 shrink-0">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${getPulseColor()}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${getPulseColor()}`}></span>
            </span>
          )}
          <h4 className="font-bold capitalize text-base leading-tight">{ing.name}</h4>
        </div>
        <div className="flex items-center shrink-0">
          <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-white rounded-md border border-inherit opacity-80 shadow-sm">
            {ing.isKeyActive ? "BINTANG UTAMA" : ing.type}
          </span>
          {strengthBadge}
        </div>
      </div>
      <p className="text-xs font-medium opacity-80 mb-5 leading-relaxed">{ing.benefits}</p>
      
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white/60 p-2 rounded-lg text-center border border-white">
          <span className="block text-[9px] font-bold uppercase opacity-60">Komedogenik</span>
          <span className="text-sm font-black">{ing.comedogenicRating}/5</span>
        </div>
        <div className={`p-2 rounded-lg text-center border ${ing.safeForPregnancy ? "bg-emerald-100/50 border-emerald-100/50" : "bg-rose-200/50 text-rose-800 border-rose-200/50"}`}>
          <span className="block text-[9px] font-bold uppercase opacity-60">Bumil</span>
          <span className="text-sm font-black">{ing.safeForPregnancy ? "✔" : "❌"}</span>
        </div>
        <div className={`p-2 rounded-lg text-center border ${ing.safeForSensitive ? "bg-emerald-100/50 border-emerald-100/50" : "bg-rose-200/50 text-rose-800 border-rose-200/50"}`}>
          <span className="block text-[9px] font-bold uppercase opacity-60">Sensitif</span>
          <span className="text-sm font-black">{ing.safeForSensitive ? "✔" : "❌"}</span>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONEN UTAMA (BAGIAN BAWAH) ---
export default function SingleAnalyzerHasil2({ result }: { result: FullAnalysisResponse }) {
  const [showAllGoodIngredients, setShowAllGoodIngredients] = useState(false);
  const [showUnknownIngredients, setShowUnknownIngredients] = useState(false);
  
  // State untuk Pop-up Detail Bahan & Laporan (Klik)
  const [activeIngredient, setActiveIngredient] = useState<IngredientDb | null>(null);
  const [reportReason, setReportReason] = useState(""); // <-- TAMBAHAN BARU: State untuk input teks keluhan
  const [isReporting, setIsReporting] = useState(false);

  // Mencegah auto-report menembak berkali-kali
  const hasAutoReported = useRef(false);

  // 1. LOGIKA AUTO-REPORT BAHAN ASING (Sistem Otomatis)
  useEffect(() => {
    if (!hasAutoReported.current && result.engineResult.unknownIngredients.length > 0) {
      hasAutoReported.current = true;
      
      // Kirim laporan ke API secara diam-diam di background
      result.engineResult.unknownIngredients.forEach((ingName) => {
        fetch('/api/admin/reportbahan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: ingName }) // Tidak pakai type="mismatch"
        }).catch(err => console.error("Gagal auto-report:", err));
      });
    }
  }, [result]);

  // Fungsi untuk menutup modal dan membersihkan form laporan
  const closeModal = () => {
    setActiveIngredient(null);
    setReportReason("");
  };

  // 2. LOGIKA LAPORKAN KETIDAKSESUAIAN (Pengguna Manual)
  const handleReportMismatch = async (ingName: string) => {
    if (!reportReason.trim()) return; // Keamanan tambahan agar tidak mengirim string kosong

    setIsReporting(true);
    try {
      await fetch('/api/admin/reportbahan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: "mismatch", // <-- TAMBAHAN BARU: Agar masuk ke tabel IngredientReport
          ingredientName: ingName, 
          reason: reportReason 
        })
      });
      alert(`Terima kasih! Ketidaksesuaian pada bahan "${ingName}" telah diteruskan ke tim ahli kami.`);
      closeModal();
    } catch (error) {
      alert("Maaf, terjadi kesalahan saat mengirim laporan.");
    } finally {
      setIsReporting(false);
    }
  };

  // Logika Penyortiran Bahan
  const orderMap: Record<string, number> = { TOXIC: 1, HARSH: 2, BUFFER: 3, BASIC: 4 };
  const sortedDetectedIngredients = result.engineResult.detectedIngredients.sort((a, b) => {
    if (a.isKeyActive && !b.isKeyActive) return -1;
    if (!a.isKeyActive && b.isKeyActive) return 1;
    return (orderMap[a.type] || 99) - (orderMap[b.type] || 99);
  });

  const riskIngredients = sortedDetectedIngredients.filter(i => i.type === "HARSH" || i.type === "TOXIC");
  const goodIngredients = sortedDetectedIngredients.filter(i => i.isKeyActive || i.type === "BUFFER");
  const visibleGoodIngredients = showAllGoodIngredients ? goodIngredients : goodIngredients.slice(0, 4);

  return (
    <div className="space-y-6">

      {/* POP-UP MODAL UNTUK DETAIL BAHAN TERDETEKSI */}
      {activeIngredient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={closeModal}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-6 max-w-sm w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Mencegah klik di dalam modal menutup modal
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-black text-lg text-slate-900 capitalize">{activeIngredient.name}</h4>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200 mt-1 inline-block">
                  {activeIngredient.functionalCategory.replace(/_/g, ' ')}
                </span>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-full transition-colors font-bold">
                ✕
              </button>
            </div>
            
            <p className="text-sm font-medium text-slate-600 leading-relaxed mb-4">
              {activeIngredient.benefits || "Penjelasan belum tersedia untuk bahan ini."}
            </p>

            {/* TAMBAHAN BARU: TEXTAREA KELUHAN */}
            <div className="mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <label htmlFor="reportReason" className="block text-[10px] font-bold text-slate-900 uppercase tracking-widest mb-2">
                Detail Ketidaksesuaian <span className="text-rose-500">*</span>
              </label>
              <textarea 
                id="reportReason"
                rows={3}
                placeholder="Contoh: Bahan ini seharusnya tidak aman untuk ibu hamil..."
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none text-sm font-medium focus:ring-2 focus:ring-rose-400 bg-white resize-none transition-all text-slate-900 placeholder-slate-400"
              />
            </div>
            
            <button
              onClick={() => handleReportMismatch(activeIngredient.name)}
              disabled={isReporting || !reportReason.trim()}
              className="w-full py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl border border-rose-200 transition-colors flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isReporting ? "Mengirim Laporan..." : "Laporkan Ketidaksesuaian Data 🚩"}
            </button>
          </motion.div>
        </div>
      )}

      {/* 1. KESIMPULAN FOKUS PRODUK V3 */}
      {(result.engineResult.primaryProductFocus || (result.engineResult.secondaryProductFocuses && result.engineResult.secondaryProductFocuses.length > 0)) && (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
          <h3 className="text-sm font-black text-slate-400 border-b border-slate-100 pb-4 mb-6 text-center uppercase tracking-widest">
            Profil Formulasi Produk
          </h3>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-200 rounded-full blur-3xl -ml-10 -mt-10 opacity-50"></div>
              <span className="text-3xl mb-3 relative z-10">🎯</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Target Utama Formulasi</span>
              <span className="text-lg font-black text-slate-800 relative z-10">
                {result.engineResult.primaryProductFocus || "Tidak Spesifik (Basic Care)"}
              </span>
            </div>

            {result.engineResult.secondaryProductFocuses && result.engineResult.secondaryProductFocuses.length > 0 && (
              <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-200 rounded-full blur-3xl -mr-10 -mb-10 opacity-50"></div>
                <div className="flex items-center gap-2 mb-4 relative z-10">
                  <span className="text-xl">🎁</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Manfaat Tambahan (Sekunder)</span>
                </div>
                <div className="flex flex-wrap gap-2 relative z-10">
                  {result.engineResult.secondaryProductFocuses.map((focus, idx) => (
                    <span key={idx} className="bg-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                      {focus}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. BAHAN TERDETEKSI & BAHAN ASING */}
      {(sortedDetectedIngredients.length > 0 || result.engineResult.unknownIngredients.length > 0) && (
        <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              Bahan Terdeteksi Sistem <span className="text-[10px] font-medium text-slate-400 bg-white px-2 py-1 rounded border border-slate-200 hidden sm:inline-block">Klik bahan untuk detail</span>
            </h3>
            <span className="bg-white text-slate-600 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              Total: {sortedDetectedIngredients.length + result.engineResult.unknownIngredients.length} Bahan
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {sortedDetectedIngredients.map((ing, idx) => {
              let style = "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-100";
              if (ing.isKeyActive) style = "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200";
              if (ing.type === "TOXIC") style = "bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200";
              if (ing.type === "HARSH") style = "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200";
              if (ing.type === "BUFFER") style = "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200";
              
              return (
                <button 
                  key={idx} 
                  onClick={() => setActiveIngredient(ing)} // <-- Membuka modal saat diklik
                  className={`px-3 py-1.5 border rounded-lg text-xs font-bold capitalize shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${style}`}
                >
                  {ing.name}
                </button>
              );
            })}
          </div>

          {/* INTEGRASI BAHAN ASING SEBAGAI DROPDOWN NOTIFIKASI */}
          {result.engineResult.unknownIngredients.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <button 
                onClick={() => setShowUnknownIngredients(!showUnknownIngredients)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-300 rounded-xl shadow-sm text-amber-800 text-sm font-bold hover:bg-amber-50 transition-colors w-full sm:w-auto"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span>Bahan Asing Ditemukan ({result.engineResult.unknownIngredients.length})</span>
                <span className="ml-auto sm:ml-2 text-amber-500">{showUnknownIngredients ? '▲' : '▼'}</span>
              </button>

              {showUnknownIngredients && (
                <div className="mt-4 p-5 bg-white rounded-2xl border border-amber-200 shadow-sm animate-in slide-in-from-top-2">
                  
                  {/* Tampilan Baru yang lebih menenangkan & Otomatis */}
                  <div className="bg-amber-50/50 p-4 rounded-xl text-sm text-amber-900 font-medium leading-relaxed mb-5 border border-amber-100 flex gap-4 items-start">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <p className="font-bold mb-1 text-amber-800">Telah Dilaporkan Secara Otomatis</p>
                      <p>Sistem menemukan bahan asing pada formulasi ini. Jangan khawatir, sistem kami telah merekam dan mengirimkannya secara otomatis ke tim ahli untuk ditinjau dan dimasukkan ke dalam Kamus Induk.</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest mr-2 w-full sm:w-auto mb-2 sm:mb-0">Daftar Bahan Asing:</span>
                    {result.engineResult.unknownIngredients.map((ing, idx) => (
                      <div key={idx} className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shadow-inner">
                        <span className="text-xs font-bold text-slate-500 lowercase">{ing}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legenda Keterangan Warna */}
          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span> Bintang Utama</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-rose-400"></span> Berbahaya</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-orange-400"></span> Keras / Aktif</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400"></span> Penenang</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-white border border-slate-300"></span> Standar</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-slate-100 border border-slate-300 border-dashed"></span> Tidak Dikenali</div>
          </div>
        </div>
      )}

      {/* 3. KLASTER BAHAN: PERHATIAN KHUSUS */}
      {riskIngredients.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
          <h3 className="text-lg font-black text-rose-800 mb-2 flex items-center gap-2"><span>⚠️</span> Bahan Perlu Perhatian</h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">Sistem mendeteksi bahan aktif kuat atau berisiko dalam formulasi ini.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {riskIngredients.map((ing, idx) => <IngredientCard key={idx} ing={ing} />)}
          </div>
        </div>
      )}

      {/* 4. KLASTER BAHAN: UNGGULAN & PENENANG */}
      {goodIngredients.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
          <h3 className="text-lg font-black text-emerald-800 mb-2 flex items-center gap-2"><span>🌱</span> Bahan Unggulan & Penenang</h3>
          <p className="text-sm text-slate-500 mb-6 font-medium">Bahan-bahan ini memberikan nilai tambah berupa perawatan ekstra untuk kulit.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {visibleGoodIngredients.map((ing, idx) => <IngredientCard key={idx} ing={ing} />)}
          </div>
          
          {goodIngredients.length > 4 && (
            <button 
              onClick={() => setShowAllGoodIngredients(!showAllGoodIngredients)} 
              className="w-full mt-6 py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-xl border border-slate-200 transition-colors shadow-sm"
            >
              {showAllGoodIngredients ? "Sembunyikan Bahan ▲" : `Tampilkan ${goodIngredients.length - 4} Bahan Lainnya 🔽`}
            </button>
          )}
        </div>
      )}

      {/* 5. KESIMPULAN AKHIR AI */}
      {result.analysis.recommendations && result.analysis.recommendations.length > 0 && (
        <div className="bg-[#111827] p-6 md:p-10 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
          
          <h3 className="text-lg font-black mb-8 text-emerald-400 flex items-center gap-2 relative z-10">
            <span>✨</span> Saran Pemakaian dari AI
          </h3>
          <ul className="space-y-4 relative z-10">
            {result.analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex gap-4 items-start bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm transition-all hover:bg-white/10">
                <span className="text-emerald-400 font-black mt-0.5">✓</span>
                <span className="text-sm text-slate-200 font-medium leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}