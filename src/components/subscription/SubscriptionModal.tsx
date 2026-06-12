// src/components/subscription/SubscriptionModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPoints: number | null;
  onPurchaseSuccess: (newPoints: number) => void;
  isDark: boolean;
}

export default function SubscriptionModal({
  isOpen,
  onClose,
  currentPoints,
  onPurchaseSuccess,
  isDark,
}: SubscriptionModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<"PRO" | "PRO_PLUS" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"GOPAY" | "DANA" | "BANK_VA" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handlePackageSelect = (pkg: "PRO" | "PRO_PLUS") => {
    setSelectedPackage(pkg);
    setPaymentSuccess(false);
    setErrorMessage("");
  };

  const handleCheckout = async () => {
    if (!selectedPackage || !paymentMethod) return;

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/subscription/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          packageName: selectedPackage,
          paymentType: paymentMethod,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentSuccess(true);
        onPurchaseSuccess(data.points);
      } else {
        setErrorMessage(data.message || "Transaksi gagal diproses.");
      }
    } catch (err) {
      setErrorMessage("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setSelectedPackage(null);
    setPaymentMethod(null);
    setPaymentSuccess(false);
    setErrorMessage("");
    onClose();
  };

  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800/80 border-slate-700/80" : "bg-white/90 border-slate-200/80";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetState}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8 border shadow-2xl z-10 backdrop-blur-xl ${
              isDark ? "bg-slate-900/95 border-slate-800" : "bg-white/95 border-slate-100"
            }`}
          >
            {/* Top Accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

            {/* Close Button */}
            <button
              onClick={resetState}
              className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                isDark ? "border-slate-800 hover:bg-slate-800 text-slate-400" : "border-slate-200 hover:bg-slate-100 text-slate-500"
              }`}
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="mb-6">
              <h3 className={`text-2xl font-black ${textPrimary} flex items-center gap-2`}>
                💳 Paket Langganan Kredit Poin
              </h3>
              <p className={`text-sm mt-1 ${textSecondary}`}>
                Beli kredit tambahan untuk menikmati analisis AI secara instan dan komprehensif.
              </p>
              
              <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 px-4 py-2 rounded-2xl text-xs font-black">
                <span>🪙 Saldo Kredit Anda:</span>
                <span>{currentPoints !== null ? `${currentPoints} Poin` : "..."}</span>
              </div>
            </div>

            {/* Success State */}
            {paymentSuccess ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8 space-y-4"
              >
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto animate-bounce">
                  ✅
                </div>
                <h4 className={`text-xl font-bold ${textPrimary}`}>Pembayaran Berhasil!</h4>
                <p className={`text-sm ${textSecondary} max-w-md mx-auto`}>
                  Kredit poin Anda telah ditambahkan ke akun secara real-time. Terima kasih atas dukungan Anda!
                </p>
                <button onClick={resetState} className="gradient-btn px-8 py-3 rounded-xl text-sm font-bold btn-press">
                  Selesai
                </button>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {/* 1. Package Options */}
                <div className="space-y-3">
                  <h4 className={`text-xs font-black uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    1. Pilih Paket Kredit
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* PRO PACKAGE */}
                    <button
                      onClick={() => handlePackageSelect("PRO")}
                      className={`relative text-left p-5 rounded-2xl border transition-all flex flex-col justify-between min-h-[140px] ${
                        selectedPackage === "PRO"
                          ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5"
                          : isDark
                          ? "border-slate-800 bg-slate-800/40 hover:border-slate-700"
                          : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                      }`}
                    >
                      {selectedPackage === "PRO" && (
                        <div className="absolute top-3 right-3 text-amber-500 text-sm font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                          Dipilih
                        </div>
                      )}
                      <div>
                        <h5 className={`text-lg font-black ${textPrimary}`}>Paket PRO</h5>
                        <p className={`text-xs mt-1 ${textSecondary}`}>Ideal untuk penggunaan kasual bulanan.</p>
                      </div>
                      <div className="mt-4 flex justify-between items-end w-full">
                        <div>
                          <div className={`text-2xl font-black ${textPrimary}`}>Rp 10.000</div>
                          <div className={`text-[10px] uppercase font-bold text-amber-500`}>Sekali Bayar</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold">🪙 100</span>
                          <span className="text-[10px] block font-medium">Kredit</span>
                        </div>
                      </div>
                    </button>

                    {/* PRO PLUS PACKAGE */}
                    <button
                      onClick={() => handlePackageSelect("PRO_PLUS")}
                      className={`relative text-left p-5 rounded-2xl border transition-all flex flex-col justify-between min-h-[140px] ${
                        selectedPackage === "PRO_PLUS"
                          ? "border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/5"
                          : isDark
                          ? "border-slate-800 bg-slate-800/40 hover:border-slate-700"
                          : "border-slate-200 bg-slate-50/50 hover:border-slate-300"
                      }`}
                    >
                      {selectedPackage === "PRO_PLUS" && (
                        <div className="absolute top-3 right-3 text-amber-500 text-sm font-bold bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                          Dipilih
                        </div>
                      )}
                      <div className="absolute -top-3 left-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-md">
                        🔥 BEST VALUE (HEMAT 40%)
                      </div>
                      <div>
                        <h5 className={`text-lg font-black ${textPrimary} mt-1`}>Paket PRO PLUS</h5>
                        <p className={`text-xs mt-1 ${textSecondary}`}>Ideal untuk antusias & pencari rutin skincare.</p>
                      </div>
                      <div className="mt-4 flex justify-between items-end w-full">
                        <div>
                          <div className={`text-2xl font-black ${textPrimary}`}>Rp 30.000</div>
                          <div className={`text-[10px] uppercase font-bold text-amber-500`}>Sekali Bayar</div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold">🪙 500</span>
                          <span className="text-[10px] block font-medium">Kredit</span>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* 2. Payment Method Selector */}
                {selectedPackage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3"
                  >
                    <h4 className={`text-xs font-black uppercase tracking-wider ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      2. Pilih Metode Pembayaran
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {/* GoPay */}
                      <button
                        onClick={() => setPaymentMethod("GOPAY")}
                        className={`p-3.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                          paymentMethod === "GOPAY"
                            ? "border-teal-500 bg-teal-500/5 text-teal-600 font-extrabold ring-1 ring-teal-500"
                            : isDark
                            ? "border-slate-800 bg-slate-800/20 text-slate-400 hover:border-slate-700"
                            : "border-slate-200 bg-slate-50/55 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-2xl">📱</span> GoPay
                      </button>

                      {/* DANA */}
                      <button
                        onClick={() => setPaymentMethod("DANA")}
                        className={`p-3.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                          paymentMethod === "DANA"
                            ? "border-blue-500 bg-blue-500/5 text-blue-600 font-extrabold ring-1 ring-blue-500"
                            : isDark
                            ? "border-slate-800 bg-slate-800/20 text-slate-400 hover:border-slate-700"
                            : "border-slate-200 bg-slate-50/55 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-2xl">💸</span> DANA
                      </button>

                      {/* Bank VA */}
                      <button
                        onClick={() => setPaymentMethod("BANK_VA")}
                        className={`p-3.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                          paymentMethod === "BANK_VA"
                            ? "border-indigo-500 bg-indigo-500/5 text-indigo-600 font-extrabold ring-1 ring-indigo-500"
                            : isDark
                            ? "border-slate-800 bg-slate-800/20 text-slate-400 hover:border-slate-700"
                            : "border-slate-200 bg-slate-50/55 text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-2xl">🏦</span> Bank VA
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-200">
                    ⚠️ {errorMessage}
                  </div>
                )}

                {/* 3. Action Button */}
                {selectedPackage && paymentMethod && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pt-2"
                  >
                    <button
                      onClick={handleCheckout}
                      disabled={isProcessing}
                      className="w-full py-4 gradient-btn rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 btn-press text-white"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Memproses Pembayaran...
                        </>
                      ) : (
                        `Bayar Sekarang - Rp ${selectedPackage === "PRO" ? "10.000" : "30.000"} ✨`
                      )}
                    </button>
                    <p className={`text-[10px] text-center mt-2 ${textSecondary}`}>
                      *Pembayaran ini disimulasikan secara aman. Integrasi gateway nyata (Midtrans/Xendit) akan ditaruh di sini.
                    </p>
                  </motion.div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
