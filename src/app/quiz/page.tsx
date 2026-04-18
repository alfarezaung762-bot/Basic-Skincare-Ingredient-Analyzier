// src/app/quiz/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
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

export default function SkinQuizPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<"tutorial" | "quiz" | "calculating" | "result">("tutorial");
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finalResult, setFinalResult] = useState<{ type: string; notes: string } | null>(null);

  const stepData = QUIZ_STEPS[currentStep];
  const progress = ((currentStep) / QUIZ_STEPS.length) * 100;

  // PERBAIKAN: Fungsi ini sekarang menerima data finalAnswers secara langsung
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

      // Membaca dari finalAnswers, bukan dari state yang tertinggal
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
      // PERBAIKAN: Kirim newAnswers agar AI membaca jawaban terbaru
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
    window.location.href = "/profile";
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-4 overflow-hidden">
      
      <div className="w-full max-w-2xl mb-8">
        <Link href="/profile" className="text-sm font-bold text-slate-500 hover:text-slate-900 flex items-center gap-2 mb-6 w-fit">
          <span>←</span> Kembali ke Profil
        </Link>
        
        {phase === "quiz" && (
          <div>
            <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
              <motion.div 
                className="bg-black h-2.5 rounded-full"
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

      <div className="w-full max-w-2xl bg-white min-h-[450px] rounded-3xl shadow-sm border border-slate-200 overflow-hidden relative">
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

              <div className="relative w-48 h-56 bg-slate-100 rounded-[3rem] border-4 border-slate-200 flex justify-center mb-10">
                <div className="absolute top-16 left-12 w-3 h-3 bg-slate-300 rounded-full"></div>
                <div className="absolute top-16 right-12 w-3 h-3 bg-slate-300 rounded-full"></div>
                <div className="absolute bottom-16 w-8 h-2 bg-slate-300 rounded-full"></div>

                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.8, scale: 1 }} transition={{ delay: 0.5 }} className="absolute top-6 w-16 h-8 bg-blue-200/80 rounded border border-blue-400 flex items-center justify-center text-[10px] font-bold text-blue-700">Dahi</motion.div>
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.8, scale: 1 }} transition={{ delay: 0.8 }} className="absolute top-24 w-8 h-10 bg-blue-200/80 rounded border border-blue-400 flex items-center justify-center text-[10px] font-bold text-blue-700">Hidung</motion.div>
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.8, scale: 1 }} transition={{ delay: 1.1 }} className="absolute top-28 left-4 w-10 h-10 bg-blue-200/80 rounded border border-blue-400 flex items-center justify-center text-[10px] font-bold text-blue-700">Pipi</motion.div>
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.8, scale: 1 }} transition={{ delay: 1.1 }} className="absolute top-28 right-4 w-10 h-10 bg-blue-200/80 rounded border border-blue-400 flex items-center justify-center text-[10px] font-bold text-blue-700">Pipi</motion.div>
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 0.8, scale: 1 }} transition={{ delay: 1.4 }} className="absolute bottom-6 w-12 h-6 bg-blue-200/80 rounded border border-blue-400 flex items-center justify-center text-[10px] font-bold text-blue-700">Dagu</motion.div>
              </div>

              <div className="space-y-4 w-full mb-8">
                <div className="flex gap-4 items-start">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">1</span>
                  <p className="text-sm font-medium text-slate-700">Cuci muka dengan sabun lembut, keringkan, lalu <strong>tunggu 1 jam tanpa memakai produk apapun.</strong></p>
                </div>
                <div className="flex gap-4 items-start">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">2</span>
                  <p className="text-sm font-medium text-slate-700">Tempelkan kertas di ke-<strong>5</strong> area tersebut secara bersamaan, tunggu 15 detik, lalu amati hasilnya.</p>
                </div>
              </div>

              <button 
                onClick={() => setPhase("quiz")}
                className="w-full px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-slate-800 transition-all transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <span>Saya Sudah Tes, Lanjut Isi Hasil</span> <span>→</span>
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
                  <button
                    key={idx}
                    onClick={() => handleSelect(opt.value)}
                    className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-700 font-bold hover:border-black hover:bg-black hover:text-white transform active:scale-95 transition-all duration-200"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <button 
                onClick={handleBack}
                className="mt-6 text-sm font-bold text-slate-400 hover:text-slate-800 transition-colors text-center"
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
                <div className="w-16 h-16 border-4 border-slate-200 border-t-black rounded-full animate-spin mb-6"></div>
                <h2 className="text-xl font-bold text-slate-900 animate-pulse">Menganalisis Pola Kulitmu...</h2>
             </motion.div>
          )}

          {phase === "result" && finalResult && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 md:p-12 flex flex-col items-center h-full min-h-[450px] text-center"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-4xl mb-6 shadow-inner">
                ✨
              </div>
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Hasil Analisis</h2>
              <h1 className="text-4xl font-black text-slate-900 mb-4">{finalResult.type}</h1>
              <p className="text-slate-600 font-medium leading-relaxed mb-8 max-w-md">
                {finalResult.notes}
              </p>

              <button 
                onClick={handleSaveToProfile}
                className="w-full md:w-auto px-8 py-4 bg-black text-white font-bold rounded-2xl hover:bg-slate-800 shadow-xl transform active:scale-95 transition-all mt-auto"
              >
                Simpan ke Profil Kulitku
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </main>
  );
}