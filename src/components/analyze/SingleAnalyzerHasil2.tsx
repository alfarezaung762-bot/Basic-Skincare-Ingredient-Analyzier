// src/components/analyze/SingleAnalyzerHasil2.tsx
"use client";

import { useState } from "react";

// --- TIPE DATA (Bisa diimpor, tapi didefinisikan ulang agar file ini mandiri/standalone) ---
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

  const handleReportIngredient = (ingName: string) => alert(`Bahan "${ingName}" dilaporkan ke Admin.`);

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
            <h3 className="text-base font-black text-slate-800">Bahan Terdeteksi Sistem</h3>
            <span className="bg-white text-slate-600 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              Total: {sortedDetectedIngredients.length + result.engineResult.unknownIngredients.length} Bahan
            </span>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            {sortedDetectedIngredients.map((ing, idx) => {
              let style = "bg-white text-slate-600 border-slate-200";
              if (ing.isKeyActive) style = "bg-emerald-100 text-emerald-800 border-emerald-200";
              if (ing.type === "TOXIC") style = "bg-rose-100 text-rose-800 border-rose-200";
              if (ing.type === "HARSH") style = "bg-orange-100 text-orange-800 border-orange-200";
              if (ing.type === "BUFFER") style = "bg-blue-100 text-blue-800 border-blue-200";
              
              return (
                <span key={idx} className={`px-3 py-1.5 border rounded-lg text-xs font-bold capitalize shadow-sm transition-all hover:-translate-y-0.5 ${style}`}>
                  {ing.name}
                </span>
              );
            })}
          </div>

          {/* INTEGRASI BAHAN ASING SEBAGAI DROPDOWN NOTIFIKASI */}
          {result.engineResult.unknownIngredients.length > 0 && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <button 
                onClick={() => setShowUnknownIngredients(!showUnknownIngredients)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-amber-300 rounded-xl shadow-sm text-amber-800 text-sm font-bold hover:bg-amber-50 transition-colors"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span>Bahan Asing Ditemukan ({result.engineResult.unknownIngredients.length})</span>
                <span className="ml-2 text-amber-500">{showUnknownIngredients ? '▲' : '▼'}</span>
              </button>

              {showUnknownIngredients && (
                <div className="mt-4 p-5 bg-white rounded-2xl border border-amber-200 shadow-sm animate-in slide-in-from-top-2">
                  <div className="bg-amber-50 p-4 rounded-xl text-sm text-slate-700 font-medium leading-relaxed mb-4 border border-amber-100">
                    {result.analysis.aiUnknownAnalysis}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Daftar Bahan:</span>
                    {result.engineResult.unknownIngredients.map((ing, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-xs font-bold text-slate-700">{ing}</span>
                        <button onClick={() => handleReportIngredient(ing)} className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 hover:bg-rose-100 transition-colors">Laporkan 🚩</button>
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