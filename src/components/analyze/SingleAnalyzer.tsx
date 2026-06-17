// src/components/analyze/SingleAnalyzer.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
// Type-only import (stripped at compile time, no bundle cost)
import type { FullAnalysisResponse, UserProfileSummary } from "./SingleAnalyzerHasil";
import { ekstrakDaftarBahan } from "@/lib/pemisahBahan";

// Dynamic imports — these components only render AFTER analysis completes,
// so they don't need to be in the initial bundle (~400KB savings)
const SingleAnalyzerHasil = dynamic(() => import("./SingleAnalyzerHasil"), {
  ssr: false,
  loading: () => <div className="skeleton w-full h-[200px] rounded-2xl" />,
});
const SingleAnalyzerHasil2 = dynamic(() => import("./SingleAnalyzerHasil2"), {
  ssr: false,
  loading: () => <div className="skeleton w-full h-[300px] rounded-2xl" />,
});
const ProductRecommendation = dynamic(() => import("./ProductRecommendation"), {
  ssr: false,
  loading: () => <div className="skeleton w-full h-[200px] rounded-2xl" />,
});
const OcrMode = dynamic(() => import("./ocrmode"), {
  ssr: false,
});

interface SingleAnalyzerProps {
  points?: number | null;
  onPointsChange?: (newPoints: number) => void;
}

export default function SingleAnalyzer({ points, onPointsChange }: SingleAnalyzerProps = {}) {
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("FACEWASH");
  const [ingredients, setIngredients] = useState("");
  const [displayIngredientCount, setDisplayIngredientCount] = useState(0);
  const [analysisMode, setAnalysisMode] = useState<"HYBRID" | "FAST">("FAST");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [costFast, setCostFast] = useState(1);
  const [costHybrid, setCostHybrid] = useState(2);
  
  // Data Hasil API
  const [result, setResult] = useState<FullAnalysisResponse | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileSummary | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]); 
  const [error, setError] = useState("");
  
  // Titik Referensi untuk animasi gulir otomatis (Auto-Scroll)
  const resultRef = useRef<HTMLDivElement>(null);
  const [isAiSummaryOpen, setIsAiSummaryOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  const handleGoToAiSummary = () => {
    setIsAiSummaryOpen(true);
    setTimeout(() => {
      const element = document.getElementById("ai-hybrid-dashboard");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

  const [localPoints, setLocalPoints] = useState<number | null>(null);
  const pointsVal = points !== undefined ? points : localPoints;

  const updatePointsVal = (newPoints: number) => {
    if (onPointsChange) {
      onPointsChange(newPoints);
    } else {
      setLocalPoints(newPoints);
    }
  };

  // Ambil profil pengguna saat pertama kali komponen dimuat
  // + Baca data dari sessionStorage jika datang dari halaman History
  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (data.skinType) setUserProfile(data);
          else if (data.profile) setUserProfile(data.profile);
          
          if (typeof data.points === "number") {
            updatePointsVal(data.points);
          }
        }
      })
      .catch(() => console.log("Gagal memuat profil"));

    fetch("/api/admin/subscription/config")
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          if (typeof data.costFast === "number") setCostFast(data.costFast);
          if (typeof data.costHybrid === "number") setCostHybrid(data.costHybrid);
        }
      })
      .catch(() => console.log("Gagal memuat tarif poin"));

    // Pre-fill form dari History page (Analisis Ulang)
    const savedProduct = sessionStorage.getItem("lastAnalysisProduct");
    const savedIngredients = sessionStorage.getItem("lastAnalysisIngredients");
    const savedType = sessionStorage.getItem("lastAnalysisType");

    if (savedIngredients) {
      if (savedProduct) setProductName(savedProduct);
      setIngredients(savedIngredients);
      if (savedType) setProductType(savedType);

      // Bersihkan sessionStorage agar tidak menempel di refresh berikutnya
      sessionStorage.removeItem("lastAnalysisProduct");
      sessionStorage.removeItem("lastAnalysisIngredients");
      sessionStorage.removeItem("lastAnalysisType");
    }
  }, []);

  const handleOCRClick = () => {
    setIsOcrOpen(true);
  };

  const handleOcrResult = (extractedText: string) => {
    setIngredients(extractedText);
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredients.trim()) return;

    // Cek kecukupan kredit poin lokal
    const requiredPoints = analysisMode === "HYBRID" ? costHybrid : costFast;
    if (pointsVal !== null && pointsVal < requiredPoints) {
      setError(`Kredit poin Anda tidak cukup. Anda membutuhkan minimal ${requiredPoints} kredit poin untuk analisis ${analysisMode === "HYBRID" ? "AI Hybrid" : "Sistem Cepat"}. Silakan isi ulang kredit Anda melalui Pengaturan.`);
      return;
    }

    setIsAnalyzing(true);
    setError("");
    setResult(null); 
    setIsAiSummaryOpen(false);
    setRecommendations([]); // Reset rekomendasi lama setiap mulai analisis baru

    try {
      // 1. Jalankan Analisis Utama (Evaluasi Laboratorium Klinis)
      const endpoint = analysisMode === "HYBRID" ? "/api/analyze/ai-hybrid" : "/api/analyze/single";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, productType, ingredients }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Gagal menganalisis.");
      }
      
      const responseData = await response.json();
      setResult(responseData);

      // Kurangi kredit poin di state lokal/global setelah sukses
      if (pointsVal !== null) {
        updatePointsVal(pointsVal - requiredPoints);
      }

      // 2. Jalankan Pencarian Rekomendasi Produk Mirip 🚀
      const resRec = await fetch("/api/analyze/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ingredientsRaw: ingredients, 
          productType: productType,
          userProfile: userProfile 
        }),
      });

      if (resRec.ok) {
        const dataRec = await resRec.json();
        setRecommendations(dataRec);
      }

      // Gulir otomatis (Auto-scroll) ke komponen hasil
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // --- FUNGSI TAHAP 5: DIPANGGIL DARI DALAM JENDELA TIMBUL (MODAL) ---
  const handleAnalyzeThis = (ingText: string) => {
    setIngredients(ingText); // Masukkan komposisi produk dari modal ke dalam form utama
    setResult(null); // Tutup hasil lama
    setRecommendations([]); // Tutup rekomendasi lama
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Gulir ke atas secara mulus
  };

  // Debouncing penghitungan bahan agar pengetikan di desktop tidak lag
  useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayIngredientCount(ekstrakDaftarBahan(ingredients).length);
    }, 300);

    return () => clearTimeout(timer);
  }, [ingredients]);

  return (
      <div className="w-full max-w-5xl mx-auto space-y-8 pb-4">
        
        {/* === KOTAK FORMULIR === */}
        <div className="bg-white p-4 sm:p-6 md:p-10 rounded-[1.5rem] sm:rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl -z-10 -mr-20 -mt-20"></div>

          <div className="flex flex-col gap-3 sm:gap-4 mb-5 sm:mb-8 border-b border-slate-100 pb-4 sm:pb-5">
            <div className="flex items-center gap-2.5 sm:gap-4">
              <span className="bg-slate-100 text-slate-800 font-black text-sm sm:text-lg px-2.5 sm:px-4 py-1 sm:py-2 rounded-xl border border-slate-200 shrink-0">01</span>
              <div className="min-w-0">
                <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">Formulir Analisis Klinis</h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 sm:mt-1 font-medium hidden sm:block">Masukkan komposisi produk untuk dievaluasi sistem</p>
              </div>
            </div>

            <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
              <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-50 p-1 sm:p-1.5 rounded-xl border border-slate-200 shadow-inner w-full sm:w-fit">
                <button 
                  type="button" 
                  onClick={() => setAnalysisMode("FAST")} 
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[9px] sm:text-xs font-bold rounded-lg transition-all ${analysisMode === "FAST" ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                  title={`Biaya: ${costFast} Kredit`}
                >
                  <span className="sm:hidden">⚡ Cepat ({costFast})</span>
                  <span className="hidden sm:inline">⚡ Sistem Cepat ({costFast} Poin)</span>
                </button>
                <button 
                  type="button" 
                  onClick={() => setAnalysisMode("HYBRID")} 
                  className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[9px] sm:text-xs font-bold rounded-lg transition-all ${analysisMode === "HYBRID" ? "bg-white text-purple-600 shadow-sm border border-slate-200" : "text-slate-400 hover:text-slate-600"}`}
                  title={`Biaya: ${costHybrid} Kredit`}
                >
                  <span className="sm:hidden">🤖 Hybrid ({costHybrid})</span>
                  <span className="hidden sm:inline">🤖 AI Hybrid ({costHybrid} Poin)</span>
                </button>
              </div>
              {pointsVal !== null && (
                <div className="text-[10px] sm:text-[11px] font-bold text-slate-500">
                  Saldo: <span className="text-amber-600 font-extrabold">🪙 {pointsVal} Kredit</span>
                </div>
              )}
            </div>
          </div>
          
          <form onSubmit={handleAnalyze} className="space-y-5 sm:space-y-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Nama Produk <span className="text-slate-400 font-normal">(opsional)</span></label>
                <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Contoh: laboré" className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-slate-800 transition-all text-sm shadow-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Klasifikasi Produk</label>
                <div className="flex bg-slate-50 p-1 sm:p-1.5 rounded-2xl border-2 border-slate-100 shadow-inner gap-0.5 sm:gap-0">
                    {[ { id: "FACEWASH", label: "Face Wash", shortLabel: "Wash", icon: "💧" }, { id: "MOISTURIZER", label: "Moisturizer", shortLabel: "Moist", icon: "✨" }, { id: "SUNSCREEN", label: "Sunscreen", shortLabel: "SPF", icon: "🌞" } ].map((type) => (
                    <button key={type.id} type="button" onClick={() => setProductType(type.id)} className={`flex-1 py-2 sm:py-3 text-[9px] sm:text-sm font-bold rounded-xl flex items-center justify-center gap-0.5 sm:gap-2 transition-all duration-300 ${productType === type.id ? "bg-white text-slate-900 shadow-md border border-slate-200" : "text-slate-400 hover:text-slate-700"}`}>
                      <span className="text-xs sm:text-base">{type.icon}</span>
                      <span className="sm:hidden">{type.shortLabel}</span>
                      <span className="hidden sm:inline">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div>
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-0 shrink-0">Komposisi <span className="text-rose-500">*</span></label>
                  <div className="group relative flex items-center justify-center shrink-0">
                    <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 text-[10px] font-black flex items-center justify-center cursor-help transition-colors group-hover:bg-indigo-100 group-hover:text-indigo-600">?</span>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 sm:w-64 p-2.5 sm:p-3 bg-slate-800 text-slate-200 text-[10px] sm:text-[11px] font-medium rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 leading-relaxed pointer-events-none">
                      Masukkan daftar bahan yang dipisahkan dengan koma (,). Dapatkan data ini dari label kemasan produk.
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-800"></div>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={handleOCRClick} className="text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 bg-white border border-slate-200 text-slate-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:bg-slate-50 font-bold shadow-sm transition-all active:scale-95 shrink-0">
                  <span>📷</span> <span className="hidden sm:inline">Pindai Label</span><span className="sm:hidden">Pindai</span>
                </button>
              </div>
              <textarea rows={6} required value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="Paste daftar ingredients di sini, pisahkan dengan koma..." className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-800 font-medium focus:bg-white focus:outline-none focus:border-slate-800 transition-all text-sm resize-none shadow-inner leading-relaxed" />
              {ingredients.trim().length > 0 && (
                <p className="text-xs font-bold text-slate-400 mt-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> {displayIngredientCount} bahan terdeteksi dari teks
                </p>
              )}
            </div>

            <button type="submit" disabled={isAnalyzing || !ingredients.trim()} className="w-full py-3 sm:py-4 bg-[#111827] text-white font-bold rounded-2xl hover:bg-black transition-all disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none flex items-center justify-center gap-2 sm:gap-3 shadow-lg shadow-slate-900/20 text-sm sm:text-base tracking-wide relative overflow-hidden">
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="sm:hidden">Memproses...</span>
                  <span className="hidden sm:inline">Memproses Data Lab...</span>
                </>
              ) : (
                <><span>🧪</span> <span className="sm:hidden">Jalankan Analisis</span><span className="hidden sm:inline">Jalankan Analisis Laboratorium</span></>
              )}
            </button>
          </form>
          {error && <div className="mt-6 p-4 bg-rose-50 text-rose-700 rounded-2xl text-sm font-bold border border-rose-100">{error}</div>}
        </div>

        {/* === AREA HASIL (HASIL ANALISIS & REKOMENDASI) === */}
        {result && !isAnalyzing && (
          <div ref={resultRef} className="animate-in fade-in zoom-in-95 duration-700 scroll-mt-24 pt-4 space-y-10">
            
            {/* BAGIAN A: Evaluasi Klinis (Hasil Analisis Langsung) */}
            <div className="space-y-6">
              <SingleAnalyzerHasil 
                result={result} 
                userProfile={userProfile} 
                onGoToAiSummary={handleGoToAiSummary}
              />
              <SingleAnalyzerHasil2 
                result={result} 
                isDashboardOpen={isAiSummaryOpen}
                setIsDashboardOpen={setIsAiSummaryOpen}
              />
            </div>

            {/* BAGIAN B: Katalog Rekomendasi (Alternatif Mirip dari Database) 🛍️ */}
            {recommendations.length > 0 && (
              <div className="pt-10 border-t-4 border-dashed border-slate-200">
                 <ProductRecommendation 
                   products={recommendations} 
                   userPrimaryFocus={(userProfile as any)?.primaryFocus || userProfile?.skinType || ""} 
                   userIngredients={ingredients} 
                   userSkinType={userProfile?.skinType || ""}
                   onAnalyzeThis={handleAnalyzeThis}
                 />
              </div>
            )}
          </div>
        )}

        {/* Modal OCR */}
        <OcrMode 
          isOpen={isOcrOpen} 
          onClose={() => setIsOcrOpen(false)} 
          onResult={handleOcrResult} 
        />
      </div>
  );
}