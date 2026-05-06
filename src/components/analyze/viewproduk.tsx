// src/components/analyze/viewproduk.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

interface ProductDetailModalProps {
  product: any;
  userIngredients: string;
  onClose: () => void;
  onAnalyzeThis: (ingredients: string) => void;
  onReviewAdded?: (newReview: any) => void; // <-- TAMBAHAN: Fungsi pelapor ke kartu
}

export default function ProductDetailModal({ product, userIngredients, onClose, onAnalyzeThis, onReviewAdded }: ProductDetailModalProps) {
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
    if (lowerUrl.includes("shopee") || lowerUrl.includes("shp.ee")) return { name: "Beli di Shopee", icon: "🛍️", bg: "bg-[#EE4D2D] hover:bg-[#D73211] shadow-[#EE4D2D]/20" };
    if (lowerUrl.includes("tokopedia") || lowerUrl.includes("tokopedia.link")) return { name: "Beli di Tokopedia", icon: "🦉", bg: "bg-[#00AA5B] hover:bg-[#008F4C] shadow-[#00AA5B]/20" };
    if (lowerUrl.includes("tiktok") || lowerUrl.includes("vt.tiktok.com")) return { name: "Beli di TikTok Shop", icon: "🎵", bg: "bg-black hover:bg-zinc-800 shadow-black/20" };
    return { name: "Beli Sekarang", icon: "🛒", bg: "bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" };
  };
  const storeInfo = getStoreLogo(product.tautanAfiliasi);

  useEffect(() => {
    if (productImages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [productImages.length]);

  const safeUserIngredients = userIngredients || "";
  const userListLower = safeUserIngredients.toLowerCase();
  const catalogIngs = product.komposisiAsli ? product.komposisiAsli.split(/,\s*(?![^()]*\))|[\n;]/).map((s: string) => s?.replace(/[()]/g, '').trim()).filter((s: string) => s?.length > 0) : [];
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
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-full font-black transition-all">✕</button>
            <div>
              <h2 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate max-w-[200px] sm:max-w-md">{product.namaProduk}</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.tipeProduk}</p>
            </div>
          </div>
          <div className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <span className="text-xl">✨</span>
            <span className="text-xs font-black text-rose-700">{product.similarity}% Cocok</span>
          </div>
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

              <div className="grid grid-cols-2 gap-3">
                <a href={product.tautanAfiliasi} target="_blank" rel="noopener noreferrer" className={`col-span-2 sm:col-span-1 py-3.5 ${storeInfo.bg} text-white text-center text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-2`}><span>{storeInfo.icon}</span> {storeInfo.name}</a>
                <button onClick={() => onAnalyzeThis(product.komposisiAsli)} className="col-span-2 sm:col-span-1 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-center text-xs font-black rounded-xl transition-all shadow-md">🔬 Analisis Ulang</button>
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
                <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                  {catalogIngs.map((ing: string, idx: number) => {
                    const isMatch = userListLower.includes(ing.toLowerCase());
                    return (
                      <span key={idx} className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${isMatch ? "bg-rose-500 text-white border-rose-600 shadow-md transform scale-105" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{ing}</span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 border-dashed" />

          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2"><span>💬</span> Diskusi & Ulasan Komunitas</h3>
              <div className="flex items-center gap-3">
                
                {/* FILTER BINTANG */}
                <select 
                  value={filterStar} 
                  onChange={(e) => setFilterStar(Number(e.target.value))}
                  className="bg-white border border-slate-200 text-slate-600 text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-sm outline-none cursor-pointer focus:border-amber-400"
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
                  <h4 className="font-black text-sm text-slate-800 mb-1">Berikan Penilaianmu</h4>
                  <p className="text-[10px] text-slate-500 font-medium">Bantu orang lain dengan membagikan efeknya di kulitmu.</p>
                </div>

                <div className="flex gap-2 relative z-10 bg-white p-3 rounded-xl border border-slate-200 w-fit shadow-sm">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" onClick={() => setRating(s)} className={`text-2xl transition-all hover:scale-110 active:scale-95 ${s <= rating ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]" : "text-slate-300"}`}>★</button>
                  ))}
                </div>

                <textarea
                  value={comment} onChange={(e) => setComment(e.target.value)}
                  className="w-full p-4 rounded-xl bg-white border border-slate-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-50 outline-none text-sm text-slate-700 placeholder-slate-400 resize-none transition-all relative z-10 shadow-sm"
                  placeholder={session ? "Tulis pendapatmu di sini... (Maks 60 Huruf)" : "Silakan login untuk mengulas..."}
                  rows={3} disabled={!session}
                />

                <div className="flex justify-between items-center relative z-10">
                  <span className={`text-[10px] font-black px-2 py-1 rounded bg-white border ${charCount > 60 ? "text-rose-500 border-rose-200 bg-rose-50" : "text-slate-400 border-slate-200"}`}>
                    {charCount}/60 HURUF
                  </span>
                  <div className="flex gap-2">
                    {session?.user?.name && localReviews.find(r => r.user?.name === session.user?.name && !r.isDeleted) ? (
                      <button type="button" onClick={() => handleDeleteReview(localReviews.find(r => r.user?.name === session.user?.name && !r.isDeleted).id)} className="px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-600 border border-rose-200 font-black rounded-xl text-xs transition-all active:scale-95 shadow-sm">
                        Hapus Ulasan 🗑️
                      </button>
                    ) : null}
                    <button disabled={isSubmitting || !comment.trim() || charCount > 60 || !session} className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl text-xs transition-all disabled:opacity-30 disabled:grayscale active:scale-95 shadow-md">
                      {isSubmitting ? "Mengirim..." : "Kirim Ulasan 🚀"}
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
                        <div className="flex text-amber-400 text-sm mb-1.5 drop-shadow-sm">
                          {[...Array(5)].map((_, star) => (
                            <span key={star}>{star < rev.rating ? "★" : "☆"}</span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-relaxed break-words whitespace-pre-wrap">"{rev.komentar}"</p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                    <span className="text-3xl mb-2 grayscale opacity-50">📭</span>
                    <p className="text-slate-500 text-sm font-bold">
                      {filterStar === 0 ? "Jadilah yang pertama!\nBagikan pengalamanmu mencoba produk ini." : "Tidak ada ulasan dengan bintang ini."}
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