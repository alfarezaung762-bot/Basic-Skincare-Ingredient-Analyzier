"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import SingleAnalyzer from "@/components/analyze/SingleAnalyzer";
import CombineAnalyzer from "@/components/analyze/CombineAnalyzer";
import LoginModal from "@/components/LoginModal";
import { motion, AnimatePresence } from "framer-motion";

interface Banner {
  id: string;
  imageUrl: string;
  altText: string;
}

interface DashboardClientProps {
  displayName: string;
  isGuest?: boolean;
}

// === FEATURES DATA ===
const FEATURES = [
  { icon: "🧬", title: "AI-Powered Analysis", desc: "Didukung Gemini AI untuk analisis komposisi yang akurat" },
  { icon: "🛡️", title: "Safety Scoring", desc: "Skor keamanan berdasarkan profil unik kulitmu" },
  { icon: "📊", title: "Match Score", desc: "Persentase kecocokan produk dengan kondisi kulitmu" },
  { icon: "⚡", title: "Hasil Instan", desc: "Analisis real-time tanpa perlu menunggu lama" },
];

export default function DashboardClient({ displayName, isGuest = false }: DashboardClientProps) {
  const [activeView, setActiveView] = useState<"menu" | "single" | "combine">("menu");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    fetchBanners();
    // Load theme preference
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  };

  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/benner");
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (e) {
      console.error("Gagal memuat banner");
    }
  };

  // Jika guest, tampilkan popup login. Jika sudah login, langsung navigasi.
  const handleMenuClick = (view: "single" | "combine") => {
    if (isGuest) {
      setShowLoginModal(true);
    } else {
      setActiveView(view);
    }
  };

  // Dynamic theme classes
  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const textMuted = isDark ? "text-slate-500" : "text-slate-400";

  return (
    <>
      <main className="min-h-screen p-4 md:p-8 font-sans flex flex-col relative overflow-hidden">

        {/* === DOT PATTERN OVERLAY === */}
        <div className="fixed inset-0 dot-pattern pointer-events-none z-0" />

        {/* === AMBIENT BACKGROUND BLOBS === */}
        <div className="ambient-blob ambient-blob-1" />
        <div className="ambient-blob ambient-blob-2" />
        <div className="ambient-blob ambient-blob-3" />

        <div className="max-w-5xl mx-auto space-y-8 w-full flex-grow relative z-10">

          {/* Top Header */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="glass-card rounded-3xl p-6 relative overflow-hidden"
          >
            {/* Gradient top accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className={`text-2xl font-bold ${textPrimary} flex items-center gap-2`}>
                  Halo, <span className="gradient-text">{displayName}</span> 👋
                </h2>
                <p className={`${textSecondary} text-sm mt-1 font-medium`}>
                  {isGuest ? "Masuk untuk mulai analisis skincare-mu!" : "Siap merawat kulitmu hari ini?"}
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3 items-center flex-wrap">
                {/* Dark/Light Mode Toggle */}
                <button
                  onClick={toggleTheme}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-300 border ${isDark ? "bg-slate-700/60 border-slate-600 hover:bg-slate-600/80 text-amber-300" : "bg-white border-slate-200 hover:bg-slate-50 hover:border-teal-200 text-slate-600"} btn-press`}
                  title={isDark ? "Mode Terang" : "Mode Gelap"}
                >
                  {isDark ? "☀️" : "🌙"}
                </button>

                {isGuest ? (
                  /* Guest: Tombol Login */
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="gradient-btn px-6 py-2.5 rounded-xl text-sm flex items-center gap-2 btn-press"
                  >
                    <svg className="w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                      <polyline points="10 17 15 12 10 7" />
                      <line x1="15" y1="12" x2="3" y2="12" />
                    </svg>
                    <span className="relative z-10">Masuk</span>
                  </button>
                ) : (
                  /* Logged in: Riwayat, Profil, Logout */
                  <>
                    <Link href="/history" className={`px-4 py-2 font-medium rounded-xl transition-all text-sm flex items-center gap-2 btn-press border ${isDark ? "bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-600/80" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-teal-200"}`}>
                      <span>🕒</span> Riwayat
                    </Link>
                    <Link href="/profile" className="gradient-btn px-6 py-2 rounded-xl text-sm flex items-center btn-press">
                      <span className="relative z-10">Profil Kulit</span>
                    </Link>
                    <button
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className={`px-4 py-2 font-medium rounded-xl transition-all text-sm btn-press border ${isDark ? "bg-slate-700/60 border-slate-600 text-slate-400 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800" : "bg-white border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200"}`}
                    >
                      Keluar
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.header>

          {/* Dynamic Content Area */}
          <div className="relative">
            <AnimatePresence mode="popLayout">

              {/* VIEW: MAIN MENU */}
              {activeView === "menu" && (
                <motion.div
                  key="menu"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-8 w-full"
                >
                  {/* Hero Section */}


                  {/* Menu Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Menu 1: Single Ingredient */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMenuClick("single")}
                      className={`group glass-card glass-card-hover shimmer-border rounded-3xl p-8 flex flex-col justify-between min-h-[280px] text-left relative overflow-hidden border ${isDark ? "border-slate-700" : "border-slate-200/80"}`}
                    >
                      {/* Gradient accent top */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity" />

                      <div>
                        <div className={`w-16 h-16 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-teal-200 group-hover:ring-teal-300 group-hover:shadow-lg group-hover:shadow-teal-100/50 transition-all duration-300 ${isDark ? "from-teal-900/40 to-cyan-900/40 ring-teal-700" : ""}`}>
                          <span className="text-3xl">🔬</span>
                        </div>
                        <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Single Ingredient</h3>
                        <p className={`${textSecondary} leading-relaxed`}>Pindai atau ketik komposisi produk untuk melihat Match Score & Safety Score khusus untuk profil kulitmu.</p>
                      </div>
                      <div className="text-teal-600 font-bold group-hover:translate-x-2 transition-transform w-fit mt-6 flex items-center gap-2">
                        {isGuest ? "Masuk untuk Analisis" : "Mulai Analisis"} <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
                      </div>
                    </motion.button>

                    {/* Menu 2: Combine */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMenuClick("combine")}
                      className={`group glass-card glass-card-hover shimmer-border rounded-3xl p-8 flex flex-col justify-between min-h-[280px] text-left relative overflow-hidden border ${isDark ? "border-slate-700" : "border-slate-200/80"}`}
                    >
                      {/* Gradient accent top */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 to-violet-400 opacity-60 group-hover:opacity-100 transition-opacity" />

                      <div>
                        <div className={`w-16 h-16 bg-gradient-to-br from-indigo-50 to-violet-50 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-indigo-200 group-hover:ring-indigo-300 group-hover:shadow-lg group-hover:shadow-indigo-100/50 transition-all duration-300 ${isDark ? "from-indigo-900/40 to-violet-900/40 ring-indigo-700" : ""}`}>
                          <span className="text-3xl">🧪</span>
                        </div>
                        <h3 className={`text-2xl font-bold ${textPrimary} mb-3`}>Combine Skincare</h3>
                        <p className={`${textSecondary} leading-relaxed`}>Cek kecocokan antara dua produk berbeda, seperti Face Wash lama dengan Moisturizer baru.</p>
                      </div>
                      <div className="text-indigo-600 font-bold group-hover:translate-x-2 transition-transform w-fit mt-6 flex items-center gap-2">
                        {isGuest ? "Masuk untuk Kombinasi" : "Mulai Kombinasi"} <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
                      </div>
                    </motion.button>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {FEATURES.map((f, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i, duration: 0.4 }}
                        className={`glass-card rounded-2xl p-5 text-center border transition-all hover:shadow-md ${isDark ? "border-slate-700 hover:border-slate-600" : "border-slate-200/80 hover:border-teal-200"}`}
                      >
                        <div className="text-3xl mb-3">{f.icon}</div>
                        <h4 className={`text-sm font-bold ${textPrimary} mb-1`}>{f.title}</h4>
                        <p className={`text-xs ${textMuted} leading-relaxed`}>{f.desc}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Stats Bar */}
                  <div className={`glass-card rounded-2xl p-4 flex flex-wrap items-center justify-center gap-6 md:gap-12 border ${isDark ? "border-slate-700" : "border-slate-200/80"}`}>
                    <div className="text-center">
                      <div className={`text-2xl font-black ${textPrimary}`}>100+</div>
                      <div className={`text-xs font-medium ${textMuted}`}>Bahan Terdata</div>
                    </div>
                    <div className={`w-px h-8 ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
                    <div className="text-center">
                      <div className={`text-2xl font-black ${textPrimary}`}>AI</div>
                      <div className={`text-xs font-medium ${textMuted}`}>Gemini Powered</div>
                    </div>
                    <div className={`w-px h-8 ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
                    <div className="text-center">
                      <div className={`text-2xl font-black ${textPrimary}`}>5+</div>
                      <div className={`text-xs font-medium ${textMuted}`}>Jenis Analisis</div>
                    </div>
                    <div className={`w-px h-8 hidden sm:block ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
                    <div className="text-center hidden sm:block">
                      <div className={`text-2xl font-black ${textPrimary}`}>Free</div>
                      <div className={`text-xs font-medium ${textMuted}`}>Gratis Selamanya</div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* VIEW: SINGLE ANALYZER (hanya untuk user yang login) */}
              {activeView === "single" && !isGuest && (
                <motion.div
                  key="single"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-4 w-full"
                >
                  <motion.button
                    whileHover={{ x: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveView("menu")}
                    className={`flex items-center gap-2 text-sm font-bold transition-colors glass-card px-4 py-2 rounded-xl w-fit border ${isDark ? "text-slate-400 hover:text-teal-400 border-slate-700" : "text-slate-500 hover:text-teal-600 border-slate-200"}`}
                  >
                    <span className="transition-transform">←</span> Kembali ke Menu Utama
                  </motion.button>
                  <div className={`glass-card rounded-[2.5rem] p-4 md:p-8 relative overflow-hidden border ${isDark ? "border-slate-700" : "border-slate-200/80"}`}>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400" />
                    <SingleAnalyzer />
                  </div>
                </motion.div>
              )}

              {/* VIEW: COMBINE ANALYZER (hanya untuk user yang login) */}
              {activeView === "combine" && !isGuest && (
                <motion.div
                  key="combine"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="space-y-4 w-full"
                >
                  <motion.button
                    whileHover={{ x: -4 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveView("menu")}
                    className={`flex items-center gap-2 text-sm font-bold transition-colors glass-card px-4 py-2 rounded-xl w-fit border ${isDark ? "text-slate-400 hover:text-indigo-400 border-slate-700" : "text-slate-500 hover:text-indigo-600 border-slate-200"}`}
                  >
                    <span className="transition-transform">←</span> Kembali ke Menu Utama
                  </motion.button>
                  <div className={`glass-card rounded-[2.5rem] p-4 md:p-8 relative overflow-hidden border ${isDark ? "border-slate-700" : "border-slate-200/80"}`}>
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400" />
                    <CombineAnalyzer />
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Footer Marquee Banner */}
        <footer className={`mt-16 w-full overflow-hidden py-8 glass-card rounded-t-3xl flex flex-col items-center shrink-0 relative border-t ${isDark ? "border-slate-700" : "border-slate-200/80"}`}>
          {/* Gradient accent top line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent" />

          <p className={`text-xs font-bold ${textMuted} uppercase tracking-widest mb-6 text-center shrink-0`}>
            {banners.length > 0 ? "Produk Brand Terdaftar" : "Dipercaya oleh berbagai brand terkemuka"}
          </p>
          <div className="relative flex overflow-hidden group max-w-full w-full shrink-0">
            <div className="py-2 animate-marquee flex items-center gap-6 md:gap-16 pr-6 md:pr-16 shrink-0 w-max group-hover:[animation-play-state:paused]">
              {banners.length > 0 ? (
                <>
                  {banners.map((banner, i) => (
                    <span key={`a-${banner.id}-${i}`} className={`hover:scale-[1.04] transition-all duration-300 cursor-pointer flex-shrink-0 shadow-sm rounded-xl overflow-hidden ring-1 hover:shadow-md hover:shadow-teal-100/30 ${isDark ? "ring-slate-700 hover:ring-teal-700" : "ring-slate-200 hover:ring-teal-200"}`}>
                      <img src={banner.imageUrl} alt={banner.altText || "Banner"} className="h-[80px] md:h-[120px] w-auto max-w-[300px] md:max-w-[400px] object-cover" />
                    </span>
                  ))}
                  {banners.map((banner, i) => (
                    <span key={`a2-${banner.id}-${i}`} className={`hover:scale-[1.04] transition-all duration-300 cursor-pointer flex-shrink-0 shadow-sm rounded-xl overflow-hidden ring-1 hover:shadow-md hover:shadow-teal-100/30 ${isDark ? "ring-slate-700 hover:ring-teal-700" : "ring-slate-200 hover:ring-teal-200"}`}>
                      <img src={banner.imageUrl} alt={banner.altText || "Banner"} className="h-[80px] md:h-[120px] w-auto max-w-[300px] md:max-w-[400px] object-cover" />
                    </span>
                  ))}
                </>
              ) : (
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
                  <span key={`dummy-a-${i}`} className="grayscale opacity-50 hover:grayscale-0 hover:opacity-100 hover:scale-110 transition-all duration-300 cursor-pointer flex-shrink-0">
                    <img src={`https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200&h=100`} alt="Brand Logo" className="h-[50px] w-auto object-cover rounded-md" />
                  </span>
                ))
              )}
            </div>
            <div className="absolute top-0 py-2 animate-marquee2 flex items-center gap-6 md:gap-16 pr-6 md:pr-16 shrink-0 w-max group-hover:[animation-play-state:paused]">
              {banners.length > 0 ? (
                <>
                  {banners.map((banner, i) => (
                    <span key={`b-${banner.id}-${i}`} className={`hover:scale-[1.04] transition-all duration-300 cursor-pointer flex-shrink-0 shadow-sm rounded-xl overflow-hidden ring-1 hover:shadow-md hover:shadow-teal-100/30 ${isDark ? "ring-slate-700 hover:ring-teal-700" : "ring-slate-200 hover:ring-teal-200"}`}>
                      <img src={banner.imageUrl} alt={banner.altText || "Banner"} className="h-[80px] md:h-[120px] w-auto max-w-[300px] md:max-w-[400px] object-cover" />
                    </span>
                  ))}
                  {banners.map((banner, i) => (
                    <span key={`b2-${banner.id}-${i}`} className={`hover:scale-[1.04] transition-all duration-300 cursor-pointer flex-shrink-0 shadow-sm rounded-xl overflow-hidden ring-1 hover:shadow-md hover:shadow-teal-100/30 ${isDark ? "ring-slate-700 hover:ring-teal-700" : "ring-slate-200 hover:ring-teal-200"}`}>
                      <img src={banner.imageUrl} alt={banner.altText || "Banner"} className="h-[80px] md:h-[120px] w-auto max-w-[300px] md:max-w-[400px] object-cover" />
                    </span>
                  ))}
                </>
              ) : (
                [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
                  <span key={`dummy-b-${i}`} className="grayscale opacity-50 hover:grayscale-0 hover:opacity-100 hover:scale-110 transition-all duration-300 cursor-pointer flex-shrink-0">
                    <img src={`https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200&h=100`} alt="Brand Logo" className="h-[50px] w-auto object-cover rounded-md" />
                  </span>
                ))
              )}
            </div>
          </div>
        </footer>
      </main>

      {/* Login Modal — ditampilkan saat guest klik aksi */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
    </>
  );
}
