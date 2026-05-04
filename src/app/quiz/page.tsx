// src/app/quiz/page.tsx
"use client";

import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const QUIZ_STEPS = [
  {
    id: "dahi",
    title: "Minyak di Area Dahi",
    desc: "Bagaimana kondisi kertas minyak yang kamu tempelkan di dahi?",
    emoji: "💆‍♀️",
    options: [
      { label: "Banyak minyak (transparan)", value: "oily" },
      { label: "Sedikit minyak / Normal", value: "normal" },
      { label: "Kering / Tidak ada minyak", value: "dry" }
    ]
  },
  {
    id: "hidung",
    title: "Minyak di Area Hidung",
    desc: "Bagaimana dengan kertas minyak di area hidungmu?",
    emoji: "👃",
    options: [
      { label: "Banyak minyak menempel", value: "oily" },
      { label: "Sedikit minyak", value: "normal" },
      { label: "Kering sama sekali", value: "dry" }
    ]
  },
  {
    id: "pipi",
    title: "Minyak di Kedua Pipi",
    desc: "Bagaimana rata-rata hasil kertas minyak di pipi kiri dan kanan?",
    emoji: "😊",
    options: [
      { label: "Banyak minyak", value: "oily" },
      { label: "Sedikit / Normal", value: "normal" },
      { label: "Sangat kering / Terasa ketarik", value: "dry" }
    ]
  },
  {
    id: "dagu",
    title: "Minyak di Area Dagu",
    desc: "Terakhir untuk tes kertas, bagaimana di area dagu?",
    emoji: "👇",
    options: [
      { label: "Berminyak", value: "oily" },
      { label: "Normal", value: "normal" },
      { label: "Kering", value: "dry" }
    ]
  },
  {
    id: "sensitif",
    title: "Sensitivitas Kulit",
    desc: "Apakah kulitmu mudah kemerahan, perih, atau gatal saat mencoba skincare baru atau terkena panas?",
    emoji: "🌡️",
    options: [
      { label: "Ya, sangat sering", value: "sensitive" },
      { label: "Jarang terjadi", value: "normal" },
    ]
  },
];

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPage = searchParams.get("from");
  const [phase, setPhase] = useState<"tutorial" | "quiz" | "calculating" | "result">("tutorial");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finalResult, setFinalResult] = useState<{ type: string; notes: string } | null>(null);

  const stepData = QUIZ_STEPS[currentStep];
  const progress = ((currentStep) / QUIZ_STEPS.length) * 100;

  const calculateSkinType = (finalAnswers: Record<string, string>) => {
    setPhase("calculating");
    
    setTimeout(() => {
      let type = "Normal";
      let notes = "";

      const tZoneOily = finalAnswers.dahi === "oily" || finalAnswers.hidung === "oily" || finalAnswers.dagu === "oily";
      const uZoneOily = finalAnswers.pipi === "oily";
      const uZoneDry = finalAnswers.pipi === "dry";
      const allDry = finalAnswers.dahi === "dry" && finalAnswers.hidung === "dry" && finalAnswers.pipi === "dry" && finalAnswers.dagu === "dry";

      if (allDry) {
        type = "Kering";
        notes = "Kulitmu memproduksi sangat sedikit sebum. Fokus pada hidrasi maksimal (Hyaluronic Acid, Ceramide).";
      } else if (tZoneOily && uZoneOily) {
        type = "Berminyak";
        notes = "Sebum diproduksi merata di seluruh wajah. Gunakan skincare non-comedogenic.";
      } else if (tZoneOily && uZoneDry) {
        type = "Kombinasi";
        notes = "T-Zone berminyak tapi area pipi kering. Kamu mungkin butuh moisturizer yang ringan namun melembapkan.";
      } else {
        type = "Normal";
        notes = "Keseimbangan air dan minyak di kulitmu sangat baik! Pertahankan dengan basic skincare.";
      }

      if (finalAnswers.sensitif === "sensitive") type += " & Sensitif";

      setFinalResult({ type, notes });
      setPhase("result");
    }, 2000); 
  };

  const handleSelect = (value: string) => {
    const newAnswers = { ...answers, [stepData.id]: value };
    setAnswers(newAnswers);

    if (currentStep < QUIZ_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      calculateSkinType(newAnswers); 
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
    else setPhase("tutorial"); 
  };

  const handleSaveToProfile = () => {
    if (finalResult) {
      localStorage.setItem("quizSkinType", finalResult.type);
    }
    alert(`Tersimpan! Jenis kulitmu: ${finalResult?.type}`);
    if (fromPage === "firstprofile") {
      window.location.href = "/profile/firstprofile";
    } else {
      window.location.href = "/profile";
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center py-12 px-4 overflow-hidden relative">
      {/* Ambient Blobs */}
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      
      <div className="w-full max-w-2xl mb-8 relative z-10">
        <Link
          href={fromPage === "firstprofile" ? "/profile/firstprofile" : "/profile"}
          className="text-sm font-bold text-slate-500 hover:text-teal-600 flex items-center gap-2 mb-6 w-fit transition-colors group"
        >
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Kembali ke {fromPage === "firstprofile" ? "Kuesioner Profil" : "Profil"}
        </Link>
        
        {phase === "quiz" && (
          <div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <motion.div 
                className="bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400 h-2.5 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-right text-xs font-bold text-slate-400 mt-2">
              Langkah {currentStep + 1} dari {QUIZ_STEPS.length}
            </p>
          </div>
        )}
      </div>

      <div className="w-full max-w-2xl glass-card min-h-[450px] rounded-3xl shadow-[0_8px_40px_rgba(13,148,136,0.08)] overflow-hidden relative z-10">
        {/* Gradient accent top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400" />

        <AnimatePresence mode="wait">
          
          {phase === "tutorial" && (
            <motion.div
              key="tutorial"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-8 md:p-12 flex flex-col items-center h-full"
            >
              <h2 className="text-2xl font-black text-slate-900 mb-2 text-center">Cara Cek Jenis Kulit 🔬</h2>
              <p className="text-slate-500 text-sm font-medium mb-8 text-center max-w-md">
                Siapkan 5 helai kertas minyak (blotting paper) atau tisu tipis 1 lapis untuk tes ini.
              </p>

              <div className="relative w-48 h-56 bg-gradient-to-b from-slate-50 to-teal-50/30 rounded-[3rem] border-4 border-slate-200 flex justify-center mb-10">
                <div className="absolute top-16 left-12 w-3 h-3 bg-slate-300 rounded-full"></div>
                <div className="absolute top-16 right-12 w-3 h-3 bg-slate-300 rounded-full"></div>
                <div className="absolute bottom-16 w-8 h-2 bg-slate-300 rounded-full"></div>

                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.9, scale: 1 }} transition={{ delay: 0.5 }} className="absolute top-6 w-16 h-8 bg-teal-200/80 rounded border border-teal-400 flex items-center justify-center text-[10px] font-bold text-teal-700">Dahi</motion.div>
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.9, scale: 1 }} transition={{ delay: 0.8 }} className="absolute top-24 w-8 h-10 bg-cyan-200/80 rounded border border-cyan-400 flex items-center justify-center text-[10px] font-bold text-cyan-700">Hidung</motion.div>
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.9, scale: 1 }} transition={{ delay: 1.1 }} className="absolute top-28 left-4 w-10 h-10 bg-indigo-200/80 rounded border border-indigo-400 flex items-center justify-center text-[10px] font-bold text-indigo-700">Pipi</motion.div>
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.9, scale: 1 }} transition={{ delay: 1.1 }} className="absolute top-28 right-4 w-10 h-10 bg-indigo-200/80 rounded border border-indigo-400 flex items-center justify-center text-[10px] font-bold text-indigo-700">Pipi</motion.div>
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.9, scale: 1 }} transition={{ delay: 1.4 }} className="absolute bottom-6 w-12 h-6 bg-amber-200/80 rounded border border-amber-400 flex items-center justify-center text-[10px] font-bold text-amber-700">Dagu</motion.div>
              </div>

              <div className="space-y-4 w-full mb-8">
                <div className="flex gap-4 items-start">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <p className="text-sm font-medium text-slate-700">Cuci muka dengan sabun lembut, keringkan, lalu <strong>tunggu 1 jam tanpa memakai produk apapun.</strong></p>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <p className="text-sm font-medium text-slate-700">Tempelkan kertas di ke-<strong>5</strong> area tersebut secara bersamaan, tunggu 15 detik, lalu amati hasilnya.</p>
                </div>
              </div>

              <button 
                onClick={() => setPhase("quiz")}
                className="w-full px-8 py-4 gradient-btn rounded-2xl flex items-center justify-center gap-2"
              >
                <span className="relative z-10 flex items-center gap-2"><span>Saya Sudah Tes, Lanjut Isi Hasil</span> <span>→</span></span>
              </button>
            </motion.div>
          )}

          {phase === "quiz" && (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="p-8 md:p-12 flex flex-col h-full"
            >
              <motion.div 
                className="text-6xl mb-6 flex justify-center"
                animate={{ y: [0, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                {stepData.emoji}
              </motion.div>

              <h2 className="text-2xl font-black text-slate-900 mb-4 text-center">
                {stepData.title}
              </h2>
              <p className="text-slate-600 font-medium mb-8 text-center leading-relaxed">
                {stepData.desc}
              </p>

              <div className="space-y-3 mt-auto">
                {stepData.options.map((opt, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleSelect(opt.value)}
                    className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white/60 text-slate-700 font-bold hover:border-teal-400 hover:bg-gradient-to-r hover:from-teal-500 hover:to-cyan-500 hover:text-white transition-all duration-300 hover:shadow-lg hover:shadow-teal-200/40"
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>

              <button 
                onClick={handleBack}
                className="mt-6 text-sm font-bold text-slate-400 hover:text-teal-600 transition-colors text-center"
              >
                {currentStep === 0 ? "← Kembali ke Tutorial" : "← Ubah Jawaban Sebelumnya"}
              </button>
            </motion.div>
          )}

          {phase === "calculating" && (
             <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-12 flex flex-col items-center justify-center h-full min-h-[450px]"
             >
                <div className="relative mb-6">
                  <div className="w-16 h-16 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-b-indigo-400 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
                </div>
                <h2 className="text-xl font-bold gradient-text animate-pulse">Menganalisis Pola Kulitmu...</h2>
                <p className="text-sm text-slate-400 mt-2">Tunggu sebentar ya ✨</p>
             </motion.div>
          )}

          {phase === "result" && finalResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 md:p-12 flex flex-col items-center h-full min-h-[450px] text-center"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner ring-2 ring-teal-200">
                ✨
              </div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Hasil Analisis</h2>
              <h1 className="text-4xl font-black mb-4">
                <span className="gradient-text">{finalResult.type}</span>
              </h1>
              <p className="text-slate-600 font-medium leading-relaxed mb-8 max-w-md">
                {finalResult.notes}
              </p>

              <button 
                onClick={handleSaveToProfile}
                className="w-full md:w-auto px-8 py-4 gradient-btn rounded-2xl mt-auto"
              >
                <span className="relative z-10">Simpan ke Profil Kulitku</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}

export default function SkinQuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-teal-100 border-t-teal-500 rounded-full animate-spin"></div>
        </div>
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}
