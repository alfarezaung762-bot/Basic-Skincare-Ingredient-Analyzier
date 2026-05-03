"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/AuthButtons";
import SingleAnalyzer from "@/components/analyze/SingleAnalyzer";
import CombineAnalyzer from "@/components/analyze/CombineAnalyzer";
import { motion, AnimatePresence } from "framer-motion";

export default function DashboardClient({ displayName }: { displayName: string }) {
  // State untuk melacak tampilan yang aktif: "menu" | "single" | "combine"
  const [activeView, setActiveView] = useState<"menu" | "single" | "combine">("menu");

  return (
    <main className="min-h-screen bg-[#F4F4F5] p-4 md:p-8 font-sans flex flex-col">
      <div className="max-w-5xl mx-auto space-y-8 w-full flex-grow">

        {/* Top Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-sm gap-4 relative z-20">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Halo, {displayName} 👋</h2>
            <p className="text-gray-500 text-sm mt-1">Siap merawat kulitmu hari ini?</p>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/history" className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all text-sm flex items-center gap-2">
              <span>🕒</span> Riwayat
            </Link>
            <Link href="/profile" className="px-6 py-2 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-all text-sm flex items-center">
              Profil Kulit
            </Link>
            <LogoutButton />
          </div>
        </header>

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
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full"
              >
                {/* Menu 1: Single Ingredient */}
                <button
                  onClick={() => setActiveView("single")}
                  className="group bg-white rounded-3xl p-8 hover:shadow-md transition-all border border-transparent hover:border-gray-200 flex flex-col justify-between min-h-[260px] text-left active:scale-[0.98]"
                >
                  <div>
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                      <span className="text-3xl">🔬</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Single Ingredient</h3>
                    <p className="text-gray-500 leading-relaxed">Pindai atau ketik komposisi produk untuk melihat Match Score & Safety Score khusus untuk profil kulitmu.</p>
                  </div>
                  <div className="text-blue-600 font-bold group-hover:translate-x-2 transition-transform w-fit mt-6 flex items-center gap-2">
                    Mulai Analisis <span className="text-xl">→</span>
                  </div>
                </button>

                {/* Menu 2: Combine */}
                <button
                  onClick={() => setActiveView("combine")}
                  className="group bg-white rounded-3xl p-8 hover:shadow-md transition-all border border-transparent hover:border-gray-200 flex flex-col justify-between min-h-[260px] text-left active:scale-[0.98]"
                >
                  <div>
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mb-6">
                      <span className="text-3xl">🧪</span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Combine Skincare</h3>
                    <p className="text-gray-500 leading-relaxed">Cek kecocokan antara dua produk berbeda, seperti Face Wash lama dengan Moisturizer baru.</p>
                  </div>
                  <div className="text-purple-600 font-bold group-hover:translate-x-2 transition-transform w-fit mt-6 flex items-center gap-2">
                    Mulai Kombinasi <span className="text-xl">→</span>
                  </div>
                </button>
              </motion.div>
            )}

            {/* VIEW: SINGLE ANALYZER */}
            {activeView === "single" && (
              <motion.div
                key="single"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 w-full"
              >
                <button
                  onClick={() => setActiveView("menu")}
                  className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-xl w-fit shadow-sm border border-gray-100"
                >
                  ← Kembali ke Menu Utama
                </button>
                <div className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] p-4 md:p-8 border border-white/60 shadow-sm">
                  <SingleAnalyzer />
                </div>
              </motion.div>
            )}

            {/* VIEW: COMBINE ANALYZER */}
            {activeView === "combine" && (
              <motion.div
                key="combine"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="space-y-4 w-full"
              >
                <button
                  onClick={() => setActiveView("menu")}
                  className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-xl w-fit shadow-sm border border-gray-100"
                >
                  ← Kembali ke Menu Utama
                </button>
                <div className="bg-white/50 backdrop-blur-sm rounded-[2.5rem] p-4 md:p-8 border border-white/60 shadow-sm">
                  <CombineAnalyzer />
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* Footer Marquee Banner */}
      <footer className="mt-16 w-full overflow-hidden border-t border-gray-200 py-8 bg-white flex flex-col items-center shrink-0">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 text-center shrink-0">Dipercaya oleh berbagai brand terkemuka</p>
        <div className="relative flex overflow-hidden group max-w-full w-full bg-white shrink-0">
          {/* We create two identical lists that scroll seamlessly */}
          <div className="py-2 animate-marquee flex items-center gap-16 pr-16 shrink-0 w-max group-hover:[animation-play-state:paused]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
              <span key={`a-${i}`} className="grayscale opacity-50 hover:grayscale-0 hover:opacity-100 hover:scale-110 transition-all duration-300 cursor-pointer flex-shrink-0">
                <img src={`https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200&h=100`} alt="Brand Logo" className="h-[50px] w-auto object-cover rounded-md" />
              </span>
            ))}
          </div>
          <div className="absolute top-0 py-2 animate-marquee2 flex items-center gap-16 pr-16 shrink-0 w-max group-hover:[animation-play-state:paused]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((i) => (
              <span key={`b-${i}`} className="grayscale opacity-50 hover:grayscale-0 hover:opacity-100 hover:scale-110 transition-all duration-300 cursor-pointer flex-shrink-0">
                <img src={`https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&q=80&w=200&h=100`} alt="Brand Logo" className="h-[50px] w-auto object-cover rounded-md" />
              </span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
