"use client";

import { motion } from "framer-motion";

export default function CombineAnalyzer() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 sm:space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8 border-b border-slate-100 pb-4 sm:pb-5">
        <div className="flex items-center gap-4">
          <span className="bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-700 font-black text-lg px-4 py-2 rounded-xl border border-indigo-200 shadow-sm">02</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Combine Skincare</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Cek kecocokan antara dua produk sebelum dipakai bersamaan</p>
          </div>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative p-6 sm:p-10 rounded-2xl sm:rounded-3xl text-center flex flex-col items-center justify-center min-h-[240px] sm:min-h-[300px] glass-card overflow-hidden"
      >
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 rounded-3xl" style={{ 
          background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.1), rgba(13,148,136,0.1), transparent)",
          backgroundSize: "200% 100%",
          animation: "shimmer 4s linear infinite"
        }} />
        
        {/* Dashed inner border */}
        <div className="absolute inset-2 border-2 border-dashed border-indigo-200/60 rounded-2xl pointer-events-none" />

        {/* Floating decorations */}
        <motion.div 
          animate={{ y: [0, -8, 0], rotate: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-6 left-8 text-3xl opacity-20 select-none pointer-events-none"
        >🧴</motion.div>
        <motion.div 
          animate={{ y: [0, 8, 0], rotate: [5, -5, 5] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-6 right-8 text-3xl opacity-20 select-none pointer-events-none"
        >🧪</motion.div>

        <div className="relative z-10">
          <motion.div 
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-5 ring-2 ring-indigo-200/50 shadow-lg shadow-indigo-100/50"
          >
            <span className="text-4xl">🚧</span>
          </motion.div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Fitur sedang dalam pengembangan</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
            Fitur ini akan segera tersedia! Anda bisa mengecek apakah dua produk aman untuk digabungkan di pembaruan selanjutnya.
          </p>
          <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 text-xs font-bold text-indigo-600">
            <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
            Segera Hadir
          </div>
        </div>
      </motion.div>
    </div>
  );
}
