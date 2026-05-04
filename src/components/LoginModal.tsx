// src/components/LoginModal.tsx
"use client";

import { signIn } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-slate-900/25 backdrop-blur-md z-[9998]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          >
            <div className="glass-card rounded-3xl shadow-[0_16px_64px_rgba(13,148,136,0.12)] w-full max-w-md p-8 md:p-10 relative overflow-hidden">

              {/* Gradient accent top */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 via-cyan-400 to-indigo-400" />

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/60 hover:bg-white flex items-center justify-center text-gray-400 hover:text-teal-600 transition-all hover:shadow-md"
              >
                ✕
              </button>

              {/* Content */}
              <div className="text-center space-y-6">

                {/* Logo / Title */}
                <div className="space-y-3">
                  <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                    <span className="gradient-text">SkinTech</span> <span className="text-gray-400">Analyzer</span>
                  </h2>
                  <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-xs mx-auto">
                    Pahami setiap tetes skincare Anda. Analisis kecocokan bahan dengan teknologi AI berdasarkan profil unik kulit Anda.
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-teal-200 to-transparent" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Masuk untuk lanjut</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-indigo-200 to-transparent" />
                </div>

                {/* Google Login Button */}
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => signIn("google")}
                  className="w-full px-8 py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100/40 transition-all duration-300 flex items-center justify-center gap-3 shadow-sm"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Lanjutkan dengan Google
                </motion.button>

                {/* Privacy note */}
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Dengan masuk, Anda menyetujui kami mengakses data profil Google Anda untuk personalisasi analisis skincare.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
