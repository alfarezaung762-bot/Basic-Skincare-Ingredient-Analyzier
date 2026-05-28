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
  aiHybridData?: {
    formulationFocus?: {
      primary: string;
      secondary: string[];
      agreesWithEngine: boolean;
      reasoning: string;
    };
    synergyAnalysis?: { pair: string; effect: string; verdict: "POSITIVE" | "NEUTRAL" }[];
    warningsAndAdvice?: {
      clashes: { pair: string; risk: string; severity: "LOW" | "MEDIUM" | "HIGH"; contextualAdvice: string }[];
      generalAdvice: string[];
    };
    aiUnknownAnalysis?: string;
    adjustmentsSummary?: { trigger: string; neutralizers: string[]; restored: number; type: string }[];
    modelUsed?: string;
  } | null;
}

export interface UserProfileSummary {
  skinType: string;
  severity: string;
  isPregnantOrNursing: boolean;
}

// --- KOMPONEN FLAG ITEM (DENGAN TRUNCATE 30 KATA) ---
const FlagItem = ({ flag }: { flag: FlagDetail }) => {
  const [expanded, setExpanded] = useState(false);

  let style = "border-slate-300 bg-slate-50 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600";
  let icon = "ℹ️";
  let badgeStyle = "bg-slate-400/80 text-white";

  if (flag.type === "CRITICAL") {
    style = "border-rose-400/60 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-700/50";
    badgeStyle = "bg-rose-400/80 text-white shadow-sm";
    icon = "🚨";
  } else if (flag.type === "WARNING") {
    style = "border-amber-400/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700/50";
    badgeStyle = "bg-amber-400/80 text-white shadow-sm";
    icon = "⚠️";
  } else if (flag.type === "SUCCESS") {
    style = "border-emerald-400/60 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700/50";
    badgeStyle = "bg-emerald-400/80 text-white shadow-sm";
    icon = "✅";
  }

  let penaltyBadgeStyle = "text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-800/50";
  if (flag.type === "WARNING") {
    penaltyBadgeStyle = "text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/50";
  }

  const words = flag.message.split(/\s+/);
  const isLong = words.length > 30;
  const displayText = isLong && !expanded ? words.slice(0, 30).join(" ") + "..." : flag.message;

  const isDeteksiButa = flag.message.includes("Deteksi Buta");
  const animationClass = isDeteksiButa ? "animate-[pulse_3s_ease-in-out_infinite] shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400" : "";

  return (
    <div className={`p-4 rounded-xl border-l-4 text-xs font-semibold leading-relaxed shadow-sm flex flex-col sm:flex-row items-start gap-3 border ${style} ${animationClass}`}>
      <span className="text-base shrink-0">{icon}</span>
      <div className="flex-1 w-full">
        <p>
          {displayText}
          {isLong && (
            <button onClick={() => setExpanded(!expanded)} className="ml-1 text-[10px] font-bold text-blue-500 dark:text-blue-400 hover:underline">
              {expanded ? "Sembunyikan" : "Baca selengkapnya"}
            </button>
          )}
        </p>
        {/* LENCANA BAHAN PEMICU (CULPRITS) */}
        {flag.culprits && flag.culprits.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {flag.culprits.map((culprit, cIdx) => (
              <span
                key={cIdx}
                className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider animate-[pulse_4s_ease-in-out_infinite] ${badgeStyle}`}
              >
                {culprit}
              </span>
            ))}
          </div>
        )}
        {/* BADGE PENALTI SKOR */}
        {flag.pointsDeducted > 0 && (
          <span className={`inline-block mt-2.5 px-2.5 py-0.5 rounded-md bg-white/60 dark:bg-slate-700/60 text-[9px] font-black uppercase tracking-wider shadow-sm border ${penaltyBadgeStyle}`}>
            Penalti Skor: -{flag.pointsDeducted} Poin
          </span>
        )}
      </div>
    </div>
  );
};

// --- FUNGSI RENDER FLAGS ---
const RenderFlags = ({ flags }: { flags: FlagDetail[] }) => {
  if (!flags || flags.length === 0) return (
    <div className="p-4 mt-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-medium text-center">
      Tidak ada catatan khusus. Produk ini lulus evaluasi klinis.
    </div>
  );

  return (
    <div className="space-y-3 mt-6 w-full animate-in fade-in-50 slide-in-from-top-2 duration-300">
      {flags.map((flag, idx) => (
        <FlagItem key={idx} flag={flag} />
      ))}
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

  let glowColor = "rgba(16, 185, 129, 0.4)"; // Hijau (>= 70)
  let pulseClass = "";
  if (score < 70) {
    glowColor = "rgba(245, 158, 11, 0.4)"; // Kuning (40-69)
  }
  if (score < 40) {
    glowColor = "rgba(244, 63, 94, 0.6)"; // Merah (< 40)
    pulseClass = "animate-pulse"; 
  }

  return (
    <div className="flex flex-col items-center w-full">
      <div className={`relative w-48 h-24 flex justify-center ${pulseClass}`}>
        <svg className="w-full h-full absolute top-0" viewBox="0 0 100 50" style={{ overflow: 'visible' }}>
          <path d={`M ${strokeWidth/2} 50 A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${100 - strokeWidth/2} 50`} fill="transparent" stroke="#F1F5F9" strokeWidth={strokeWidth} strokeLinecap="round" className="dark:stroke-slate-700" />
          
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
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-3 bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full">
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
      <div className="bg-white dark:bg-slate-900 p-6 md:p-10 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 relative">
        <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-4 mb-8 text-center uppercase tracking-widest">
          Laporan Evaluasi Produk
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800 relative">
          
          {/* IKON PULSE TENGAH */}
          {hasWarning && (
            <div className="hidden md:flex absolute top-20 left-1/2 -translate-x-1/2 z-20 items-center justify-center">
              <span className="flex h-10 w-10 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-10 w-10 bg-rose-500 text-white items-center justify-center text-sm shadow-[0_0_15px_rgba(244,63,94,0.5)] border-2 border-white dark:border-slate-900">⚠️</span>
              </span>
            </div>
          )}

          <div className="flex flex-col items-center">
            <div className="relative group flex items-center justify-center gap-1.5 mb-6 cursor-help" tabIndex={0}>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Kecocokan Profil Kulit</h3>
              <span className="text-slate-400 dark:text-slate-500 text-xs">ⓘ</span>
              <div className="absolute bottom-full mb-2 w-56 p-3 bg-slate-800 text-white text-[10px] leading-relaxed font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible focus:opacity-100 focus:visible transition-all z-30 text-center shadow-xl border border-slate-700 pointer-events-none">
                Menilai sejauh mana produk sesuai dengan jenis dan target kulitmu (seperti tekstur dan kelembapan). Skor rendah berarti produk kurang efektif atau kurang nyaman untuk estetikamu.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
            <HalfDonutChart score={result.engineResult.matchScore} label={result.engineResult.matchLabel} colorClass={result.engineResult.matchScore >= 75 ? 'text-emerald-500' : result.engineResult.matchScore >= 50 ? 'text-amber-500' : 'text-rose-500'} />
            <RenderFlags flags={result.engineResult.matchFlags} />
          </div>
          <div className="flex flex-col items-center pt-8 md:pt-0 md:pl-10">
            <div className="relative group flex items-center justify-center gap-1.5 mb-6 cursor-help" tabIndex={0}>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tingkat Keamanan Produk</h3>
              <span className="text-slate-400 dark:text-slate-500 text-xs">ⓘ</span>
              <div className="absolute bottom-full mb-2 w-56 p-3 bg-slate-800 text-white text-[10px] leading-relaxed font-medium rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible focus:opacity-100 focus:visible transition-all z-30 text-center shadow-xl border border-slate-700 pointer-events-none">
                Menilai tingkat keamanan klinis produk. Memperhitungkan risiko alergi, iritasi, kerusakan barrier, dan bahan toksik. Skor rendah berarti produk berisiko medis jika digunakan.
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
              </div>
            </div>
            <HalfDonutChart score={result.engineResult.safetyScore} label={result.engineResult.safetyLabel} colorClass={result.engineResult.safetyScore >= 80 ? 'text-emerald-500' : result.engineResult.safetyScore >= 60 ? 'text-amber-500' : 'text-rose-500'} />
            <RenderFlags flags={result.engineResult.safetyFlags} />
          </div>
        </div>

        {/* FOOTER PROFIL PENGGUNA TERINTEGRASI */}
        {userProfile ? (
          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-3 text-sm animate-in slide-in-from-bottom-4 duration-500">
            <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-widest mr-1">Berdasarkan Profil Kulitmu:</span>
            <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-xl font-bold capitalize shadow-sm">
              {userProfile.skinType}
            </span>
            <span className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-3 py-1.5 rounded-xl font-bold capitalize shadow-sm">
              Jerawat {userProfile.severity.toLowerCase()}
            </span>
            {userProfile.isPregnantOrNursing && (
              <span className="bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800 px-3 py-1.5 rounded-xl font-bold shadow-sm">
                🤰 Bumil / Busui
              </span>
            )}
          </div>
        ) : (
          <div className="mt-10 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 font-medium">
            Memuat detail profil uji...
          </div>
        )}
      </div>
    </div>
  );
}