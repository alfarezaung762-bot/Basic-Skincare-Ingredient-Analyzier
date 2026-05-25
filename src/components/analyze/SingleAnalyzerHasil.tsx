// src/components/analyze/SingleAnalyzerHasil.tsx
"use client";

import { useState, useEffect } from "react";

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

export interface FlagDetail {
  type: "CRITICAL" | "WARNING" | "SUCCESS" | "INFO";
  message: string;
  pointsDeducted: number;
  culprits?: string[];
}

export interface EngineResult {
  matchScore: number;
  matchLabel: string;
  matchFlags: FlagDetail[];
  safetyScore: number;
  safetyLabel: string;
  safetyFlags: FlagDetail[];
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

export interface UserProfileSummary {
  skinType: string;
  severity: string;
  isPregnantOrNursing: boolean;
}

// --- FUNGSI PEMISAH TEKS (WARNA DINAMIS) ---
const RenderFlags = ({ flags }: { flags: FlagDetail[] }) => {
  if (!flags || flags.length === 0) return (
    <div className="p-4 mt-6 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 text-sm font-medium text-center">
      Tidak ada catatan khusus. Produk ini lulus evaluasi klinis.
    </div>
  );

  return (
    <div className="space-y-3 mt-6 w-full animate-in fade-in-50 slide-in-from-top-2 duration-300">
      {flags.map((flag, idx) => {
        let style = "border-slate-300 bg-slate-50 text-slate-800";
        let icon = "ℹ️"; let badgeStyle = "bg-slate-200 text-slate-700 border-slate-300";
        
        if (flag.type === "CRITICAL") { style = "border-rose-500 bg-rose-50 text-rose-900"; badgeStyle = "bg-rose-100 text-rose-800 border-rose-200 shadow-sm"; icon = "🚨"; }
        else if (flag.type === "WARNING") { style = "border-amber-400 bg-amber-50 text-amber-900"; badgeStyle = "bg-amber-100 text-amber-800 border-amber-200 shadow-sm"; icon = "⚠️"; }
        else if (flag.type === "SUCCESS") { style = "border-emerald-500 bg-emerald-50 text-emerald-900"; badgeStyle = "bg-emerald-100 text-emerald-800 border-emerald-200 shadow-sm"; icon = "✅"; }

        return (
          <div key={idx} className={`p-4 rounded-xl border-l-4 text-xs font-semibold leading-relaxed shadow-sm flex flex-col sm:flex-row items-start gap-3 border ${style}`}>
            <span className="text-base shrink-0">{icon}</span>
            <div className="flex-1 w-full">
              <p>{flag.message}</p>
              {/* LENCANA BAHAN PEMICU (CULPRITS) */}
              {flag.culprits && flag.culprits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {flag.culprits.map((culprit, cIdx) => (
                    <span key={cIdx} className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${badgeStyle}`}>{culprit}</span>
                  ))}
                </div>
              )}
              {/* BADGE PENALTI SKOR */}
              {flag.pointsDeducted > 0 && (
                <span className="inline-block mt-2.5 px-2.5 py-0.5 rounded-md bg-white/60 text-[9px] font-black uppercase tracking-wider text-rose-600 shadow-sm border border-rose-100">
                  Penalti Skor: -{flag.pointsDeducted} Poin
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- KOMPONEN GRAFIK SETENGAH DONAT (ANIMASI MULUS) ---
const HalfDonutChart = ({ score, colorClass, label }: { score: number, colorClass: string, label: string }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  const radius = 50;
  const strokeWidth = 12;
  const normalizedRadius = radius - strokeWidth / 2;
  const circumference = normalizedRadius * Math.PI; 
  
  const [dashOffset, setDashOffset] = useState(circumference);

  useEffect(() => {
    let start = 0;
    const duration = 1500; 
    const increment = score / (duration / 16); 
    
    const timer = setInterval(() => {
      start += increment;
      if (start >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(start));
      }
    }, 16);

    const targetOffset = circumference - (score / 100) * circumference;
    const delayStroke = setTimeout(() => {
      setDashOffset(targetOffset);
    }, 50);

    return () => {
      clearInterval(timer);
      clearTimeout(delayStroke);
    };
  }, [score, circumference]);

  let glowColor = "rgba(16, 185, 129, 0.4)"; 
  let pulseClass = "";
  if (score < 75) {
    glowColor = "rgba(245, 158, 11, 0.4)"; 
  }
  if (score <= 40) {
    glowColor = "rgba(244, 63, 94, 0.6)"; 
    pulseClass = "animate-pulse"; 
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className={`relative w-48 h-24 flex justify-center ${pulseClass}`}>
        <svg className="w-full h-full absolute top-0" viewBox="0 0 100 50" style={{ overflow: 'visible' }}>
          <path d={`M ${strokeWidth/2} 50 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} 50`} fill="transparent" stroke="#F1F5F9" strokeWidth={strokeWidth} strokeLinecap="round" />
          
          <path 
            d={`M ${strokeWidth/2} 50 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} 50`} 
            fill="transparent" stroke={glowColor} strokeWidth={strokeWidth + 8} strokeLinecap="round" 
            strokeDasharray={circumference} 
            strokeDashoffset={dashOffset} 
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
            className="blur-md" 
          />
          
          <path 
            d={`M ${strokeWidth/2} 50 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} 50`} 
            fill="transparent" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" 
            strokeDasharray={circumference} 
            strokeDashoffset={dashOffset} 
            style={{ transition: 'stroke-dashoffset 1.5s ease-out' }}
            className={`${colorClass} relative z-10`} 
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

// --- KOMPONEN UTAMA ANAK (BAGIAN ATAS) ---
export default function SingleAnalyzerHasil({ 
  result, 
  userProfile 
}: { 
  result: FullAnalysisResponse; 
  userProfile: UserProfileSummary | null;
}) {
  const hasWarning = result.engineResult.safetyScore < 70 || result.engineResult.matchScore < 40;

  return (
    <div className="space-y-6">

      {/* HEADER SKOR KLINIS DENGAN FOOTER PROFIL */}
      <div className="bg-white p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-200 relative">
        <h2 className="text-sm font-black text-slate-400 border-b border-slate-100 pb-4 mb-8 text-center uppercase tracking-widest">
          Laporan Evaluasi Produk
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 divide-y md:divide-y-0 md:divide-x divide-slate-100 relative">
          
          {/* IKON PULSE TENGAH */}
          {hasWarning && (
            <div className="hidden md:flex absolute top-20 left-1/2 -translate-x-1/2 z-20 items-center justify-center">
              <span className="flex h-10 w-10 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-10 w-10 bg-rose-500 text-white items-center justify-center text-sm shadow-[0_0_15px_rgba(244,63,94,0.5)] border-2 border-white">⚠️</span>
              </span>
            </div>
          )}

          <div className="flex flex-col items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Kecocokan Profil Kulit</h3>
            <HalfDonutChart score={result.engineResult.matchScore} label={result.engineResult.matchLabel} colorClass={result.engineResult.matchScore >= 75 ? 'text-emerald-500' : result.engineResult.matchScore >= 40 ? 'text-amber-500' : 'text-rose-500'} />
            <RenderFlags flags={result.engineResult.matchFlags} />
          </div>
          <div className="flex flex-col items-center pt-8 md:pt-0 md:pl-10">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Tingkat Keamanan Produk</h3>
            <HalfDonutChart score={result.engineResult.safetyScore} label={result.engineResult.safetyLabel} colorClass={result.engineResult.safetyScore >= 70 ? 'text-emerald-500' : result.engineResult.safetyScore >= 40 ? 'text-amber-500' : 'text-rose-500'} />
            <RenderFlags flags={result.engineResult.safetyFlags} />
          </div>
        </div>

        {/* FOOTER PROFIL PENGGUNA TERINTEGRASI */}
        {userProfile ? (
          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3 text-sm animate-in slide-in-from-bottom-4 duration-500">
            <span className="text-slate-500 font-bold text-xs uppercase tracking-widest mr-1">Berdasarkan Profil Kulitmu:</span>
            <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl font-bold capitalize shadow-sm">
              {userProfile.skinType}
            </span>
            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl font-bold capitalize shadow-sm">
              Jerawat {userProfile.severity.toLowerCase()}
            </span>
            {userProfile.isPregnantOrNursing && (
              <span className="bg-pink-50 text-pink-700 border border-pink-200 px-3 py-1.5 rounded-xl font-bold shadow-sm">
                🤰 Bumil / Busui
              </span>
            )}
          </div>
        ) : (
          <div className="mt-10 pt-6 border-t border-slate-100 flex items-center justify-center text-sm text-slate-400 font-medium">
            Memuat detail profil uji...
          </div>
        )}
      </div>
    </div>
  );
}