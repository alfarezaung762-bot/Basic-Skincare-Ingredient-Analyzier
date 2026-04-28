// src/components/analyze/viewproduk.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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

  const safeUserIngredients = userIngredients || "";
  const userListLower = safeUserIngredients.toLowerCase();
  const catalogIngs = product.komposisiAsli ? product.komposisiAsli.split(/[,\n;]/).map((s: string) => s.trim()).filter((s: string) => s.length > 0) : [];
  const focusList = product.fokusProduk ? product.fokusProduk.split(',').map((f: string) => f.trim()) : [];
  const wordCount = comment.trim() === "" ? 0 : comment.trim().split(/\s+/).length;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.email) {
      return alert("Harap masuk (login) terlebih dahulu untuk memberikan ulasan.");
    }

    if (wordCount > 30) return alert("Ulasan terlalu panjang! Maksimal 30 kata.");
    
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

      if (!res.ok) throw new Error("Gagal mengirim ulasan");

      const savedReview = await res.json();

      // 1. Update tampilan di dalam Modal
      setLocalReviews([savedReview, ...localReviews]); 
      
      // 2. Laporkan ke Komponen Kartu (Parent) agar bintang di luar ikut berubah
      if (onReviewAdded) {
        onReviewAdded(savedReview);
      }

      setComment("");
      setRating(5);
      
    } catch (err) {
      alert("Terjadi kesalahan sistem saat menyimpan ulasan.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <div className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-inner">
            <span className="text-xl">🧬</span>
            <span className="text-xs font-black text-blue-700">{product.similarity}% Mirip</span>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-5 sm:p-8 space-y-8 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 flex flex-col gap-4">
              <div className="aspect-square bg-white rounded-[2rem] border border-slate-200 shadow-sm p-6 flex items-center justify-center relative overflow-hidden group">
                {product.isPinKreator && (
                   <div className="absolute top-4 left-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-md z-10">👑 VIP KREATOR</div>
                )}
                <img src={product.gambarUrl} alt="Produk" className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500 mix-blend-multiply" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a href={product.tautanAfiliasi} target="_blank" rel="noopener noreferrer" className="col-span-2 sm:col-span-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-center text-xs font-black rounded-xl shadow-lg shadow-blue-600/20 transition-all">🛒 Beli Sekarang</a>
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
                  <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-100">Biru = Cocok dengan inputmu</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-[150px] overflow-y-auto custom-scrollbar p-1">
                  {catalogIngs.map((ing: string, idx: number) => {
                    const isMatch = userListLower.includes(ing.toLowerCase());
                    return (
                      <span key={idx} className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${isMatch ? "bg-blue-500 text-white border-blue-600 shadow-md transform scale-105" : "bg-slate-50 text-slate-500 border-slate-200"}`}>{ing}</span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200 border-dashed" />

          <div className="space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="font-black text-slate-900 text-lg flex items-center gap-2"><span>💬</span> Diskusi & Ulasan Komunitas</h3>
               <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 shadow-sm">
                  <span className="text-amber-500 text-base font-black">★</span>
                  <span className="font-black text-amber-800 text-sm">
                    {localReviews.length > 0 ? (localReviews.reduce((acc: number, r: any) => acc + r.rating, 0) / localReviews.length).toFixed(1) : "0.0"}
                  </span>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <form onSubmit={handleReviewSubmit} className="bg-[#0B1120] p-6 rounded-[2rem] space-y-5 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
                 <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full blur-[80px] opacity-30"></div>
                 <div className="relative z-10">
                   <h4 className="font-black text-sm text-white mb-1">Berikan Penilaianmu</h4>
                   <p className="text-[10px] text-slate-400 font-medium">Bantu orang lain dengan membagikan efeknya di kulitmu.</p>
                 </div>

                 <div className="flex gap-2 relative z-10 bg-white/5 p-3 rounded-xl border border-white/10 w-fit">
                   {[1,2,3,4,5].map(s => (
                     <button key={s} type="button" onClick={() => setRating(s)} className={`text-2xl transition-all hover:scale-110 active:scale-95 ${s <= rating ? "text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : "text-slate-600"}`}>★</button>
                   ))}
                 </div>
                 
                 <textarea 
                   value={comment} onChange={(e) => setComment(e.target.value)}
                   className="w-full p-4 rounded-xl bg-white/5 border border-white/10 focus:border-blue-400 focus:bg-white/10 outline-none text-sm text-white placeholder-slate-500 resize-none transition-all relative z-10"
                   placeholder={session ? "Tulis pendapatmu di sini... (Maks 30 Kata)" : "Silakan login untuk mengulas..."} 
                   rows={3} disabled={!session}
                 />
                 
                 <div className="flex justify-between items-center relative z-10">
                   <span className={`text-[10px] font-black px-2 py-1 rounded bg-white/10 ${wordCount > 30 ? "text-rose-400 border border-rose-400/30" : "text-slate-400"}`}>
                     {wordCount}/30 KATA
                   </span>
                   <button disabled={isSubmitting || !comment.trim() || wordCount > 30 || !session} className="px-6 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-black rounded-xl text-xs transition-all disabled:opacity-30 disabled:grayscale active:scale-95 shadow-lg shadow-blue-500/20">
                     {isSubmitting ? "Mengirim..." : "Kirim Ulasan 🚀"}
                   </button>
                 </div>
              </form>

              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {localReviews.length > 0 ? (
                  localReviews.map((rev: any, i: number) => (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-black text-blue-600">
                            {rev.user?.name ? rev.user.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="font-black text-slate-800 text-xs">{rev.user?.name || "Pengguna Aplikasi"}</span>
                        </div>
                        <div className="flex text-amber-400 text-[10px]">
                          {[...Array(5)].map((_, star) => (
                             <span key={star}>{star < rev.rating ? "★" : "☆"}</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 font-medium leading-relaxed pl-9">"{rev.komentar}"</p>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                     <span className="text-3xl mb-2 grayscale opacity-50">📭</span>
                     <p className="text-slate-500 text-sm font-bold">Jadilah yang pertama!<br/><span className="font-medium text-xs text-slate-400">Bagikan pengalamanmu mencoba produk ini.</span></p>
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