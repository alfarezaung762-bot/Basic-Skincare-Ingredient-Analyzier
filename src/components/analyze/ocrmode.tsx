// src/components/analyze/ocrmode.tsx
"use client";

import { useState, useRef, useEffect } from "react";

interface OcrModeProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (extractedText: string) => void;
}

export default function OcrMode({ isOpen, onClose, onResult }: OcrModeProps) {
  const [mode, setMode] = useState<"single" | "dual">("single");
  const [images, setImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [error, setError] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera when closing modal
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      // Reset state
      setImages([]);
      setExtractedText("");
      setError("");
      setIsProcessing(false);
      setIsCapturing(false);
    }
  }, [isOpen]);

  const startCamera = async () => {
    setError("");
    setIsCapturing(true);
    try {
      if (streamRef.current) {
        stopCamera();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Preferred back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setIsCapturing(false);
      setError("Gagal mengakses kamera. Pastikan izin kamera telah diberikan atau gunakan opsi unggah file.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Draw mirror image if front camera is used (optional, environment is default)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

      if (mode === "single") {
        setImages([dataUrl]);
        stopCamera();
      } else {
        // Dual Mode
        if (images.length < 2) {
          const newImages = [...images, dataUrl];
          setImages(newImages);
          if (newImages.length >= 2) {
            stopCamera();
          }
        }
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files);
    const maxFiles = mode === "single" ? 1 : 2 - images.length;
    const filesToProcess = fileList.slice(0, maxFiles);

    filesToProcess.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImages((prev) => {
          if (mode === "single") return [base64String];
          const combined = [...prev, base64String].slice(0, 2);
          return combined;
        });
      };
      reader.onerror = () => {
        setError("Gagal membaca file foto.");
      };
      reader.readAsDataURL(file);
    });

    // Reset input value
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    // Re-enable camera if in the middle of dual mode capture
    if (mode === "dual" && images.length - 1 < 2 && !streamRef.current && isCapturing) {
      startCamera();
    }
  };

  const handleProcessOcr = async () => {
    if (images.length === 0) {
      setError("Silakan ambil atau unggah foto terlebih dahulu.");
      return;
    }

    if (mode === "dual" && images.length < 2) {
      setError("Harap ambil 2 foto untuk mode botol melengkung.");
      return;
    }

    setIsProcessing(true);
    setError("");
    try {
      const res = await fetch("/api/analyze/ocrmode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, mode }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Gagal memindai teks bahan.");
      }

      setExtractedText(data.extractedText || "");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan koneksi server.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyResult = () => {
    if (extractedText.trim()) {
      onResult(extractedText);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto custom-scrollbar">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl border border-teal-100 dark:border-teal-900/40 shadow-2xl flex flex-col max-h-[90vh] relative overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-teal-50/30 dark:bg-teal-950/20">
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <div>
              <h3 className="font-black text-slate-900 dark:text-slate-100 text-sm md:text-base">Pindai Bahan Skincare (OCR)</h3>
              <p className="text-[10px] md:text-xs text-slate-400 font-semibold">Foto label komposisi produk untuk analisis otomatis</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs font-semibold">
              ⚠️ {error}
            </div>
          )}

          {/* Mode Selector Tabs (Hidden when capturing/processing to focus) */}
          {!isCapturing && !isProcessing && !extractedText && (
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => { setMode("single"); setImages([]); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === "single"
                    ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                📸 1 Foto
              </button>
              <button
                type="button"
                onClick={() => { setMode("dual"); setImages([]); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  mode === "dual"
                    ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                📸📸 2 Foto (Botol Melengkung)
              </button>
            </div>
          )}

          {/* Active Camera View */}
          {isCapturing && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-700 shadow-inner">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-60 object-cover"
              />
              <div className="absolute inset-0 flex flex-col justify-between p-4 bg-gradient-to-t from-slate-950/50 via-transparent to-slate-950/20 pointer-events-none">
                <div className="self-end bg-teal-500/90 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-md animate-pulse">
                  {mode === "dual" ? `Foto Sisi #${images.length + 1}` : "Kamera Aktif"}
                </div>
                <div className="self-center flex gap-3 pointer-events-auto">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="w-14 h-14 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center border-4 border-white dark:border-slate-800 shadow-lg transition-all active:scale-90"
                    title="Ambil Foto"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="w-14 h-14 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg transition-all active:scale-90"
                    title="Batal"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload and Capture Actions (Only show when not capturing/processing/showing results) */}
          {!isCapturing && !isProcessing && !extractedText && (
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={startCamera}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-teal-200 dark:border-teal-800/40 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 rounded-2xl transition-all cursor-pointer text-slate-600 dark:text-slate-300 font-bold group"
              >
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📷</span>
                <span className="text-xs">Buka Kamera</span>
              </button>
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 dark:border-slate-800/40 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/20 rounded-2xl transition-all cursor-pointer text-slate-600 dark:text-slate-300 font-bold group"
              >
                <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">📁</span>
                <span className="text-xs">Unggah Foto</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple={mode === "dual"}
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Captured/Uploaded Images Preview List */}
          {images.length > 0 && !extractedText && !isProcessing && (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400">
                🖼️ Preview Foto ({images.length}/{mode === "single" ? 1 : 2})
              </label>
              <div className="grid grid-cols-2 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 group shadow-sm">
                    <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-32 object-cover" />
                    <div className="absolute top-1 left-1 bg-black/60 text-white text-[9px] font-black px-1.5 py-0.5 rounded">
                      Sisi #{idx + 1}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1.5 right-1.5 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md transition-colors"
                      title="Hapus"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                
                {/* Visual slot for missing image in dual mode */}
                {mode === "dual" && images.length === 1 && !isCapturing && (
                  <div 
                    onClick={startCamera}
                    className="border-2 border-dashed border-teal-200 dark:border-teal-800/40 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 hover:border-teal-500 cursor-pointer h-32 bg-teal-50/10"
                  >
                    <span className="text-xl mb-1">📸</span>
                    <span className="text-[10px] font-bold">Ambil Foto Kedua</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {isProcessing && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="w-12 h-12 border-4 border-teal-100 dark:border-teal-900/40 border-t-teal-600 rounded-full animate-spin"></div>
              <p className="text-xs font-bold text-teal-600 dark:text-teal-400 animate-pulse">AI sedang mengekstrak teks bahan skincare...</p>
              <p className="text-[10px] text-slate-400 font-semibold text-center px-6">Proses ini memakan waktu beberapa detik karena mendeteksi baris bahan pada kemasan melengkung.</p>
            </div>
          )}

          {/* OCR Result View */}
          {extractedText && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                  <span>📝</span> Hasil Pemindaian AI (Dapat Diedit)
                </label>
                <button
                  type="button"
                  onClick={() => { setExtractedText(""); setImages([]); }}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  🔄 Ulangi Pindai
                </button>
              </div>
              <textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none transition-all h-40 custom-scrollbar font-mono leading-relaxed"
                placeholder="Hasil teks ocr..."
              />
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                💡 Silakan periksa kembali daftar bahan di atas. Anda bisa mengedit ejaan secara manual jika ada yang salah sebelum menggunakannya.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          
          {images.length > 0 && !extractedText && !isProcessing && (
            <button
              type="button"
              onClick={handleProcessOcr}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <span>🔍</span> Ekstrak Bahan
            </button>
          )}

          {extractedText && (
            <button
              type="button"
              onClick={handleApplyResult}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
            >
              <span>✅</span> Gunakan Hasil Ini
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
