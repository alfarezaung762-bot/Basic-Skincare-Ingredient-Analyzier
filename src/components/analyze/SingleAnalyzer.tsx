// src/components/analyze/SingleAnalyzer.tsx
"use client";

import { useState, useEffect } from "react";

// --- TIPE DATA ---
interface IngredientDb {
  name: string;
  type: string;
  functionalCategory: string;
  benefits: string;
  comedogenicRating: number;
  safeForPregnancy: boolean;
  safeForSensitive: boolean;
  // TAMBAHAN V3
  isKeyActive?: boolean;
  strengthLevel?: number;
}

interface EngineResult {
  matchScore: number;
  matchLabel: string;
  matchFlags: string[];
  safetyScore: number;
  safetyLabel: string;
  safetyFlags: string[];
  detectedIngredients: IngredientDb[];
  unknownIngredients: string[];
  // TAMBAHAN V3
  primaryProductFocus?: string | null;
  secondaryProductFocuses?: string[];
}

interface AiAnalysis {
  matchExplanation: string;
  safetyExplanation: string;
  aiUnknownAnalysis: string;
  recommendations: string[];
}

interface FullAnalysisResponse {
  engineResult: EngineResult;
  analysis: AiAnalysis;
  historyId: string;
}

// --- FUNGSI PEMISAH TEKS AI DENGAN WARNA DINAMIS ---
const RenderExplanation = ({ text, score }: { text: string, score: number }) => {
  if (!text) return null;
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  // Sinkronisasi warna peringatan dengan warna donat persentase
  const getNegativeStyle = (currentScore: number) => {
    if (currentScore >= 70) return 'border-amber-400 bg-amber-50 text-amber-800'; 
    if (currentScore >= 40) return 'border-orange-400 bg-orange-50 text-orange-800'; 
    return 'border-rose-500 bg-rose-50 text-rose-800'; 
  };

  return (
    <div className="space-y-3 mt-6 w-full">
      {lines.map((line, idx) => {
        const isNegative = line.includes('❌') || line.includes('⚠️') || line.includes('🚫');
        return (
          <div 
            key={idx} 
            className={`p-4 rounded-xl border-l-4 text-sm font-medium leading-relaxed shadow-sm ${
              isNegative 
                ? getNegativeStyle(score)
                : 'border-emerald-500 bg-emerald-50 text-emerald-800'
            }`}
          >
            {line}
          </div>
        );
      })}
    </div>
  );
};

// --- KOMPONEN GRAFIK SETENGAH DONAT (ANIMASI WIPE & GLOW) ---
const HalfDonutChart = ({ score, colorClass, label }: { score: number, colorClass: string, label: string }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timeout);
  }, [score]);

  const radius = 50;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; 
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  let glowColor = "rgba(16, 185, 129, 0.4)"; 
  if (score < 75) glowColor = "rgba(245, 158, 11, 0.4)"; 
  if (score < 40) glowColor = "rgba(244, 63, 94, 0.4)"; 

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-48 h-24 flex justify-center">
        <svg className="w-full h-full absolute top-0" viewBox="0 0 100 50" style={{ overflow: 'visible' }}>
          <path 
            d={`M ${strokeWidth/2} 50 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} 50`} 
            fill="transparent" stroke="#F1F5F9" strokeWidth={strokeWidth} strokeLinecap="round" 
          />
          {/* Animasi Glow Pulse di latar belakang bar */}
          <path 
            d={`M ${strokeWidth/2} 50 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} 50`} 
            fill="transparent" stroke={glowColor} strokeWidth={strokeWidth + 8} strokeLinecap="round" 
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
            className="transition-all duration-[1500ms] ease-[cubic-bezier(0.1,1,0,1)] animate-pulse blur-md" 
          />
          {/* Bar Utama dengan animasi wipe yang lebih lambat dan dramatis */}
          <path 
            d={`M ${strokeWidth/2} 50 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} 50`} 
            fill="transparent" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" 
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
            className={`transition-all duration-[1500ms] ease-[cubic-bezier(0.1,1,0,1)] ${colorClass} relative z-10`} 
          />
        </svg>
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className={`text-4xl font-black ${colorClass} drop-shadow-sm`}>{animatedScore}%</span>
        </div>
      </div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-3 bg-slate-100 px-4 py-1.5 rounded-full">
        {label}
      </span>
    </div>
  );
};

// --- KOMPONEN KARTU BAHAN DETAIL (UPDATE V3) ---
const IngredientCard = ({ ing }: { ing: IngredientDb }) => {
  const getStyle = () => {
    if (ing.type === "TOXIC") return "bg-rose-50 text-rose-900 border-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]";
    if (ing.type === "HARSH") return "bg-orange-50 text-orange-900 border-orange-200";
    if (ing.isKeyActive) return "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"; // HERO diganti isKeyActive
    if (ing.type === "BUFFER") return "bg-blue-50 border-blue-200 text-blue-900";
    return "bg-slate-50 border-slate-200 text-slate-900";
  };

  const isPulsing = ing.type === "TOXIC" || ing.type === "HARSH" || ing.isKeyActive;
  const getPulseColor = () => {
    if (ing.type === "TOXIC") return "bg-rose-500";
    if (ing.type === "HARSH") return "bg-orange-500";
    return "bg-emerald-500"; 
  };

  // Label Kekuatan (V3)
  let strengthBadge = null;
  if (ing.type === "HARSH" && ing.strengthLevel) {
    strengthBadge = <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-orange-100 text-orange-800 rounded-md border border-orange-200 ml-2">🔥 Keras: Lvl {ing.strengthLevel}</span>;
  } else if (ing.type === "BUFFER" && ing.strengthLevel) {
    strengthBadge = <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-blue-100 text-blue-800 rounded-md border border-blue-200 ml-2">💧 Penenang: Lvl {ing.strengthLevel}</span>;
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

export default function SingleAnalyzer() {
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("FACEWASH");
  const [ingredients, setIngredients] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"HYBRID" | "FAST">("HYBRID");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FullAnalysisResponse | null>(null);
  const [error, setError] = useState("");

  const [showAllGoodIngredients, setShowAllGoodIngredients] = useState(false);
  const [showUnknownIngredients, setShowUnknownIngredients] = useState(false);

  const handleOCRClick = () => {
    alert("Fitur Pindai Label (OCR) sedang dalam pengembangan!");
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredients.trim()) return;

    setIsAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/analyze/single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, productType, ingredients, mode: analysisMode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menganalisis.");
      }
      setResult(await response.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReportIngredient = (ingName: string) => alert(`Bahan "${ingName}" dilaporkan ke Admin.`);

  const ingredientCount = ingredients.split(',').filter(i => i.trim() !== '').length;

  // URUTAN V3: Bintang Utama selalu di atas, lalu Toxic, Harsh, Buffer, Basic
  const orderMap: Record<string, number> = { TOXIC: 1, HARSH: 2, BUFFER: 3, BASIC: 4 };
  const sortedDetectedIngredients = result?.engineResult.detectedIngredients.sort((a, b) => {
    if (a.isKeyActive && !b.isKeyActive) return -1;
    if (!a.isKeyActive && b.isKeyActive) return 1;
    return (orderMap[a.type] || 99) - (orderMap[b.type] || 99);
  }) || [];

  const riskIngredients = sortedDetectedIngredients.filter(i => i.type === "HARSH" || i.type === "TOXIC");
  const goodIngredients = sortedDetectedIngredients.filter(i => i.isKeyActive || i.type === "BUFFER");
  const basicIngredients = sortedDetectedIngredients.filter(i => i.type === "BASIC");
  const visibleGoodIngredients = showAllGoodIngredients ? goodIngredients : goodIngredients.slice(0, 4);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* === INPUT FORM === */}
      <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 -mr-20 -mt-20"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <span className="bg-slate-100 text-slate-800 font-black text-lg px-4 py-2 rounded-xl border border-slate-200">01</span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Formulir Analisis Klinis</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">Masukkan komposisi produk untuk dievaluasi sistem</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner w-fit">
            <button 
              type="button" 
              onClick={() => setAnalysisMode("FAST")} 
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${analysisMode === "FAST" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}
            >
              ⚡ Sistem Cepat
            </button>
            <button 
              type="button" 
              onClick={() => setAnalysisMode("HYBRID")} 
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${analysisMode === "HYBRID" ? "bg-white text-purple-600 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}
            >
              🤖 AI Hybrid
            </button>
          </div>
        </div>
        
        <form onSubmit={handleAnalyze} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Nama Produk <span className="text-slate-400 font-normal">(opsional)</span></label>
              <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Contoh: laboré" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-slate-800 transition-all text-sm shadow-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Klasifikasi Produk</label>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border-2 border-slate-100 shadow-inner">
                {[ { id: "FACEWASH", label: "Face Wash", icon: "💧" }, { id: "MOISTURIZER", label: "Moisturizer", icon: "✨" }, { id: "SUNSCREEN", label: "Sunscreen", icon: "🌞" } ].map((type) => (
                  <button key={type.id} type="button" onClick={() => setProductType(type.id)} className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${productType === type.id ? "bg-white text-slate-900 shadow-md border border-slate-200 scale-[1.02]" : "text-slate-400 hover:text-slate-700"}`}>
                    <span>{type.icon}</span> {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Daftar Komposisi <span className="text-rose-500">*</span></label>
              <button type="button" onClick={handleOCRClick} className="text-xs flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 font-bold shadow-sm transition-all active:scale-95">
                <span>📷</span> Pindai Label
              </button>
            </div>
            <textarea rows={6} required value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="Paste daftar ingredients di sini, pisahkan dengan koma..." className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-slate-800 transition-all text-sm resize-none shadow-inner leading-relaxed" />
            {ingredients.trim().length > 0 && (
              <p className="text-xs font-bold text-slate-400 mt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> {ingredientCount} bahan terdeteksi dari teks
              </p>
            )}
          </div>

          <button type="submit" disabled={isAnalyzing || !ingredients.trim()} className="w-full py-4 bg-[#111827] text-white font-bold rounded-2xl hover:bg-black transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 text-base tracking-wide relative overflow-hidden">
            {isAnalyzing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Memproses Data Lab...
              </>
            ) : (
              <><span>🧪</span> Jalankan Analisis Laboratorium</>
            )}
          </button>
        </form>
        {error && <div className="mt-6 p-4 bg-rose-50 text-rose-700 rounded-2xl text-sm font-bold border border-rose-100">{error}</div>}
      </div>

      {/* === HASIL ANALISIS === */}
      {result && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
          
          {/* HEADER SKOR KLINIS */}
          <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-200">
            <h2 className="text-sm font-black text-slate-400 border-b border-slate-100 pb-4 mb-8 text-center uppercase tracking-widest">
              Laporan Evaluasi Produk
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 divide-y md:divide-y-0 md:divide-x divide-slate-100">
              <div className="flex flex-col items-center">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Kecocokan Profil Kulit</h3>
                <HalfDonutChart score={result.engineResult.matchScore} label={result.engineResult.matchLabel} colorClass={result.engineResult.matchScore >= 75 ? 'text-emerald-500' : result.engineResult.matchScore >= 40 ? 'text-amber-500' : 'text-rose-500'} />
                <RenderExplanation text={result.analysis.matchExplanation} score={result.engineResult.matchScore} />
              </div>
              <div className="flex flex-col items-center pt-8 md:pt-0 md:pl-10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Tingkat Keamanan Produk</h3>
                <HalfDonutChart score={result.engineResult.safetyScore} label={result.engineResult.safetyLabel} colorClass={result.engineResult.safetyScore >= 70 ? 'text-emerald-500' : result.engineResult.safetyScore >= 40 ? 'text-amber-500' : 'text-rose-500'} />
                <RenderExplanation text={result.analysis.safetyExplanation} score={result.engineResult.safetyScore} />
              </div>
            </div>
          </div>

          {/* KESIMPULAN FOKUS PRODUK V3 */}
          {(result.engineResult.primaryProductFocus || (result.engineResult.secondaryProductFocuses && result.engineResult.secondaryProductFocuses.length > 0)) && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
              <h3 className="text-sm font-black text-slate-400 border-b border-slate-100 pb-4 mb-6 text-center uppercase tracking-widest">
                Profil Formulasi Produk
              </h3>
              <div className="flex flex-col md:flex-row gap-6">
                {/* Target Utama */}
                <div className="flex-1 bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-200 rounded-full blur-3xl -ml-10 -mt-10 opacity-50"></div>
                  <span className="text-3xl mb-3 relative z-10">🎯</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Target Utama Formulasi</span>
                  <span className="text-lg font-black text-slate-800 relative z-10">
                    {result.engineResult.primaryProductFocus || "Tidak Spesifik (Basic Care)"}
                  </span>
                </div>

                {/* Manfaat Tambahan */}
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

          {/* BAHAN TERDETEKSI & BAHAN ASING */}
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

          {/* KLASTER BAHAN: PERHATIAN KHUSUS */}
          {riskIngredients.length > 0 && (
            <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200">
              <h3 className="text-lg font-black text-rose-800 mb-2 flex items-center gap-2"><span>⚠️</span> Bahan Perlu Perhatian</h3>
              <p className="text-sm text-slate-500 mb-6 font-medium">Sistem mendeteksi bahan aktif kuat atau berisiko dalam formulasi ini.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {riskIngredients.map((ing, idx) => <IngredientCard key={idx} ing={ing} />)}
              </div>
            </div>
          )}

          {/* KLASTER BAHAN: UNGGULAN & PENENANG */}
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

          {/* KESIMPULAN AKHIR */}
          {result.analysis.recommendations && result.analysis.recommendations.length > 0 && (
            <div className="bg-[#111827] p-6 md:p-10 rounded-[2rem] shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500 rounded-full blur-[100px] opacity-20 pointer-events-none"></div>
              
              <h3 className="text-lg font-black mb-8 text-emerald-400 flex items-center gap-2 relative z-10">
                <span>✨</span> Ringkasan & Saran Pemakaian
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
      )}
    </div>
  );
}