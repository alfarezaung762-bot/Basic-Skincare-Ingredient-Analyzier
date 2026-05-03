// src/app/profile/firstprofile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { id: 1, title: "Halo! Siapa kamu?", subtitle: "Yuk, mulai kenalan dulu ✨", emoji: "👋" },
  { id: 2, title: "Kenali Kulitmu", subtitle: "Setiap kulit itu unik, seperti dirimu 🌸", emoji: "🧴" },
  { id: 3, title: "Kondisi Jerawat", subtitle: "Jujur ya, ini rahasia kita 🤫", emoji: "🔬" },
  { id: 4, title: "Target & Alergi", subtitle: "Biar AI-mu makin pintar rekomendasinya 💡", emoji: "🎯" },
];

const SKIN_TYPES = [
  { id: "Normal", label: "Normal", icon: "😊", desc: "Seimbang, tidak terlalu berminyak atau kering" },
  { id: "Kering", label: "Kering", icon: "🏜️", desc: "Terasa ketarik, kusam, atau mengelupas" },
  { id: "Berminyak", label: "Berminyak", icon: "💧", desc: "Kilap di seluruh wajah, pori besar" },
  { id: "Kombinasi", label: "Kombinasi", icon: "☯️", desc: "T-zone berminyak, pipi normal/kering" },
];

const SEVERITY_OPTIONS = [
  { id: "BIASA", label: "Biasa / Bersih", icon: "✅", desc: "Tidak ada masalah berarti", color: "emerald" },
  { id: "SEDANG", label: "Sedang", icon: "⚠️", desc: "Ada beruntusan atau jerawat kecil", color: "amber" },
  { id: "PARAH", label: "Parah / Meradang", icon: "🔴", desc: "Banyak jerawat aktif / meradang", color: "rose" },
];

const FOCUS_OPTIONS = [
  { id: "Mencerahkan & Bekas Jerawat", icon: "✨", color: "from-yellow-400/20 to-orange-400/20" },
  { id: "Merawat Jerawat & Sebum", icon: "🛡️", color: "from-blue-400/20 to-indigo-400/20" },
  { id: "Anti-Aging & Garis Halus", icon: "⏳", color: "from-purple-400/20 to-pink-400/20" },
  { id: "Memperbaiki Skin Barrier & Hidrasi", icon: "🧱", color: "from-teal-400/20 to-cyan-400/20" },
  { id: "Menenangkan Kemerahan (Soothing)", icon: "🌿", color: "from-green-400/20 to-emerald-400/20" },
  { id: "Eksfoliasi & Tekstur Pori-pori", icon: "🌪️", color: "from-slate-400/20 to-gray-400/20" },
];

export default function FirstProfilePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [baseSkin, setBaseSkin] = useState("Normal");
  const [isSensitive, setIsSensitive] = useState(false);
  const [isPregnant, setIsPregnant] = useState(false);
  const [severity, setSeverity] = useState("BIASA");
  const [focuses, setFocuses] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");

  // Sinkronisasi hasil quiz jika ada
  useEffect(() => {
    const quizResult = localStorage.getItem("quizSkinType");
    if (quizResult) {
      if (quizResult.includes("& Sensitif")) {
        setIsSensitive(true);
        setBaseSkin(quizResult.replace(" & Sensitif", ""));
      } else if (quizResult === "Sensitif") {
        setIsSensitive(true);
        setBaseSkin("Normal");
      } else {
        setBaseSkin(quizResult);
      }
    }
  }, []);

  const skinType = isSensitive ? `${baseSkin} & Sensitif` : baseSkin;

  const goNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goPrev = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const toggleFocus = (id: string) => {
    if (focuses.includes(id)) {
      setFocuses(focuses.filter((f) => f !== id));
    } else if (focuses.length < 3) {
      setFocuses([...focuses, id]);
    }
  };

  const handleSubmit = async () => {
    if (focuses.length === 0) {
      setError("Pilih minimal 1 fokus utama perawatan kulitmu.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age,
          skinType,
          severity,
          primaryFocus: focuses.join(","),
          allergies,
          isPregnantOrNursing: isPregnant,
        }),
      });
      if (res.ok) {
        localStorage.removeItem("quizSkinType");
        router.push("/profile");
        router.refresh();
      } else {
        const d = await res.json();
        setError(d.message || "Gagal menyimpan profil.");
      }
    } catch {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;
  const currentStep = STEPS[step];

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
  };

  const canProceedStep0 = name.trim().length >= 2 && age.trim() !== "" && Number(age) >= 10;
  const canProceedStep2 = true;
  const canProceedStep3 = focuses.length > 0;

  const canProceed = [canProceedStep0, true, canProceedStep2, canProceedStep3][step];

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-sky-50 flex flex-col items-center justify-center px-4 py-10 font-sans overflow-hidden relative">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-pink-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-200/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-100/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-pink-100 px-4 py-1.5 rounded-full text-xs font-bold text-pink-500 mb-4 shadow-sm">
            <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse" />
            SkinTech Analyzer
          </div>
          <h1 className="text-2xl font-black text-slate-800">Profil Kulit Pertamamu</h1>
          <p className="text-slate-500 text-sm mt-1">Lengkapi 4 langkah singkat untuk hasil analisis yang akurat</p>
        </motion.div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <motion.div
                  animate={{
                    backgroundColor: i <= step ? "#f43f5e" : "#e2e8f0",
                    scale: i === step ? 1.15 : 1,
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shadow-sm"
                >
                  {i < step ? "✓" : i + 1}
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div className="w-16 md:w-24 h-1 rounded-full bg-slate-200 overflow-hidden">
                    <motion.div
                      animate={{ width: i < step ? "100%" : "0%" }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_40px_rgba(244,63,94,0.08)] border border-white overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-rose-400 via-pink-400 to-sky-400 p-6 text-white">
            <motion.div
              key={step + "-header"}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-4"
            >
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                {currentStep.emoji}
              </div>
              <div>
                <p className="text-white/70 text-xs font-semibold uppercase tracking-widest">Langkah {step + 1} dari 4</p>
                <h2 className="text-xl font-black">{currentStep.title}</h2>
                <p className="text-white/80 text-sm">{currentStep.subtitle}</p>
              </div>
            </motion.div>
          </div>

          {/* Card Body */}
          <div className="p-6 min-h-[340px] flex flex-col">
            <AnimatePresence mode="wait" custom={direction}>
              {/* === STEP 1: Nama & Umur === */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col gap-5 flex-1"
                >
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Nama Panggilanmu 😊</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Sarah, Dika, Nana..."
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-pink-300 focus:outline-none bg-slate-50 text-slate-800 font-medium transition-all text-sm placeholder:text-slate-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">Umurmu 🎂</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="Contoh: 22"
                      min="10"
                      max="100"
                      className="w-full px-4 py-3.5 rounded-2xl border-2 border-slate-100 focus:border-pink-300 focus:outline-none bg-slate-50 text-slate-800 font-medium transition-all text-sm placeholder:text-slate-400"
                    />
                  </div>
                  <div className="mt-auto p-4 bg-gradient-to-r from-pink-50 to-sky-50 rounded-2xl border border-pink-100">
                    <p className="text-xs text-slate-500 font-medium">🔒 Data ini hanya digunakan untuk mempersonalisasi analisis bahan skincare-mu. Tidak dibagikan ke siapapun.</p>
                  </div>
                </motion.div>
              )}

              {/* === STEP 2: Jenis Kulit === */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col gap-4 flex-1"
                >
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-700">Pilih jenis kulitmu:</p>
                    <Link
                      href="/quiz?from=firstprofile"
                      className="flex items-center gap-1.5 text-xs font-bold text-sky-600 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-xl hover:bg-sky-100 transition-all"
                    >
                      <span>🤔</span> Bingung? Lakukan Tes!!!
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {SKIN_TYPES.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBaseSkin(t.id)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all ${
                          baseSkin === t.id
                            ? "border-pink-400 bg-gradient-to-br from-pink-50 to-rose-50 shadow-md"
                            : "border-slate-100 bg-slate-50 hover:border-pink-200"
                        }`}
                      >
                        <div className="text-2xl mb-1">{t.icon}</div>
                        <div className="font-bold text-sm text-slate-800">{t.label}</div>
                        <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{t.desc}</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setIsSensitive(!isSensitive)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                        isSensitive ? "border-rose-300 bg-rose-50" : "border-slate-100 bg-slate-50 hover:border-rose-200"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isSensitive ? "bg-rose-500 border-rose-500" : "border-slate-300"}`}>
                        {isSensitive && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Kulit saya rentan Kemerahan / Sensitif 🌡️</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPregnant(!isPregnant)}
                      className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${
                        isPregnant ? "border-pink-300 bg-pink-50" : "border-slate-100 bg-slate-50 hover:border-pink-200"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${isPregnant ? "bg-pink-500 border-pink-500" : "border-slate-300"}`}>
                        {isPregnant && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <span className="text-sm font-semibold text-slate-700">Saya sedang Hamil atau Menyusui 🤰</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {/* === STEP 3: Tingkat Keparahan === */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col gap-4 flex-1"
                >
                  <p className="text-sm font-bold text-slate-700">Bagaimana kondisi jerawat kulitmu saat ini?</p>
                  <div className="space-y-3">
                    {SEVERITY_OPTIONS.map((opt) => {
                      const isSelected = severity === opt.id;
                      const colorMap: Record<string, string> = {
                        emerald: isSelected ? "border-emerald-400 bg-emerald-50" : "border-slate-100 hover:border-emerald-200",
                        amber: isSelected ? "border-amber-400 bg-amber-50" : "border-slate-100 hover:border-amber-200",
                        rose: isSelected ? "border-rose-400 bg-rose-50" : "border-slate-100 hover:border-rose-200",
                      };
                      const dotMap: Record<string, string> = {
                        emerald: "bg-emerald-500",
                        amber: "bg-amber-500",
                        rose: "bg-rose-500",
                      };
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSeverity(opt.id)}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${colorMap[opt.color]} ${isSelected ? "shadow-md" : "bg-slate-50"}`}
                        >
                          <span className="text-2xl">{opt.icon}</span>
                          <div className="text-left flex-1">
                            <div className="font-bold text-slate-800 text-sm">{opt.label}</div>
                            <div className="text-xs text-slate-500">{opt.desc}</div>
                          </div>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? `${dotMap[opt.color]} border-transparent` : "border-slate-300"}`}>
                            {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* === STEP 4: Fokus & Alergi === */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="flex flex-col gap-4 flex-1"
                >
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold text-slate-700">Fokus utama skincare-mu:</p>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${focuses.length >= 3 ? "bg-rose-100 text-rose-600" : "bg-pink-50 text-pink-500"}`}>
                      {focuses.length}/3
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 -mt-2">Pilih maksimal 3 agar tidak overload bahan aktif</p>

                  <div className="grid grid-cols-2 gap-2">
                    {FOCUS_OPTIONS.map((f) => {
                      const isSelected = focuses.includes(f.id);
                      const isDisabled = !isSelected && focuses.length >= 3;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => toggleFocus(f.id)}
                          className={`p-3 rounded-2xl border-2 text-left transition-all ${
                            isSelected
                              ? "border-pink-400 bg-gradient-to-br from-pink-50 to-rose-50 shadow-md"
                              : isDisabled
                              ? "border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed"
                              : "border-slate-100 bg-slate-50 hover:border-pink-200"
                          }`}
                        >
                          <div className="text-xl mb-1">{f.icon}</div>
                          <div className="text-[11px] font-bold text-slate-700 leading-tight">{f.id}</div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-1.5 mt-1">
                    <label className="block text-sm font-bold text-slate-700">Alergi Bahan <span className="font-normal text-slate-400">(Opsional)</span></label>
                    <input
                      type="text"
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      placeholder="Contoh: Fragrance, Alcohol, Retinol..."
                      className="w-full px-4 py-3 rounded-2xl border-2 border-slate-100 focus:border-pink-300 focus:outline-none bg-slate-50 text-slate-800 font-medium transition-all text-sm placeholder:text-slate-400"
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-600">
                      {error}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            <div className={`flex gap-3 mt-6 ${step === 0 ? "justify-end" : "justify-between"}`}>
              {step > 0 && (
                <button
                  onClick={goPrev}
                  className="px-5 py-3 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  ← Kembali
                </button>
              )}

              {step < STEPS.length - 1 ? (
                <button
                  onClick={goNext}
                  disabled={!canProceed}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  Lanjutkan →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isLoading || !canProceed}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg shadow-rose-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Simpan Profil Kulitku ✨"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Sudah punya akun profil?{" "}
          <Link href="/profile" className="text-pink-500 font-bold hover:underline">
            Lihat Profil Saya
          </Link>
        </p>
      </div>
    </main>
  );
}
