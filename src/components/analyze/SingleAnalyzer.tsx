// src/components/analyze/SingleAnalyzer.tsx
"use client";

import { useState } from "react";

interface AnalysisResult {
  matchScore: number;
  matchExplanation: string;
  safetyScore: number;
  safetyExplanation: string;
  redFlags: string[];
  recommendations: string[];
}

export default function SingleAnalyzer() {
  const [productName, setProductName] = useState("");
  const [productType, setProductType] = useState("FACEWASH");
  const [ingredients, setIngredients] = useState("");
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
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
        // Mengubah undefined menjadi string kosong agar JSON valid di backend
        body: JSON.stringify({ 
          productName: productName.trim() || "", 
          productType,
          ingredients 
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal menganalisis. Silakan coba lagi.");
      }

      const data = await response.json();
      setResult(data.analysis);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOCRClick = () => {
    alert("Fitur OCR Scanner sedang dalam pengembangan! Untuk saat ini, silakan ketik atau paste komposisi produk secara manual.");
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      
      {/* BAGIAN 1: INPUT FORM */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-gray-300">
        <form onSubmit={handleAnalyze} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Input Nama Brand */}
            <div>
              <label htmlFor="productName" className="block text-sm font-bold text-gray-900 mb-2">
                Nama Skincare / Brand (Opsional)
              </label>
              <input
                id="productName"
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Contoh: Wardah Perfect Bright..."
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 bg-gray-50 text-gray-900 font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm hover:bg-white"
              />
              <p className="text-xs text-gray-600 font-medium mt-1">Agar mudah dicari di riwayat nanti.</p>
            </div>

            {/* Input Jenis Skincare */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                Jenis Basic Skincare
              </label>
              <div className="flex bg-gray-100 p-1.5 rounded-xl border-2 border-gray-300">
                {[
                  { id: "FACEWASH", label: "Face Wash" },
                  { id: "MOISTURIZER", label: "Moisturizer" },
                  { id: "SUNSCREEN", label: "Sunscreen" },
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setProductType(type.id)}
                    className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all ${
                      productType === type.id
                        ? "bg-black text-white shadow-md"
                        : "text-gray-600 hover:text-black hover:bg-white"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input Ingredients */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="ingredients" className="block text-sm font-bold text-gray-900">
                Komposisi Produk (Ingredients) <span className="text-red-500">*</span>
              </label>
              <button 
                type="button"
                onClick={handleOCRClick}
                className="text-xs flex items-center gap-1 bg-gray-100 border border-gray-300 text-gray-800 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors font-bold"
              >
                <span>📷</span> Scan OCR
              </button>
            </div>
            
            <textarea
              id="ingredients"
              rows={5}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Ketik atau tempel bahan di sini. Pastikan review kembali teks hasil OCR jika ada salah eja..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-300 bg-gray-50 text-gray-900 font-medium placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm resize-none hover:bg-white"
              required
            />
            <p className="text-xs text-gray-600 font-medium mt-2">
              Pisahkan setiap bahan dengan koma (contoh: Water, Glycerin, Niacinamide...).
            </p>
          </div>

          {/* Tombol Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isAnalyzing || !ingredients.trim()}
              className="w-full sm:w-auto px-8 py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg text-lg"
            >
              {isAnalyzing ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Menganalisis...</span>
                </>
              ) : (
                <span>Mulai Analisis ✨</span>
              )}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-bold flex items-center gap-2">
            <span>⚠️</span> {error}
          </div>
        )}
      </div>

      {/* BAGIAN 2: HASIL ANALISIS */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Kartu Match Score */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-gray-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold text-gray-900">🎯 Match Score</h3>
                <span className={`text-4xl font-black ${result.matchScore >= 70 ? 'text-green-600' : result.matchScore >= 40 ? 'text-yellow-500' : 'text-red-600'}`}>
                  {result.matchScore}%
                </span>
              </div>
              <p className="text-base text-gray-800 font-medium leading-relaxed">{result.matchExplanation}</p>
            </div>
            
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl border border-gray-200 flex items-start gap-3">
              <span className="text-gray-500 mt-0.5">ℹ️</span>
              <p className="text-xs text-gray-700 font-medium leading-relaxed">
                <strong>Disclaimer:</strong> Analisis comedogenic didasarkan pada bahan tunggal. Formulasi keseluruhan produk mungkin memberikan efek yang berbeda.
              </p>
            </div>
          </div>

          {/* Kartu Safety Score */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border-2 border-gray-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold text-gray-900">🛡️ Safety Score</h3>
                <span className={`text-4xl font-black ${result.safetyScore >= 70 ? 'text-green-600' : result.safetyScore >= 40 ? 'text-yellow-500' : 'text-red-600'}`}>
                  {result.safetyScore}%
                </span>
              </div>
              <p className="text-base text-gray-800 font-medium leading-relaxed">{result.safetyExplanation}</p>
            </div>

            {/* Red Flags Alert */}
            {result.redFlags && result.redFlags.length > 0 && (
              <div className="mt-8 space-y-3">
                <h4 className="text-sm font-bold text-red-600 uppercase tracking-wider flex items-center gap-2">
                  <span>🚩</span> Peringatan Keamanan
                </h4>
                <ul className="space-y-2">
                  {result.redFlags.map((flag, idx) => (
                    <li key={idx} className="text-sm text-red-800 font-bold bg-red-50 border border-red-200 px-4 py-3 rounded-xl leading-relaxed">
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Kartu Rekomendasi (Lebar Penuh) */}
          {result.recommendations && result.recommendations.length > 0 && (
            <div className="col-span-1 md:col-span-2 bg-[#18181B] p-6 md:p-8 rounded-3xl shadow-sm mt-2">
              <h3 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
                <span>✨</span> Alternatif & Rekomendasi Cerdas
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.recommendations.map((rec, idx) => (
                  <div key={idx} className="bg-zinc-800 border border-zinc-700 text-zinc-200 font-medium text-sm p-5 rounded-2xl leading-relaxed">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}