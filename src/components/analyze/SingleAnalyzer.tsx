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

// --- FUNGSI PEMISAH TEKS AI ---
const RenderExplanation = ({ text }: { text: string }) => {
  if (!text) return null;
  const lines = text.split('\n').filter(line => line.trim() !== '');
  
  return (
    <div className="space-y-3 mt-6 w-full">
      {lines.map((line, idx) => {
        const isNegative = line.includes('❌');
        return (
          <div 
            key={idx} 
            className={`p-4 rounded-xl border-l-4 text-sm font-medium leading-relaxed shadow-sm ${
              isNegative 
                ? 'border-rose-500 bg-rose-50 text-rose-800' 
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

// --- KOMPONEN GRAFIK SETENGAH DONAT (DIPERBAIKI) ---
const HalfDonutChart = ({ score, colorClass, label }: { score: number, colorClass: string, label: string }) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedScore(score), 150);
    return () => clearTimeout(timeout);
  }, [score]);

  const radius = 50;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; 
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center w-full">
      {/* ViewBox diset 100x50 agar pas setengah lingkaran (tidak overlap dengan teks bawah) */}
      <div className="relative w-48 h-24 flex justify-center">
        <svg className="w-full h-full" viewBox="0 0 100 50">
          <path 
            d={`M ${strokeWidth/2} 50 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} 50`} 
            fill="transparent" stroke="#F1F5F9" strokeWidth={strokeWidth} strokeLinecap="round" 
          />
          <path 
            d={`M ${strokeWidth/2} 50 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} 50`} 
            fill="transparent" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" 
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
            className={`transition-all duration-1000 ease-out ${colorClass}`} 
          />
        </svg>
        <div className="absolute bottom-0 flex flex-col items-center">
          <span className={`text-4xl font-black ${colorClass}`}>{animatedScore}%</span>
        </div>
      </div>
      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-3 bg-slate-100 px-4 py-1.5 rounded-full">
        {label}
      </span>
    </div>
  );
};

// --- KOMPONEN KARTU BAHAN DETAIL ---
const IngredientCard = ({ ing }: { ing: IngredientDb }) => {
  const getStyle = () => {
    if (ing.type === "TOXIC") return "bg-rose-50 border-rose-200 text-rose-900";
    if (ing.type === "HARSH") return "bg-orange-50 border-orange-200 text-orange-900";
    if (ing.type === "HERO") return "bg-emerald-50 border-emerald-200 text-emerald-900";
    if (ing.type === "BUFFER") return "bg-blue-50 border-blue-200 text-blue-900";
    return "bg-slate-50 border-slate-200 text-slate-900";
  };

  return (
    <div className={`p-5 rounded-2xl border ${getStyle()} shadow-sm transition-all hover:shadow-md`}>
      <div className="flex justify-between items-start mb-3">
        <h4 className="font-bold capitalize text-base">{ing.name}</h4>
        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-white rounded-md border border-inherit opacity-80 shadow-sm">
          {ing.type}
        </span>
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
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<FullAnalysisResponse | null>(null);
  const [error, setError] = useState("");

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
        body: JSON.stringify({ productName, productType, ingredients }),
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

  // Hitung jumlah bahan dari input teks
  const ingredientCount = ingredients.split(',').filter(i => i.trim() !== '').length;

  // Pengelompokan & Pengurutan Bahan (HERO > TOXIC > HARSH > BUFFER > BASIC)
  const orderMap: Record<string, number> = { HERO: 1, TOXIC: 2, HARSH: 3, BUFFER: 4, BASIC: 5 };
  
  const sortedDetectedIngredients = result?.engineResult.detectedIngredients.sort(
    (a, b) => (orderMap[a.type] || 99) - (orderMap[b.type] || 99)
  ) || [];

  const riskIngredients = sortedDetectedIngredients.filter(i => i.type === "HARSH" || i.type === "TOXIC");
  const goodIngredients = sortedDetectedIngredients.filter(i => i.type === "HERO" || i.type === "BUFFER");
const handleOCRClick = () => {
    alert("Fitur Pindai Label (OCR) sedang dalam pengembangan!");
  };
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* === INPUT FORM (DESIGN BARU) === */}
      <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden">
        
        {/* Dekorasi Halus */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 -mr-20 -mt-20"></div>

        <div className="flex items-center gap-4 mb-8 border-b border-slate-100 pb-5">
          <span className="bg-slate-100 text-slate-800 font-black text-lg px-4 py-2 rounded-xl border border-slate-200">01</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Formulir Analisis Klinis</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Masukkan komposisi produk untuk dievaluasi sistem</p>
          </div>
        </div>
        
        <form onSubmit={handleAnalyze} className="space-y-8 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Nama Produk <span className="text-slate-400 font-normal">(opsional)</span></label>
              <input 
                type="text" 
                value={productName} 
                onChange={(e) => setProductName(e.target.value)} 
                placeholder="Contoh: laboré"
                className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-slate-800 transition-all text-sm shadow-sm" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Klasifikasi Produk</label>
              <div className="flex bg-slate-50 p-1.5 rounded-2xl border-2 border-slate-100 shadow-inner">
                {[ 
                  { id: "FACEWASH", label: "Face Wash", icon: "💧" }, 
                  { id: "MOISTURIZER", label: "Moisturizer", icon: "✨" }, 
                  { id: "SUNSCREEN", label: "Sunscreen", icon: "🌞" } 
                ].map((type) => (
                  <button 
                    key={type.id} 
                    type="button" 
                    onClick={() => setProductType(type.id)} 
                    className={`flex-1 py-3 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 ${
                      productType === type.id 
                        ? "bg-white text-slate-900 shadow-md border border-slate-200 scale-[1.02]" 
                        : "text-slate-400 hover:text-slate-700"
                    }`}
                  >
                    <span>{type.icon}</span> {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Daftar Komposisi <span className="text-rose-500">*</span></label>
              <button 
                type="button" 
                onClick={handleOCRClick}
                className="text-xs flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl hover:bg-slate-50 font-bold shadow-sm transition-all active:scale-95"
              >
                <span>📷</span> Pindai Label
              </button>
            </div>
            <textarea 
              rows={6} required 
              value={ingredients} 
              onChange={(e) => setIngredients(e.target.value)} 
              placeholder="Paste daftar ingredients di sini, pisahkan dengan koma..." 
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-slate-800 transition-all text-sm resize-none shadow-inner leading-relaxed" 
            />
            {ingredients.trim().length > 0 && (
              <p className="text-xs font-bold text-slate-400 mt-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                {ingredientCount} bahan terdeteksi dari teks
              </p>
            )}
          </div>

          <button 
            type="submit" 
            disabled={isAnalyzing || !ingredients.trim()} 
            className="w-full py-4 bg-[#111827] text-white font-bold rounded-2xl hover:bg-black transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 text-base tracking-wide relative overflow-hidden"
          >
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
                <RenderExplanation text={result.analysis.matchExplanation} />
              </div>
              <div className="flex flex-col items-center pt-8 md:pt-0 md:pl-10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Tingkat Keamanan Produk</h3>
                <HalfDonutChart score={result.engineResult.safetyScore} label={result.engineResult.safetyLabel} colorClass={result.engineResult.safetyScore >= 70 ? 'text-emerald-500' : result.engineResult.safetyScore >= 40 ? 'text-amber-500' : 'text-rose-500'} />
                <RenderExplanation text={result.analysis.safetyExplanation} />
              </div>
            </div>
          </div>

          {/* BAHAN TERDETEKSI (DIURUTKAN & BERWARNA) */}
          {sortedDetectedIngredients.length > 0 && (
            <div className="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-base font-black text-slate-800">Bahan Terdeteksi Sistem</h3>
                <span className="bg-white text-slate-600 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                  Total: {sortedDetectedIngredients.length} Bahan
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2.5">
                {sortedDetectedIngredients.map((ing, idx) => {
                  let style = "bg-white text-slate-600 border-slate-200";
                  if (ing.type === "HERO") style = "bg-emerald-100 text-emerald-800 border-emerald-200";
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
                {goodIngredients.map((ing, idx) => <IngredientCard key={idx} ing={ing} />)}
              </div>
            </div>
          )}

          {/* ZONA BAHAN ASING */}
          {result.engineResult.unknownIngredients.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 md:p-8 rounded-[2rem] border border-amber-200 shadow-sm">
              <h3 className="text-lg font-black text-amber-900 mb-4 flex items-center gap-2"><span>❓</span> Analisis Bahan Asing (AI)</h3>
              <div className="bg-white p-6 rounded-2xl border border-amber-200 text-sm text-slate-700 font-medium leading-relaxed mb-6 shadow-sm">
                {result.analysis.aiUnknownAnalysis}
              </div>
              <div className="flex flex-wrap items-center gap-3 bg-white/60 p-4 rounded-2xl border border-amber-100">
                <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Bahan Asing:</span>
                {result.engineResult.unknownIngredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-amber-200 shadow-sm">
                    <span className="text-xs font-bold text-slate-700">{ing}</span>
                    <button onClick={() => handleReportIngredient(ing)} className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded border border-rose-200 hover:bg-rose-100 transition-colors">Laporkan 🚩</button>
                  </div>
                ))}
              </div>
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