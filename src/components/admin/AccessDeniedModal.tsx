"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface AccessDeniedModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
}

export function AccessDeniedModal({ isOpen, message, onClose }: AccessDeniedModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center"
          >
            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-200">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Akses Ditolak</h3>
            <p className="text-sm font-medium text-slate-500 mb-8 leading-relaxed">{message}</p>
            <button 
              onClick={onClose}
              className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-4 rounded-xl transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              <span>Kembali</span>
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
