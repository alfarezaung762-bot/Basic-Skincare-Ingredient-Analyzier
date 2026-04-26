// src/components/analyze/SingleAnalyzer.tsx
"use client";

import { useState, useEffect, useRef } from "react";
// Impor Komponen Anak
import SingleAnalyzerHasil, { FullAnalysisResponse, UserProfileSummary } from "./SingleAnalyzerHasil";

export default function SingleAnalyzer() {
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("FACEWASH");
  const [ingredients, setIngredients] = useState("");
  const [analysisMode, setAnalysisMode] = useState<"HYBRID" | "FAST">("HYBRID");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Data Hasil API
  const [result, setResult] = useState<FullAnalysisResponse | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileSummary | null>(null);
  const [error, setError] = useState("");
  
  // Titik Referensi untuk animasi gulir otomatis (Auto-Scroll)
  const resultRef = useRef<HTMLDivElement>(null);

  // Ambil profil pengguna saat pertama kali komponen dimuat
  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.skinType) setUserProfile(data);
        else if (data && data.profile) setUserProfile(data.profile);
      })
      .catch(() => console.log("Gagal memuat profil"));
  }, []);

  const handleOCRClick = () => {
    alert("Fitur Pindai Label (OCR) sedang dalam pengembangan!");
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingredients.trim()) return;

    setIsAnalyzing(true);
    setError("");
    setResult(null); // Sembunyikan hasil lama jika ada

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
      
      const responseData = await response.json();
      setResult(responseData); // Munculkan komponen anak

      // Gulir otomatis (Auto-scroll) ke komponen hasil dengan jeda agar transisi mulus
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100); // Jeda pendek

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const ingredientCount = ingredients.split(',').filter(i => i.trim() !== '').length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-20">
      
      {/* === KOTAK FORMULIR === */}
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

      {/* === KOMPONEN ANAK (Menampilkan Hasil Visual) === */}
      {result && (
        <div ref={resultRef} className="animate-in fade-in zoom-in-95 duration-700 scroll-mt-24 pt-4">
          <SingleAnalyzerHasil result={result} userProfile={userProfile} />
        </div>
      )}

    </div>
  );
}