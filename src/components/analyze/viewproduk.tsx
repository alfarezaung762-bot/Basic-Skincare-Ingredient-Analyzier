// src/components/analyze/viewproduk.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { ekstrakDaftarBahan } from "@/lib/pemisahBahan";

interface ProductDetailModalProps {
  product: any;
  userIngredients: string;
  onClose: () => void;
  onAnalyzeThis: (ingredients: string) => void;
  onReviewAdded?: (newReview: any) => void; // <-- TAMBAHAN: Fungsi pelapor ke kartu
  showSimilarity?: boolean; // <-- TAMBAHAN: Kontrol visibilitas badge 100% mirip
}

export default function ProductDetailModal({ product, userIngredients, onClose, onAnalyzeThis, onReviewAdded, showSimilarity = false }: ProductDetailModalProps) {
  const { data: session } = useSession();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [localReviews, setLocalReviews] = useState<any[]>(product.reviews || []);
  const [filterStar, setFilterStar] = useState<number>(0);

  const productImages = product.gambarUrl ? product.gambarUrl.split(',').map((u: string) => u.trim()).filter(Boolean) : [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const getStoreLogo = (url: string) => {
    if (!url) return { name: "Beli Sekarang", icon: "🛒", bg: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" };
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.includes("shopee") || lowerUrl.includes("shp.ee")) {
      return { 
        name: "Shopee Affiliate", 
        iconImg: "/shopee-seeklogo.png", 
        logoHeight: "h-7",
        bg: "bg-[#FF5000] hover:bg-[#E64800] shadow-[#FF5000]/20" 
      };
    }
    if (lowerUrl.includes("tokopedia") || lowerUrl.includes("tiktok")) {
      return { 
        name: "Tokopedia / TikTok", 
        iconImg: "/vecteezy_tiktok-shop-tokopedia-marketplace-online-shopping-icon_66779667-removebg-preview.png", 
        logoHeight: "h-10",
        bg: "bg-[#00AA5B] hover:bg-[#008F4C] shadow-[#00AA5B]/20" 
      };
    }
    return { name: "Beli Sekarang", icon: "🛒", logoHeight: "h-7", bg: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" };
  };

  const purchaseLinks = product.tautanAfiliasi 
    ? product.tautanAfiliasi.split("|").map((t: string) => t.trim()).filter(Boolean) 
    : [];

  useEffect(() => {
    if (productImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [productImages.length]);

  const userIngredientsParsed = userIngredients ? ekstrakDaftarBahan(userIngredients) : [];
  const catalogIngs = product.komposisiAsli ? ekstrakDaftarBahan(product.komposisiAsli) : [];
  const focusList = product.fokusProduk ? product.fokusProduk.split(',').map((f: string) => f.trim()) : [];
  const charCount = comment.length;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.email) {
      return alert("Harap masuk (login) terlebih dahulu untuk memberikan ulasan.");
    }

    if (charCount > 60) return alert("Ulasan terlalu panjang! Maksimal 60 huruf.");

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/analyze/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          rating: rating,
          komentar: comment,
          userEmail: session.user.email
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        if (responseData.isMaxEdits) {
          alert(responseData.message);
          return;
        }
        throw new Error(responseData.message || "Gagal mengirim ulasan");
      }

      // 1. Update tampilan di dalam Modal
      if (responseData.isEdited) {
        // Ganti review yang lama
        setLocalReviews(prev => prev.map(r => r.id === responseData.id ? responseData : r));
        alert(responseData.message);
      } else {
        // Tambah review baru di atas
        setLocalReviews([responseData, ...localReviews]);
        alert("Ulasan pertama Anda berhasil ditambahkan! Anda memiliki sisa 1x kesempatan edit.");
      }

      // 2. Laporkan ke Komponen Kartu (Parent) agar bintang di luar ikut berubah
      if (onReviewAdded) {
        onReviewAdded(responseData);
      }

      setComment("");
      setRating(5);

    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan sistem saat menyimpan ulasan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!session?.user?.email) return;
    if (!confirm("Apakah Anda yakin ingin menghapus ulasan ini? Anda hanya memiliki kesempatan menulis ulang 1 kali.")) return;

    try {
      const res = await fetch(`/api/analyze/reviews?id=${reviewId}&email=${session.user.email}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert(data.message);
      // Hapus dari state lokal
      setLocalReviews(prev => prev.filter(r => r.id !== reviewId));
    } catch (err: any) {
      alert(err.message || "Gagal menghapus ulasan.");
    }
  };

  const filteredReviews = filterStar === 0 ? localReviews : localReviews.filter(r => r.rating === filterStar);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 30, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="bg-slate-50 w-full max-w-4xl max-h-[95vh] rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-full font-black transition-all shrink-0">✕</button>
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate" title={product.namaProduk}>{product.namaProduk}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.tipeProduk}</p>
            </div>
          </div>
          {showSimilarity && product.similarity === 100 && (
            <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 border border-emerald-400 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-md shadow-emerald-500/25 text-white animate-pulse">
              <span className="text-xl">✨</span>
              <span className="text-xs font-black">Formulasi Identik (100%) dengan analisis bahanmu</span>
            </div>
          )}
        </div>

        <div className="overflow-y-auto flex-1 p-5 sm:p-8 space-y-8 custom-scrollbar">

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="aspect-square bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex items-center justify-center relative overflow-hidden group">
                {product.isPinKreator && (
                  <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-md z-20">👑 VIP KREATOR</div>
                )}

                <AnimatePresence mode="wait">
                  {productImages.length > 0 ? (
                    <motion.img
                      key={currentImageIndex}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      src={productImages[currentImageIndex]}
                      alt={`Produk ${currentImageIndex + 1}`}
                      className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500 mix-blend-multiply"
                    />
                  ) : (
                    <div className="text-4xl text-slate-300">📦</div>
                  )}
                </AnimatePresence>

                {/* Dot Indicators */}
                {productImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                    {productImages.map((_: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${currentImageIndex === idx ? 'bg-blue-600 w-4' : 'bg-blue-200 hover:bg-blue-400'}`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2.5 w-full">
                {purchaseLinks.length === 0 ? (
                  <button disabled className="w-full py-3 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-center text-xs font-black rounded-xl cursor-not-allowed flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700">
                    <span>🚫</span> Tautan Pembelian Tidak Tersedia
                  </button>
                ) : (
                  <div className={`grid gap-2 ${purchaseLinks.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {purchaseLinks.map((link: string, idx: number) => {
                      const store = getStoreLogo(link);
                      return (
                        <a 
                          key={idx} 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="w-full py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all flex items-center justify-center gap-3 min-h-[50px] px-4"
                        >
                          {store.iconImg ? (
                            <img src={store.iconImg} alt={store.name} className={`${store.logoHeight || 'h-7'} w-auto object-contain`} />
                          ) : (
                            <span className="text-lg">{store.icon}</span>
                          )}
                          {purchaseLinks.length === 1 && (
                            <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                              Beli di {store.name.split(" ")[0]}
                            </span>
                          )}
                        </a>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => onAnalyzeThis(product.komposisiAsli)} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-black rounded-xl transition-all shadow-md">🔬 Analisis Ulang</button>
              </div>
            </div>

            <div className="md:col-span-7 space-y-6">
              <div>
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fokus Perawatan Produk</h3>
                <div className="flex flex-wrap gap-2">
                  {focusList.map((fokus: string, idx: number) => (
                    <span key={idx} className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg shadow-sm">✨ {fokus}</span>
                  ))}
                </div>
                {/* Tag Khusus & Target Kulit */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {product.targetSkinTypes && product.targetSkinTypes.split(",").map((st: string) => st.trim()).filter(Boolean).map((st: string, i: number) => (
                    <span key={`st-${i}`} className="text-[9px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-1 rounded-lg shadow-sm">🎯 {st}</span>
                  ))}
                  {product.tagKhusus && product.tagKhusus.split(",").map((tag: string) => tag.trim()).filter(Boolean).map((tag: string, i: number) => (
                    <span key={`tag-${i}`} className="text-[9px] font-bold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-1 rounded-lg shadow-sm capitalize">🏷️ {tag}</span>
                  ))}
                </div>
              </div>

              {product.isPinKreator && product.catatanKreator && (
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-200 relative shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-amber-500 text-lg">📌</span>
                    <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Catatan Ahli Kreator</span>
                  </div>
                  <p className="text-sm italic text-amber-900 font-medium leading-relaxed">"{product.catatanKreator}"</p>
                </div>
              )}

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pembedahan Label Komposisi</h3>
                  <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded border border-rose-100">Merah Muda = Cocok dengan inputmu</span>
                </div>
                <div className="flex flex-wrap gap-2.5 max-h-[180px] overflow-y-auto custom-scrollbar p-1">
                  {catalogIngs.map((ing: string, idx: number) => {
                    const isMatch = userIngredientsParsed.includes(ing);
                    return (
                      <span key={idx} className={`px-3.5 py-2 rounded-xl text-[10px] font-bold border transition-all capitalize leading-none ${isMatch ? "bg-rose-500 text-white border-rose-600 shadow-md transform scale-105" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{ing}</span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 border-dashed" />

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                <svg className="w-5 h-5 text-slate-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Diskusi & Ulasan Komunitas
              </h3>
              <div className="flex items-center gap-3">

                {/* FILTER BINTANG */}
                <select
                  value={filterStar}
                  onChange={(e) => setFilterStar(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-sm outline-none cursor-pointer focus:border-rose-400"
                >
                  <option value={0}>Semua Bintang</option>
                  <option value={5}>⭐⭐⭐⭐⭐ (5)</option>
                  <option value={4}>⭐⭐⭐⭐ (4)</option>
                  <option value={3}>⭐⭐⭐ (3)</option>
                  <option value={2}>⭐⭐ (2)</option>
                  <option value={1}>⭐ (1)</option>
                </select>

                <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 shadow-sm">
                  <span className="text-amber-500 text-base font-black">★</span>
                  <span className="font-black text-amber-800 text-sm">
                    {localReviews.length > 0 ? (localReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / localReviews.length).toFixed(1) : "0.0"}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form onSubmit={handleReviewSubmit} className="bg-slate-50 border border-slate-200 p-6 rounded-[2rem] space-y-5 relative overflow-hidden shadow-sm">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-200 rounded-full blur-[80px] opacity-40"></div>
                <div className="relative z-10">
                  <h4 className="font-bold text-sm text-slate-800 mb-1">Berikan Penilaianmu</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Bantu orang lain dengan membagikan efeknya di kulitmu.</p>
                </div>

                <div className="flex gap-2 relative z-10 bg-white p-3 rounded-xl border border-slate-200 w-fit shadow-sm">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button 
                      key={s} 
                      type="button" 
                      onClick={() => setRating(s)} 
                      className={`text-2xl transition-all hover:scale-110 active:scale-95 ${
                        s <= rating ? "text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)]" : "text-slate-300 dark:text-slate-700"
                      }`}
                    >
                      {s <= rating ? "★" : "☆"}
                    </button>
                  ))}
                </div>

                <textarea
                  value={comment} onChange={(e) => setComment(e.target.value)}
                  className="w-full p-4 rounded-xl bg-white border border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-50 outline-none text-sm text-slate-700 placeholder-slate-400 resize-none transition-all relative z-10 shadow-sm"
                  placeholder={session ? "Tulis pendapatmu di sini... (Maks 60 Huruf)" : "Silakan login untuk mengulas..."}
                  rows={3} disabled={!session}
                />

                <div className="flex justify-between items-center relative z-10">
                  <span className="text-[9px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-400 border border-slate-200">
                    {charCount}/60 HURUF
                  </span>
                  <div className="flex gap-2">
                    {session?.user?.name && localReviews.find(r => r.user?.name === session.user?.name && !r.isDeleted) ? (
                      <button type="button" onClick={() => handleDeleteReview(localReviews.find(r => r.user?.name === session.user?.name && !r.isDeleted).id)} className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-black rounded-xl text-xs transition-all active:scale-95 shadow-sm">
                        Hapus Ulasan 🗑️
                      </button>
                    ) : null}
                    <button 
                      disabled={isSubmitting || !comment.trim() || charCount > 60 || !session} 
                      className={`px-5 py-2.5 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                        isSubmitting || !comment.trim() || charCount > 60 || !session
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-slate-900 hover:bg-slate-800 text-white shadow-md"
                      }`}
                    >
                      <span>{isSubmitting ? "Mengirim..." : "Kirim Ulasan"}</span>
                      <span className="text-xs">✏️</span>
                    </button>
                  </div>
                </div>
              </form>

              <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {filteredReviews.length > 0 ? (
                  filteredReviews.map((rev: any, i: number) => (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={i} className="bg-white p-5 rounded-2xl border border-rose-500 shadow-sm flex flex-col sm:flex-row gap-4 sm:gap-5 items-stretch overflow-hidden">
                      <div className="flex-shrink-0 w-full sm:w-[140px] flex flex-col justify-start border-b sm:border-b-0 sm:border-r border-slate-200 pb-3 sm:pb-0 sm:pr-4">
                        <span className="font-black text-rose-500 text-sm leading-snug break-words">{rev.user?.name || "Pengguna Aplikasi"}</span>
                        <span className="text-[10px] italic text-slate-400 mt-1">
                          {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {rev.editCount > 1 && (
                          <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-2 w-fit">
                            Ditulis Ulang
                          </span>
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-start min-w-0">
                        <div className="flex text-sm mb-1.5 drop-shadow-sm gap-0.5">
                          {[...Array(5)].map((_, star) => (
                            <span 
                              key={star} 
                              className={star < rev.rating ? "text-amber-400" : "text-slate-350 dark:text-slate-600"}
                            >
                              {star < rev.rating ? "★" : "☆"}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed break-words whitespace-pre-wrap">"{rev.komentar}"</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-8 bg-white rounded-[2rem] border border-dashed border-slate-200 shadow-sm">
                    <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 011.9 2.535l-.74 2.96H19a2 2 0 012 2v1.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 01-.707.293h-3.586V14z" />
                    </svg>
                    <p className="text-slate-800 text-sm font-bold mb-1">
                      {filterStar === 0 ? "Jadilah yang pertama!" : "Tidak ada ulasan"}
                    </p>
                    <p className="text-slate-500 text-xs font-semibold max-w-[220px] leading-relaxed">
                      {filterStar === 0 ? "Bagikan pengalamanmu mencoba produk ini." : "Belum ada ulasan untuk filter bintang ini."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </motion.div>
    </motion.div>
  );
}