// src/components/analyze/ProductRecommendation.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ProductDetailModal from "./viewproduk";

interface RecommendationProduct {
  id: string;
  namaProduk: string;
  gambarUrl: string;
  tautanAfiliasi: string;
  fokusProduk: string;
  isPinKreator: boolean;
  masalahKulitPin: string | null;
  catatanKreator: string | null;
  similarity: number;
  matchScore: number;
  safetyScore: number;
  rating: number;
  komposisiAsli: string;
  reviews: any[];
}

interface ProductRecommendationProps {
  products: RecommendationProduct[];
  userPrimaryFocus: string;
  userIngredients: string;
  onAnalyzeThis: (ingredients: string) => void;
}

export default function ProductRecommendation({ products, userPrimaryFocus, userIngredients, onAnalyzeThis }: ProductRecommendationProps) {
  // 1. STATE LOKAL: Agar kartu bisa memperbarui angkanya sendiri
  const [localProducts, setLocalProducts] = useState<RecommendationProduct[]>(products);

  // Pastikan update jika data dari props (induk) berubah
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  const [selectedProduct, setSelectedProduct] = useState<RecommendationProduct | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [currentPinPage, setCurrentPinPage] = useState(1);
  const itemsPerPage = 10; 
  const pinPerPage = 5; 

  // 2. FUNGSI PELAPOR: Dipanggil oleh Modal untuk menghitung ulang rating
  const handleReviewAdded = (newReview: any) => {
    if (!selectedProduct) return;
    
    setLocalProducts(prevProducts => prevProducts.map(p => {
      if (p.id === selectedProduct.id) {
        // Gabungkan ulasan baru dengan yang lama
        const updatedReviews = [newReview, ...p.reviews];
        // Hitung rata-rata baru
        const newAvgRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0) / updatedReviews.length;
        
        // Update produk dengan rating terbaru
        return { ...p, reviews: updatedReviews, rating: newAvgRating };
      }
      return p;
    }));
  };

  // Filter menggunakan localProducts (bukan products dari props lagi)
  const creatorPins = localProducts.filter(p => 
    p.isPinKreator && p.masalahKulitPin && userPrimaryFocus.includes(p.masalahKulitPin)
  );

  const similarProducts = localProducts.filter(p => !creatorPins.includes(p));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = similarProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(similarProducts.length / itemsPerPage);

  const totalPinPages = Math.ceil(creatorPins.length / pinPerPage);
  const currentPins = creatorPins.slice((currentPinPage - 1) * pinPerPage, currentPinPage * pinPerPage);

  const RenderStars = ({ rating }: { rating: number }) => (
    <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">
      <span className="text-amber-500 text-[10px]">★</span>
      <span className="text-[10px] font-black text-amber-700">{rating > 0 ? rating.toFixed(1) : "0.0"}</span>
    </div>
  );

  if (localProducts.length === 0) return null;

  return (
    <div className="space-y-10 relative">
      
      {/* === MODAL DETAIL TAHAP 5 === */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal 
            product={selectedProduct} 
            userIngredients={userIngredients}
            onClose={() => setSelectedProduct(null)}
            onAnalyzeThis={onAnalyzeThis}
            onReviewAdded={handleReviewAdded} // <-- Kirim jembatannya ke sini
          />
        )}
      </AnimatePresence>

      {/* === BAGIAN 1: PILIHAN UTAMA KREATOR === */}
      {creatorPins.length > 0 && (
        <div className="bg-gradient-to-b from-amber-50/80 to-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-amber-200/50 pb-5 gap-4">
            <div>
              <h2 className="text-xl font-black text-amber-900 flex items-center gap-2">
                <span>👑</span> Pilihan Eksklusif Kreator
              </h2>
              <p className="text-xs font-bold text-amber-600/80 mt-1 uppercase tracking-widest">Khusus untuk {userPrimaryFocus}</p>
            </div>
            
            {totalPinPages > 1 && (
              <div className="flex gap-2">
                <button disabled={currentPinPage === 1} onClick={() => setCurrentPinPage(p => p - 1)} className="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-30 transition-all">←</button>
                <button disabled={currentPinPage === totalPinPages} onClick={() => setCurrentPinPage(p => p + 1)} className="w-8 h-8 rounded-full bg-white border border-amber-200 flex items-center justify-center font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-30 transition-all">→</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            <AnimatePresence>
              {currentPins.map((pinProduct, idx) => (
                <motion.div
                  key={pinProduct.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedProduct(pinProduct)}
                  className="flex flex-col bg-white rounded-2xl border-2 border-amber-300 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative h-full shadow-amber-900/5"
                >
                  <div className="absolute top-0 left-0 z-10 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[9px] font-black px-3 py-1.5 rounded-br-2xl shadow-md flex items-center gap-1">
                    👑 VIP PICK
                  </div>

                  <div className="w-full aspect-square bg-amber-50/30 relative flex items-center justify-center p-4 border-b border-amber-100">
                    <img src={pinProduct.gambarUrl} alt={pinProduct.namaProduk} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                  </div>

                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <div className="flex items-start">
                      <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded shadow-sm">
                        {pinProduct.similarity}% MIRIP
                      </span>
                    </div>
                    
                    <h3 className="font-bold text-slate-900 text-xs line-clamp-2 leading-snug">
                      {pinProduct.namaProduk}
                    </h3>
                    
                    <div className="bg-amber-50 border border-amber-100 p-2 rounded-lg mt-1 mb-1">
                      <p className="text-[9px] text-amber-900 italic line-clamp-3 leading-relaxed">
                        "{pinProduct.catatanKreator}"
                      </p>
                    </div>
                    
                    <div className="pt-2 mt-auto border-t border-amber-100/50 flex items-center justify-between">
                      <RenderStars rating={pinProduct.rating} />
                      <span className="text-[10px] font-bold text-amber-600 group-hover:underline">Buka ›</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* === BAGIAN 2: ALTERNATIF SERUPA === */}
      {similarProducts.length > 0 && (
        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 border-b border-slate-100 pb-5 gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>🧬</span> Alternatif Serupa Berdasarkan Lab
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-1">Ditemukan {similarProducts.length} produk lain dengan profil kimia serupa.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
            <AnimatePresence>
              {currentItems.map((product, idx) => {
                const absoluteRank = indexOfFirstItem + idx;

                return (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedProduct(product)}
                    className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-blue-300 transition-all cursor-pointer group relative h-full"
                  >
                    {absoluteRank === 0 && <div className="absolute top-0 left-0 z-10 bg-gradient-to-br from-amber-300 to-amber-500 text-white text-[10px] font-black px-3 py-1.5 rounded-br-2xl shadow-md">🥇 Peringkat 1</div>}
                    {absoluteRank === 1 && <div className="absolute top-0 left-0 z-10 bg-gradient-to-br from-slate-300 to-slate-400 text-white text-[10px] font-black px-3 py-1.5 rounded-br-2xl shadow-md">🥈 Peringkat 2</div>}
                    {absoluteRank === 2 && <div className="absolute top-0 left-0 z-10 bg-gradient-to-br from-orange-400 to-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-br-2xl shadow-md">🥉 Peringkat 3</div>}

                    <div className="w-full aspect-square bg-slate-50 relative flex items-center justify-center p-4 border-b border-slate-100">
                      <img src={product.gambarUrl} alt={product.namaProduk} className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    <div className="p-4 flex flex-col flex-1 gap-2">
                      <div className="flex items-start">
                        <span className="text-[9px] font-black text-blue-700 bg-blue-100 border border-blue-200 px-2 py-1 rounded shadow-sm">
                          {product.similarity}% MIRIP
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-xs line-clamp-2 leading-snug">
                        {product.namaProduk}
                      </h3>
                      
                      <p className="text-[9px] font-bold text-slate-400 uppercase line-clamp-1 tracking-wider mt-auto">
                        {product.fokusProduk}
                      </p>
                      
                      <div className="pt-3 mt-1 border-t border-slate-100 flex items-center justify-between">
                        <RenderStars rating={product.rating} />
                        <span className="text-[10px] font-bold text-blue-600 group-hover:underline">Detail ›</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10 pt-6 border-t border-slate-100">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 text-sm font-black hover:bg-slate-50 transition-colors shadow-sm">←</button>
              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shadow-inner">
                {[...Array(totalPages)].map((_, i) => (
                  <button key={i} onClick={() => setCurrentPage(i + 1)} className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${currentPage === i + 1 ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:bg-white hover:shadow-sm"}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 text-sm font-black hover:bg-slate-50 transition-colors shadow-sm">→</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}