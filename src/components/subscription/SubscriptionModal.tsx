// src/components/subscription/SubscriptionModal.tsx
"use client";

import { useState, useEffect } from "react";
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
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/admin/subscription/config")
        .then(res => res.json())
        .then(data => setConfig(data))
        .catch(err => console.error("Error loading subscription config:", err));
    }
  }, [isOpen]);

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

  // Hitung persentase hemat secara dinamis antara Paket Pro dan Paket Pro Plus
  const getSavingsPercentage = () => {
    if (!config) return 20; // default fallback
    const pricePro = config.pricePro || 20000;
    const pointsPro = config.pointsPro || 200;
    const priceProPlus = config.priceProPlus || 60000;
    const pointsProPlus = config.pointsProPlus || 600;

    if (pointsPro <= 0 || pointsProPlus <= 0) return 0;
    const ratePro = pricePro / pointsPro;
    const priceAtProRate = pointsProPlus * ratePro;
    if (priceAtProRate <= 0) return 0;

    const savings = ((priceAtProRate - priceProPlus) / priceAtProRate) * 100;
    return savings > 0 ? Math.round(savings) : 0;
  };

  const savingsPercent = getSavingsPercentage();

  const textPrimary = isDark ? "text-slate-100" : "text-gray-900";
  const textSecondary = isDark ? "text-slate-400" : "text-slate-500";
  const cardBg = isDark ? "bg-slate-800/80 border-slate-700/80" : "bg-white/90 border-slate-200/80";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={resetState}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] sm:backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`relative w-full max-w-2xl max-h-[90vh] sm:max-h-[95vh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] p-5 sm:p-6 md:p-8 border shadow-2xl z-10 backdrop-blur-lg sm:backdrop-blur-xl ${isDark
              ? "bg-slate-950/80 border-slate-800/60 text-slate-100"
              : "bg-white/80 sm:bg-white/70 border-white/50 text-slate-800"
              }`}
          >
            {/* Close Button */}
            <button
              onClick={resetState}
              className={`absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center border transition-all z-20 ${isDark ? "border-slate-800 hover:bg-slate-850 text-slate-400" : "border-slate-200 hover:bg-slate-100 text-slate-500"
                }`}
            >
              ✕
            </button>

            {/* Teal Header Card */}
            <div className="bg-[#23b3b2] text-white py-6 sm:py-8 px-4 sm:px-6 rounded-[1.25rem] sm:rounded-[1.5rem] text-center mb-5 sm:mb-6 shadow-sm relative overflow-hidden">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-wide">Top Up Kredit Poin</h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-white/90 mt-1"> Pilih Paket Kredit Untuk Melanjutkan Analisis Skincare anda!</p>
            </div>

            {/* Balance Info (Left Aligned) */}
            <div className="text-left mb-6 pl-2">
              <span className={`text-base md:text-lg font-bold ${isDark ? "text-slate-200" : "text-slate-850"}`}>
                Saldo Kredit Anda:{" "}
                <span className="text-[#f0a843] font-bold">
                  {currentPoints !== null ? `${currentPoints.toLocaleString("id-ID")} Poin` : "1,107 Poin"}
                </span>
              </span>
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
                {/* Package Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* PRO PACKAGE */}
                  <div
                    onClick={() => handlePackageSelect("PRO")}
                    className={`relative cursor-pointer p-6 md:p-8 rounded-[2rem] border transition-all flex flex-col items-center text-center justify-between min-h-[220px] backdrop-blur-md ${selectedPackage === "PRO"
                      ? "border-[#23b3b2] ring-4 ring-[#23b3b2]/20 bg-white/45 dark:bg-slate-900/40 shadow-xl scale-[1.03]"
                      : isDark
                        ? "border-slate-800/50 bg-slate-950/20 hover:bg-slate-900/20 hover:border-slate-700/60 hover:scale-[1.02] shadow-sm"
                        : "border-white/50 bg-white/20 hover:bg-white/30 hover:border-white/80 hover:scale-[1.02] shadow-sm"
                      }`}
                  >
                    <div className="flex flex-col items-center mt-2">
                      <h5 className={`text-lg md:text-xl font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Paket PRO</h5>
                    </div>
                    <div className="my-4 flex flex-col items-center">
                      <div className={`text-2xl md:text-3xl font-extrabold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                        {config ? config.pointsPro.toLocaleString("id-ID") : "200"} Poin
                      </div>
                      <div className={`text-sm font-bold text-slate-500 mt-1`}>
                        (Rp {config ? config.pricePro.toLocaleString("id-ID") : "20.000"})
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`w-full py-3 px-6 rounded-xl font-bold transition-all text-sm ${selectedPackage === "PRO"
                        ? "bg-[#23b3b2] text-white shadow-md shadow-[#23b3b2]/20"
                        : "bg-[#23b3b2] text-white hover:bg-[#1fa0a0]"
                        }`}
                    >
                      Pilih Paket
                    </button>
                  </div>

                  {/* PRO PLUS PACKAGE */}
                  <div
                    onClick={() => handlePackageSelect("PRO_PLUS")}
                    className={`relative cursor-pointer p-6 md:p-8 rounded-[2rem] border transition-all flex flex-col items-center text-center justify-between min-h-[220px] backdrop-blur-md ${selectedPackage === "PRO_PLUS"
                      ? "border-[#23b3b2] ring-4 ring-[#23b3b2]/20 bg-white/45 dark:bg-slate-900/40 shadow-xl scale-[1.03]"
                      : isDark
                        ? "border-slate-800/50 bg-slate-950/20 hover:bg-slate-900/20 hover:border-slate-700/60 hover:scale-[1.02] shadow-sm"
                        : "border-white/50 bg-white/20 hover:bg-white/30 hover:border-white/80 hover:scale-[1.02] shadow-sm"
                      }`}
                  >
                    {/* Orange Badge */}
                    {savingsPercent > 0 && (
                      <div className="bg-[#f0a843] text-white text-[10px] md:text-[11px] font-bold py-1.5 px-4 rounded-full absolute -top-3.5 left-1/2 -translate-x-1/2 shadow-sm whitespace-nowrap tracking-wide">
                        Paling Populer | Hemat {savingsPercent}%
                      </div>
                    )}

                    <div className="flex flex-col items-center mt-3">
                      <h5 className={`text-lg md:text-xl font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>Paket PRO PLUS</h5>
                    </div>
                    <div className="my-4 flex flex-col items-center">
                      <div className={`text-2xl md:text-3xl font-extrabold ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                        {config ? config.pointsProPlus.toLocaleString("id-ID") : "600"} Poin
                      </div>
                      <div className={`text-sm font-bold text-slate-500 mt-1`}>
                        (Rp {config ? config.priceProPlus.toLocaleString("id-ID") : "60.000"})
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`w-full py-3 px-6 rounded-xl font-bold transition-all text-sm ${selectedPackage === "PRO_PLUS"
                        ? "bg-[#23b3b2] text-white shadow-md shadow-[#23b3b2]/20"
                        : "bg-[#23b3b2] text-white hover:bg-[#1fa0a0]"
                        }`}
                    >
                      Pilih Paket
                    </button>
                  </div>
                </div>

                {/* Payment Method Selector */}
                {selectedPackage && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 mt-8 border-t border-dashed border-slate-200 dark:border-slate-800 pt-6"
                  >
                    <h4 className={`text-xs font-black uppercase tracking-wider text-center ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                      Pilih Metode Pembayaran
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      {/* GoPay */}
                      <button
                        onClick={() => setPaymentMethod("GOPAY")}
                        className={`p-3.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all min-h-[80px] ${paymentMethod === "GOPAY"
                          ? "border-[#23b3b2] bg-[#23b3b2]/5 text-[#23b3b2] font-extrabold ring-1 ring-[#23b3b2]"
                          : isDark
                            ? "border-slate-800 bg-slate-900/20 text-slate-400 hover:border-slate-700"
                            : "border-slate-200 bg-slate-50/55 text-slate-650 hover:border-slate-350"
                          }`}
                      >
                        <img src="/gopay-logo.svg" alt="GoPay" className="h-5 object-contain" />

                      </button>

                      {/* DANA */}
                      <button
                        onClick={() => setPaymentMethod("DANA")}
                        className={`p-3.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center justify-center gap-2 transition-all min-h-[80px] ${paymentMethod === "DANA"
                          ? "border-[#23b3b2] bg-[#23b3b2]/5 text-[#23b3b2] font-extrabold ring-1 ring-[#23b3b2]"
                          : isDark
                            ? "border-slate-800 bg-slate-900/20 text-slate-400 hover:border-slate-700"
                            : "border-slate-200 bg-slate-50/55 text-slate-650 hover:border-slate-350"
                          }`}
                      >
                        <img src="/dana-logo.png" alt="DANA" className="h-5 object-contain" />

                      </button>

                      {/* Bank VA */}
                      <button
                        onClick={() => setPaymentMethod("BANK_VA")}
                        className={`p-3.5 rounded-xl border text-center font-bold text-xs flex flex-col items-center justify-center gap-1 transition-all ${paymentMethod === "BANK_VA"
                          ? "border-[#23b3b2] bg-[#23b3b2]/5 text-[#23b3b2] font-extrabold ring-1 ring-[#23b3b2]"
                          : isDark
                            ? "border-slate-800 bg-slate-900/20 text-slate-400 hover:border-slate-700"
                            : "border-slate-200 bg-slate-50/55 text-slate-650 hover:border-slate-350"
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

                {/* Action Button */}
                {selectedPackage && paymentMethod && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pt-2"
                  >
                    <button
                      onClick={handleCheckout}
                      disabled={isProcessing}
                      className="w-full py-4 bg-[#23b3b2] hover:bg-[#1fa0a0] text-white rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 shadow-md shadow-[#23b3b2]/20 transition-all"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Memproses Pembayaran...
                        </>
                      ) : (
                        `Bayar Sekarang - Rp ${selectedPackage === "PRO"
                          ? (config ? config.pricePro.toLocaleString("id-ID") : "20.000")
                          : (config ? config.priceProPlus.toLocaleString("id-ID") : "60.000")
                        } ✨`
                      )}
                    </button>
                  </motion.div>
                )}

                {/* Secure Payment Brand Logos */}
                <div className="flex flex-col items-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-900">
                  <span className="text-xs font-semibold text-slate-400 mb-2.5">Pembayaran hastt</span>
                  <div className="flex items-center gap-3">
                    {/* LinkAja */}
                    <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm w-11 h-8 flex items-center justify-center overflow-hidden">
                      <svg className="w-8 h-5" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="16" rx="2" fill="#E2231A" />
                        <circle cx="12" cy="8" r="5.5" fill="white" />
                        <path d="M12 5C10.3 5 9 6.3 9 8C9 9.7 10.3 11 12 11C13.7 11 15 9.7 15 8C15 6.3 13.7 5 12 5ZM12 10C10.9 10 10 9.1 10 8C10 6.9 10.9 6 12 6C13.1 6 14 6.9 14 8C14 9.1 13.1 10 12 10Z" fill="#E2231A" />
                      </svg>
                    </div>

                    {/* Mastercard */}
                    <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm w-11 h-8 flex items-center justify-center overflow-hidden">
                      <svg className="w-8 h-5" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="16" rx="2" fill="white" />
                        <circle cx="9.5" cy="8" r="5.5" fill="#EB001B" fillOpacity="0.8" />
                        <circle cx="14.5" cy="8" r="5.5" fill="#F79E1B" fillOpacity="0.8" />
                      </svg>
                    </div>

                    {/* Visa */}
                    <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm w-11 h-8 flex items-center justify-center overflow-hidden">
                      <svg className="w-8 h-5" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="16" rx="2" fill="white" />
                        <path d="M3 4.5L5.5 11.5H7.2L9.5 4.5H8L6.8 9.2L5.4 4.5H3Z" fill="#1A1F71" />
                        <path d="M10.2 4.5L9.2 11.5H10.7L11.7 4.5H10.2Z" fill="#1A1F71" />
                        <path d="M15.5 4.5C14.5 4.5 13.8 5 13.5 5.8L13.2 7H14.7L14.9 6.2C15.1 5.8 15.3 5.6 15.6 5.6C16 5.6 16.2 5.9 16.2 6.3V6.5L15.3 11.5H16.8L17.7 6.5C17.7 5.2 16.8 4.5 15.5 4.5Z" fill="#1A1F71" />
                        <path d="M20.5 4.5L19 11.5H20.5L22 4.5H20.5Z" fill="#F79E1B" />
                      </svg>
                    </div>

                    {/* JCB */}
                    <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-sm w-11 h-8 flex items-center justify-center overflow-hidden">
                      <svg className="w-8 h-5" viewBox="0 0 24 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="24" height="16" rx="2" fill="white" />
                        <path d="M3 3H8.5C9.3 3 10 3.7 10 4.5V11.5C10 12.3 9.3 13 8.5 13H3V3Z" fill="#003580" />
                        <path d="M8.5 3H13.5C14.3 3 15 3.7 15 4.5V11.5C15 12.3 14.3 13 13.5 13H8.5V3Z" fill="#D2143A" />
                        <path d="M13.5 3H18.5C19.3 3 20 3.7 20 4.5V11.5C20 12.3 19.3 13 18.5 13H13.5V3Z" fill="#00843D" />
                        <text x="5" y="10" fill="white" fontSize="7" fontWeight="bold">J</text>
                        <text x="10" y="10" fill="white" fontSize="7" fontWeight="bold">C</text>
                        <text x="15" y="10" fill="white" fontSize="7" fontWeight="bold">B</text>
                      </svg>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
