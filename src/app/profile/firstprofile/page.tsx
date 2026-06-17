// src/app/profile/firstprofile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STEPS = [
    { id: 1, title: "Halo! Siapa kamu?", subtitle: "Yuk, mulai kenalan dulu ✨", emoji: "👋" },
    { id: 2, title: "Kenali Kulitmu", subtitle: "Setiap kulit itu unik, seperti dirimu 🌿", emoji: "🧴" },
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
    { id: "BIASA", label: "Biasa / Bersih", icon: "✅", desc: "Tidak ada masalah berarti", sel: "border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-200", dot: "bg-emerald-500", hover: "hover:border-emerald-200" },
    { id: "SEDANG", label: "Sedang", icon: "⚠️", desc: "Ada beruntusan atau jerawat kecil", sel: "border-amber-400 bg-amber-50/80 ring-2 ring-amber-200", dot: "bg-amber-500", hover: "hover:border-amber-200" },
    { id: "PARAH", label: "Parah / Meradang", icon: "🔴", desc: "Banyak jerawat aktif / meradang", sel: "border-red-400 bg-red-50/80 ring-2 ring-red-200", dot: "bg-red-500", hover: "hover:border-red-200" },
];

const FOCUS_OPTIONS = [
    { id: "Mencerahkan & Bekas Jerawat", icon: "✨" },
    { id: "Mengatasi Jerawat & Mengontrol Sebum", icon: "🛡️" },
    { id: "Mengencangkan & Menyamarkan Garis Halus", icon: "⏳" },
    { id: "Memperbaiki Skin Barrier & Hidrasi", icon: "🧱" },
    { id: "Menenangkan Kemerahan (Soothing)", icon: "🌿" },
    { id: "Eksfoliasi & Mengurangi Tampilan Pori-pori", icon: "🌪️" },
];

const FLOATERS = [
    { emoji: "🌿", size: "text-4xl md:text-6xl", top: "8%", left: "5%", duration: 6, delay: 0 },
    { emoji: "✨", size: "text-3xl md:text-4xl", top: "15%", right: "8%", duration: 4, delay: 0.5 },
    { emoji: "🧴", size: "text-4xl md:text-5xl", top: "40%", left: "3%", duration: 7, delay: 1 },
    { emoji: "💧", size: "text-4xl md:text-5xl", top: "65%", right: "5%", duration: 5, delay: 0.8 },
    { emoji: "🔬", size: "text-3xl md:text-4xl", bottom: "10%", left: "8%", duration: 6, delay: 1.5, mobileHidden: true },
    { emoji: "🫧", size: "text-2xl md:text-3xl", bottom: "20%", right: "10%", duration: 5, delay: 0.3, mobileHidden: true },
    { emoji: "🧬", size: "text-2xl md:text-3xl", top: "55%", left: "1%", duration: 8, delay: 2, mobileHidden: true },
    { emoji: "🌱", size: "text-3xl md:text-4xl", top: "30%", right: "3%", duration: 9, delay: 1.2, mobileHidden: true },
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

    // Sinkronisasi hasil quiz & langsung lompat ke step 2
    useEffect(() => {
        // Restore nama dan umur jika ada di localStorage
        const savedName = localStorage.getItem("tempProfileName");
        const savedAge = localStorage.getItem("tempProfileAge");
        if (savedName) setName(savedName);
        if (savedAge) setAge(savedAge);

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
            // Langsung lompat ke step 2 (index 1)
            setStep(1);
            setDirection(1);
        }
    }, []);

    const handleNameChange = (val: string) => {
        setName(val);
        localStorage.setItem("tempProfileName", val);
    };

    const handleAgeChange = (val: string) => {
        setAge(val);
        localStorage.setItem("tempProfileAge", val);
    };

    const skinType = isSensitive ? `${baseSkin} & Sensitif` : baseSkin;

    const goNext = () => { setDirection(1); setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
    const goPrev = () => { setDirection(-1); setStep((s) => Math.max(s - 1, 0)); };

    const toggleFocus = (id: string) => {
        if (focuses.includes(id)) setFocuses(focuses.filter((f) => f !== id));
        else if (focuses.length < 3) setFocuses([...focuses, id]);
    };

    const handleSubmit = async () => {
        if (!name.trim() || name.trim().length < 2) { setError("Nama panggilan minimal 2 karakter."); return; }
        if (!age.trim() || Number(age) < 10) { setError("Umur minimal 10 tahun."); return; }
        if (focuses.length === 0) { setError("Pilih minimal 1 fokus utama perawatan kulitmu."); return; }
        setIsLoading(true); setError("");
        try {
            const res = await fetch("/api/profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, age, skinType, severity, primaryFocus: focuses.join(","), allergies, isPregnantOrNursing: isPregnant }),
            });
            if (res.ok) {
                localStorage.removeItem("quizSkinType");
                localStorage.removeItem("tempProfileName");
                localStorage.removeItem("tempProfileAge");
                router.push("/profile");
                router.refresh();
            } else {
                const d = await res.json();
                setError(d.message || "Gagal menyimpan profil.");
            }
        } catch { setError("Terjadi kesalahan jaringan."); }
        finally { setIsLoading(false); }
    };

    const currentStep = STEPS[step];
    const canProceed = [
        name.trim().length >= 2 && age.trim() !== "" && Number(age) >= 10,
        true,
        true,
        focuses.length > 0,
    ][step];

    const variants = {
        enter: (d: number) => ({ opacity: 0, x: d > 0 ? 60 : -60 }),
        center: { opacity: 1, x: 0 },
        exit: (d: number) => ({ opacity: 0, x: d > 0 ? -60 : 60 }),
    };

    return (
        <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 font-sans overflow-hidden relative">

            {/* === ANIMATED BACKGROUND BLOBS (hidden on mobile for GPU perf) === */}
            <motion.div animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.35, 0.2] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="hidden sm:block absolute top-0 right-0 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-teal-200 rounded-full blur-[80px] md:blur-[100px] -translate-y-1/3 translate-x-1/3 pointer-events-none" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="hidden sm:block absolute bottom-0 left-0 w-[250px] md:w-[450px] h-[250px] md:h-[450px] bg-indigo-200 rounded-full blur-[70px] md:blur-[90px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="hidden sm:block absolute top-1/2 left-1/2 w-48 md:w-72 h-48 md:h-72 bg-amber-100 rounded-full blur-[60px] md:blur-[80px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

            {/* === FLOATING SKINCARE EMOJIS === */}
            {FLOATERS.map((f, i) => (
                <motion.div
                    key={i}
                    animate={{ y: [0, -18, 0], rotate: [-4, 4, -4], opacity: [0.10, 0.20, 0.10] }}
                    transition={{ duration: f.duration, repeat: Infinity, ease: "easeInOut", delay: f.delay }}
                    className={`absolute ${f.size} select-none pointer-events-none filter blur-[1px] ${(f as any).mobileHidden ? 'hidden sm:block' : ''}`}
                    style={{ top: (f as any).top, bottom: (f as any).bottom, left: (f as any).left, right: (f as any).right }}
                >
                    {f.emoji}
                </motion.div>
            ))}

            <div className="w-full max-w-lg relative z-10">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 glass-card px-4 py-1.5 rounded-full text-xs font-bold text-teal-600 mb-4">
                        <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                        SkinTech Analyzer
                    </div>
                    <h1 className="text-2xl font-black text-slate-800">Profil Kulit Pertamamu</h1>
                    <p className="text-slate-500 text-sm mt-1">Lengkapi 4 langkah singkat untuk hasil analisis yang akurat</p>
                </motion.div>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className="flex items-center gap-2">
                            <motion.div
                                animate={{ 
                                    backgroundColor: i <= step ? "#0d9488" : "#ccfbf1", 
                                    color: i <= step ? "#fff" : "#5eead4", 
                                    scale: i === step ? 1.15 : 1 
                                }}
                                transition={{ duration: 0.3 }}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm"
                            >
                                {i < step ? "✓" : i + 1}
                            </motion.div>
                            {i < STEPS.length - 1 && (
                                <div className="w-12 h-1 rounded-full bg-teal-100 overflow-hidden">
                                    <motion.div animate={{ width: i < step ? "100%" : "0%" }} transition={{ duration: 0.5 }} className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Main Card */}
                <div className="glass-card rounded-3xl shadow-[0_8px_48px_rgba(13,148,136,0.10)] overflow-hidden">

                    {/* Card Header Gradient */}
                    <div className="bg-gradient-to-r from-teal-500 via-cyan-500 to-indigo-500 p-6 text-white relative overflow-hidden">
                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
                        <motion.div key={step + "-hdr"} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0">
                                {currentStep.emoji}
                            </div>
                            <div>
                                <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest">Langkah {step + 1} dari 4</p>
                                <h2 className="text-xl font-black">{currentStep.title}</h2>
                                <p className="text-white/80 text-sm">{currentStep.subtitle}</p>
                            </div>
                        </motion.div>
                    </div>

                    {/* Card Body */}
                    <div className="p-6 min-h-[340px] flex flex-col">
                        <AnimatePresence mode="wait" custom={direction}>

                            {/* STEP 1 — Nama & Umur */}
                            {step === 0 && (
                                <motion.div key="s0" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col gap-5 flex-1">
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-slate-700">Nama Panggilanmu 😊</label>
                                        <input type="text" value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Contoh: Sarah, Dika, Nana..."
                                            className="w-full px-4 py-3.5 rounded-2xl premium-input text-slate-800 font-medium text-sm placeholder:text-slate-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-bold text-slate-700">Umurmu 🎂</label>
                                        <input type="number" value={age} onChange={(e) => handleAgeChange(e.target.value)} placeholder="Contoh: 22" min="10" max="100"
                                            className="w-full px-4 py-3.5 rounded-2xl premium-input text-slate-800 font-medium text-sm placeholder:text-slate-400" />
                                    </div>
                                    <div className="mt-auto p-4 bg-gradient-to-r from-teal-50/80 to-cyan-50/80 rounded-2xl border border-teal-100">
                                        <p className="text-xs text-slate-500 font-medium">🔒 Data ini hanya digunakan untuk mempersonalisasi analisis bahan skincare-mu.</p>
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 2 — Jenis Kulit */}
                            {step === 1 && (
                                <motion.div key="s1" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col gap-4 flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-bold text-slate-700">Pilih jenis kulitmu:</p>
                                        <Link href="/quiz?from=firstprofile"
                                            className="flex items-center gap-1.5 text-xs font-bold text-teal-600 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl hover:bg-teal-100 hover:shadow-md transition-all btn-press">
                                            🤔 Bingung? Lakukan Tes!!!
                                        </Link>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {SKIN_TYPES.map((t) => (
                                            <button key={t.id} type="button" onClick={() => setBaseSkin(t.id)}
                                                className={`p-3 rounded-2xl border-2 text-left transition-all active:scale-95 ${baseSkin === t.id ? "border-teal-400 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md ring-1 ring-teal-200" : "border-slate-100 bg-white/60 hover:border-teal-200 hover:bg-teal-50/30"}`}>
                                                <div className="text-2xl mb-1">{t.icon}</div>
                                                <div className="font-bold text-sm text-slate-800">{t.label}</div>
                                                <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{t.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                    <button type="button" onClick={() => setIsSensitive(!isSensitive)}
                                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${isSensitive ? "border-amber-300 bg-amber-50/80 ring-1 ring-amber-200" : "border-slate-100 bg-white/60 hover:border-amber-200"}`}>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSensitive ? "bg-amber-500 border-amber-500" : "border-slate-300"}`}>
                                            {isSensitive && <span className="text-white text-[10px] font-bold">✓</span>}
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">Kulit saya rentan Kemerahan / Sensitif 🌡️</span>
                                    </button>
                                    <button type="button" onClick={() => setIsPregnant(!isPregnant)}
                                        className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all ${isPregnant ? "border-indigo-300 bg-indigo-50/80 ring-1 ring-indigo-200" : "border-slate-100 bg-white/60 hover:border-indigo-200"}`}>
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isPregnant ? "bg-indigo-500 border-indigo-500" : "border-slate-300"}`}>
                                            {isPregnant && <span className="text-white text-[10px] font-bold">✓</span>}
                                        </div>
                                        <span className="text-sm font-semibold text-slate-700">Saya sedang Hamil atau Menyusui 🤰</span>
                                    </button>
                                </motion.div>
                            )}

                            {/* STEP 3 — Tingkat Keparahan */}
                            {step === 2 && (
                                <motion.div key="s2" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col gap-4 flex-1">
                                    <p className="text-sm font-bold text-slate-700">Bagaimana kondisi jerawat kulitmu saat ini?</p>
                                    <div className="space-y-3">
                                        {SEVERITY_OPTIONS.map((opt) => {
                                            const isSelected = severity === opt.id;
                                            return (
                                                <button key={opt.id} type="button" onClick={() => setSeverity(opt.id)}
                                                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all active:scale-95 ${isSelected ? `${opt.sel} shadow-md` : `border-slate-100 bg-white/60 ${opt.hover}`}`}>
                                                    <span className="text-2xl">{opt.icon}</span>
                                                    <div className="text-left flex-1">
                                                        <div className="font-bold text-slate-800 text-sm">{opt.label}</div>
                                                        <div className="text-xs text-slate-500">{opt.desc}</div>
                                                    </div>
                                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? `${opt.dot} border-transparent` : "border-slate-300"}`}>
                                                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}

                            {/* STEP 4 — Fokus & Alergi */}
                            {step === 3 && (
                                <motion.div key="s3" custom={direction} variants={variants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="flex flex-col gap-4 flex-1">
                                    <div className="flex justify-between items-center">
                                        <p className="text-sm font-bold text-slate-700">Fokus utama skincare-mu:</p>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${focuses.length >= 3 ? "bg-amber-100 text-amber-700" : "bg-teal-50 text-teal-600"}`}>{focuses.length}/3</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 -mt-2">Pilih maksimal 3 agar tidak overload bahan aktif</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {FOCUS_OPTIONS.map((f) => {
                                            const isSelected = focuses.includes(f.id);
                                            const isDisabled = !isSelected && focuses.length >= 3;
                                            return (
                                                <button key={f.id} type="button" disabled={isDisabled} onClick={() => toggleFocus(f.id)}
                                                    className={`p-3 rounded-2xl border-2 text-left transition-all active:scale-95 ${isSelected ? "border-teal-400 bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md ring-1 ring-teal-200" : isDisabled ? "border-slate-100 bg-white/40 opacity-40 cursor-not-allowed" : "border-slate-100 bg-white/60 hover:border-teal-200 hover:bg-teal-50/30"}`}>
                                                    <div className="text-xl mb-1">{f.icon}</div>
                                                    <div className="text-[11px] font-bold text-slate-700 leading-tight">{f.id}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="space-y-1.5 mt-1">
                                        <label className="block text-sm font-bold text-slate-700">Alergi Bahan <span className="font-normal text-slate-400">(Opsional)</span></label>
                                        <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="Contoh: Fragrance, Alcohol, Retinol..."
                                            className="w-full px-4 py-3 rounded-2xl premium-input text-slate-800 font-medium text-sm placeholder:text-slate-400" />
                                    </div>
                                    {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600">{error}</div>}
                                </motion.div>
                            )}

                        </AnimatePresence>

                        {/* Navigation Buttons */}
                        <div className={`flex gap-3 mt-6 ${step === 0 ? "justify-end" : "justify-between"}`}>
                            {step > 0 && (
                                <button onClick={goPrev} className="px-5 py-3 rounded-2xl border-2 border-teal-100 text-teal-500 font-bold text-sm hover:border-teal-300 hover:bg-teal-50 transition-all btn-press">
                                    ← Kembali
                                </button>
                            )}
                            {step < STEPS.length - 1 ? (
                                <button onClick={goNext} disabled={!canProceed}
                                    className="flex-1 py-3 rounded-2xl gradient-btn text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none">
                                    <span>Lanjutkan →</span>
                                </button>
                            ) : (
                                <button onClick={handleSubmit} disabled={isLoading || !canProceed}
                                    className="flex-1 py-3 rounded-2xl gradient-btn text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2">
                                    {isLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10" /> <span className="relative z-10">Menyimpan...</span></> : <span className="relative z-10">Simpan Profil Kulitku ✨</span>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    Sudah punya profil?{" "}
                    <Link href="/profile" className="text-teal-500 font-bold hover:text-teal-700 transition-colors">Lihat Profil Saya</Link>
                </p>
            </div>
        </main>
    );
}
