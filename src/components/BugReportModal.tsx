// src/components/BugReportModal.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}

export default function BugReportModal({ isOpen, onClose, isDark = false }: BugReportModalProps) {
  const [comment, setComment] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [maxCount, setMaxCount] = useState(2);
  const [isLoadingQuota, setIsLoadingQuota] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (isOpen) {
      fetchQuota();
      setComment("");
      setUploadedImages([]);
      setMessage({ type: "", text: "" });
    }
  }, [isOpen]);

  const fetchQuota = async () => {
    setIsLoadingQuota(true);
    try {
      const res = await fetch("/api/admin/reportbahan/bugreport/limit");
      if (res.ok) {
        const data = await res.json();
        setDailyCount(data.count);
        setMaxCount(data.max);
      }
    } catch (err) {
      console.error("Gagal memuat kuota laporan harian:", err);
    } finally {
      setIsLoadingQuota(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const remainingSlots = 2 - uploadedImages.length;
    if (remainingSlots <= 0) {
      setMessage({ type: "error", text: "Maksimal hanya dapat mengunggah 2 foto." });
      return;
    }

    const files = Array.from(e.target.files).slice(0, remainingSlots);
    setIsUploading(true);
    setMessage({ type: "", text: "" });

    try {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "djn5c5oxz";
      const uploadPreset = "skincare_katalog";

      const uploadPromises = files.map(async (file) => {
        // Validasi ukuran berkas (Maksimal 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(`Berkas "${file.name}" melebihi ukuran maksimal 5MB.`);
        }
        
        // Validasi jenis berkas (Hanya gambar)
        if (!file.type.startsWith("image/")) {
          throw new Error(`Berkas "${file.name}" harus berupa file gambar.`);
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData
        });

        if (!res.ok) {
          throw new Error("Gagal mengunggah gambar ke server Cloudinary.");
        }

        const data = await res.json();
        return data.secure_url;
      });

      const urls = await Promise.all(uploadPromises);
      setUploadedImages((prev) => [...prev, ...urls]);
      setMessage({ type: "success", text: "Gambar berhasil diunggah." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Gagal mengunggah foto." });
    } finally {
      setIsUploading(false);
      // Reset input file value agar dapat memilih file yang sama jika diinginkan
      e.target.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    setMessage({ type: "", text: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setMessage({ type: "error", text: "Deskripsi kendala wajib diisi." });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/reportbahan/bugreport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comment,
          images: uploadedImages
        })
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message || "Laporan bug berhasil dikirim." });
        setDailyCount((prev) => prev + 1);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({ type: "error", text: data.message || "Gagal mengirimkan laporan." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "Terjadi kesalahan pada server peladen." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isQuotaExceeded = dailyCount >= maxCount;
  const isSubmitDisabled = isSubmitting || isUploading || isQuotaExceeded || isLoadingQuota || !comment.trim();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9998]"
            onClick={onClose}
          />

          {/* Modal Container */}
          <div 
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className={`w-full max-w-xl rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.2)] border relative overflow-hidden ${
                isDark 
                  ? "bg-slate-900/90 border-slate-800 text-slate-100" 
                  : "bg-white/95 border-slate-200 text-slate-900"
              }`}
            >
              {/* Premium Gradient Top Accent Line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500" />

              {/* Close Button */}
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className={`absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all hover:scale-105 active:scale-95 ${
                  isDark 
                    ? "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white" 
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                ✕
              </button>

              <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-6">
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <span>Bug Report</span>
                  </h2>
                  <p className={`text-xs mt-1.5 font-medium leading-relaxed ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                    Laporkan kendala teknis atau error yang Anda alami. Kontribusi Anda sangat berharga bagi kelancaran sistem kami.
                  </p>
                </div>

                {message.text && (
                  <div
                    className={`p-4 rounded-2xl text-xs font-bold border transition-all ${
                      message.type === "success"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                {/* Quota Status Display */}
                {!isLoadingQuota && (
                  <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                    isQuotaExceeded 
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                      : isDark ? "bg-slate-800/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-100 text-slate-500"
                  }`}>
                    <span className="text-[11px] font-bold uppercase tracking-wider">Kuota Laporan Hari Ini</span>
                    <span className="text-sm font-black">
                      {dailyCount} / {maxCount} {isQuotaExceeded && "(Habis)"}
                    </span>
                  </div>
                )}

                {/* Form fields - disabled if quota exceeded */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="bugComment" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Deskripsi Masalah / Kronologi
                    </label>
                    <textarea
                      id="bugComment"
                      rows={4}
                      disabled={isQuotaExceeded || isSubmitting}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Jelaskan secara detail langkah-langkah yang dilakukan hingga menemukan bug atau error tersebut..."
                      className={`w-full px-4 py-3 rounded-2xl outline-none text-xs font-medium resize-none border focus:ring-2 focus:ring-rose-500 transition-all ${
                        isDark 
                          ? "bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-600" 
                          : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400"
                      }`}
                    />
                  </div>

                  {/* Image Upload Area */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                        Unggah Bukti Screenshot (Maks. 2 Gambar)
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {uploadedImages.length}/2 Foto
                      </span>
                    </div>

                    {/* Previews */}
                    {uploadedImages.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {uploadedImages.map((url, idx) => (
                          <div key={idx} className={`relative w-20 h-20 rounded-2xl overflow-hidden border group ${isDark ? "border-slate-800" : "border-slate-200"}`}>
                            <img src={url} alt={`Bukti Bug ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              disabled={isSubmitting}
                              className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {uploadedImages.length < 2 && !isQuotaExceeded && (
                      <label className={`w-full h-24 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-950/40 ${
                        isDark 
                          ? "border-slate-800 hover:border-slate-700 bg-slate-950" 
                          : "border-slate-200 hover:border-slate-300 bg-slate-50"
                      }`}>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleImageUpload}
                          disabled={isUploading || isSubmitting}
                          className="hidden"
                        />
                        {isUploading ? (
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-bold text-slate-400">Mengunggah...</span>
                          </div>
                        ) : (
                          <>
                            <span className="text-lg">📷</span>
                            <span className="text-[10px] font-bold text-slate-400 mt-1">Pilih gambar dari perangkat</span>
                            <span className="text-[8px] font-medium text-slate-500 mt-0.5">Maksimal 5MB (Format JPG, PNG, WEBP)</span>
                          </>
                        )}
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className={`flex-1 py-3 px-4 font-bold text-xs rounded-2xl transition-all active:scale-95 ${
                      isDark 
                        ? "bg-slate-800 hover:bg-slate-700 text-slate-300" 
                        : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                    }`}
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className={`flex-[2] py-3 px-4 font-black text-xs rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 ${
                      isSubmitDisabled
                        ? "bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed shadow-none"
                        : "bg-slate-900 hover:bg-black text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span>Mengirimkan Laporan...</span>
                      </>
                    ) : (
                      "Kirim Laporan"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
