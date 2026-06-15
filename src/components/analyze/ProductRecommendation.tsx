// src/components/analyze/ProductRecommendation.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
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
  targetSkinTypes?: string | null;
  tagKhusus?: string | null;
}

interface ProductRecommendationProps {
  products: RecommendationProduct[];
  userPrimaryFocus: string;
  userIngredients: string;
  userSkinType?: string;
  onAnalyzeThis: (ingredients: string) => void;
}

type FilterTab = "LAB" | "SKIN" | "VIP" | "RATING";

const FILTER_TABS: { key: FilterTab; label: string; icon: string; desc: string }[] = [
  { key: "VIP", label: "Pilihan Kreator", icon: "👑", desc: "Rekomendasi langsung dari kreator" },
  { key: "LAB", label: "Kemiripan Bahan", icon: "🧬", desc: "Diurutkan dari komposisi paling mirip" },
  { key: "SKIN", label: "Sesuai Tipe Kulitmu", icon: "🎯", desc: "Produk yang paling aman & cocok untuk profil kulitmu" },
  { key: "RATING", label: "Rating Tertinggi", icon: "⭐", desc: "Produk dengan ulasan terbaik dari komunitas" },
];

export default function ProductRecommendation({ products, userPrimaryFocus, userIngredients, userSkinType, onAnalyzeThis }: ProductRecommendationProps) {
  const [localProducts, setLocalProducts] = useState<RecommendationProduct[]>(products);
  const [selectedProduct, setSelectedProduct] = useState<RecommendationProduct | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("VIP");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => { setLocalProducts(products); }, [products]);
  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  const handleReviewAdded = (newReview: any) => {
    if (!selectedProduct) return;
    setLocalProducts(prevProducts => prevProducts.map(p => {
      if (p.id === selectedProduct.id) {
        const updatedReviews = [newReview, ...p.reviews];
        const newAvgRating = updatedReviews.reduce((acc, r) => acc + r.rating, 0) / updatedReviews.length;
        return { ...p, reviews: updatedReviews, rating: newAvgRating };
      }
      return p;
    }));
  };

  // Ekstrak base skin type dari string profil user
  const userBaseSkin = useMemo(() => {
    if (!userSkinType) return "";
    const lower = userSkinType.toLowerCase();
    if (lower.includes("berminyak")) return "berminyak";
    if (lower.includes("kering")) return "kering";
    if (lower.includes("kombinasi")) return "kombinasi";
    if (lower.includes("normal")) return "normal";
    if (lower.includes("sensitif")) return "sensitif";
    return "";
  }, [userSkinType]);

  // Filter & sort berdasarkan tab aktif
  const filteredProducts = useMemo(() => {
    let list = [...localProducts];
    
    switch (activeTab) {
      case "LAB":
        // Filter >= 10% similarity, sort by similarity DESC
        list = list.filter(p => p.similarity >= 10);
        list.sort((a, b) => b.similarity - a.similarity);
        break;
      
      case "SKIN":
        // Sort by combined matchScore + safetyScore, filtered by targetSkinTypes jika ada
        if (userBaseSkin) {
          list = list.filter(p => {
            if (!p.targetSkinTypes) return true; // Jika admin belum set, tetap tampilkan
            return p.targetSkinTypes.toLowerCase().includes(userBaseSkin);
          });
        }
        list.sort((a, b) => {
          const scoreA = a.matchScore * 0.5 + a.safetyScore * 0.5;
          const scoreB = b.matchScore * 0.5 + b.safetyScore * 0.5;
          return scoreB - scoreA;
        });
        break;
      
      case "VIP":
        // Hanya produk yang di-pin kreator dan memiliki irisan fokus perawatan dengan user
        list = list.filter(p => {
          if (!p.isPinKreator) return false;
          if (!userPrimaryFocus) return true;
          const prodFocusList = p.fokusProduk ? p.fokusProduk.split(",").map(f => f.trim().toLowerCase()).filter(Boolean) : [];
          const userFocusList = userPrimaryFocus.split(",").map(f => f.trim().toLowerCase()).filter(Boolean);
          return prodFocusList.some(pf => userFocusList.some(uf => pf.includes(uf) || uf.includes(pf)));
        });
        list.sort((a, b) => b.similarity - a.similarity);
        break;
      
      case "RATING":
        // Sort by rating (with ratings floating to top), fallback to combined match & safety score
        list.sort((a, b) => {
          const hasRatingA = a.rating > 0;
          const hasRatingB = b.rating > 0;
          if (hasRatingA && !hasRatingB) return -1;
          if (!hasRatingA && hasRatingB) return 1;
          if (hasRatingA && hasRatingB) {
            if (b.rating !== a.rating) return b.rating - a.rating;
            return b.reviews.length - a.reviews.length;
          }
          // Jika keduanya belum ada rating (rating === 0), urutkan dari kecocokan teraman tertinggi
          const scoreA = (a.matchScore + a.safetyScore) / 2;
          const scoreB = (b.matchScore + b.safetyScore) / 2;
          return scoreB - scoreA;
        });
        break;
    }

    return list;
  }, [localProducts, activeTab, userBaseSkin]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentItems = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const RenderStars = ({ rating, reviewCount }: { rating: number; reviewCount?: number }) => (
    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-100 dark:border-amber-800/50 w-fit">
      <span className="text-amber-500 text-[10px]">★</span>
      <span className="text-[10px] font-black text-amber-700 dark:text-amber-300">{rating > 0 ? rating.toFixed(1) : "0.0"}</span>
      {reviewCount !== undefined && reviewCount > 0 && (
        <span className="text-[9px] font-bold text-amber-500/70 dark:text-amber-400/60">({reviewCount})</span>
      )}
    </div>
  );

  // Badge kemiripan berwarna dinamis
  const SimilarityBadge = ({ similarity }: { similarity: number }) => {
    if (similarity === 100) {
      return (
        <span className="text-[9px] font-black px-2.5 py-1 rounded border shadow-md bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white border-emerald-400 animate-pulse shadow-emerald-500/25">
          ✨ Formulasi Identik (100%)
        </span>
      );
    }

    let colorClass = "text-slate-600 bg-slate-100 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
    if (similarity >= 70) colorClass = "text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800/50";
    else if (similarity >= 50) colorClass = "text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50";
    
    return (
      <span className={`text-[9px] font-black px-2 py-1 rounded border shadow-sm ${colorClass}`}>
        {similarity}% Mirip
      </span>
    );
  };

  // Tag pills
  const TagPills = ({ tags }: { tags: string }) => {
    const tagList = tags.split(",").map(t => t.trim()).filter(Boolean);
    if (tagList.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {tagList.slice(0, 2).map((tag, i) => (
          <span key={i} className="text-[8px] font-bold text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 px-1.5 py-0.5 rounded capitalize">
            {tag}
          </span>
        ))}
      </div>
    );
  };

  if (localProducts.length === 0) return null;

  return (
    <div className="relative">
      {/* === MODAL DETAIL === */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal 
            product={selectedProduct} 
            userIngredients={userIngredients}
            onClose={() => setSelectedProduct(null)}
            onAnalyzeThis={onAnalyzeThis}
            onReviewAdded={handleReviewAdded}
            showSimilarity={activeTab === "LAB"}
          />
        )}
      </AnimatePresence>

      {/* === UNIFIED SECTION === */}
      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white dark:bg-slate-900 p-4 sm:p-6 md:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-sm border border-slate-200 dark:border-slate-800"
      >
        {/* Header */}
        <div className="mb-6 sm:mb-8 border-b border-slate-100 dark:border-slate-800 pb-4 sm:pb-5">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>🔬</span> Rekomendasi & Alternatif Produk
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
            {filteredProducts.length} produk ditemukan · {FILTER_TABS.find(t => t.key === activeTab)?.desc}
          </p>
        </div>

        {/* Filter Tabs - horizontally scrollable on mobile */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {FILTER_TABS.map(tab => {
            const isActive = activeTab === tab.key;
            // Hitung count untuk setiap tab secara akurat
            let count = 0;
            if (tab.key === "VIP") {
              count = localProducts.filter(p => {
                if (!p.isPinKreator) return false;
                if (!userPrimaryFocus) return true;
                const prodFocusList = p.fokusProduk ? p.fokusProduk.split(",").map(f => f.trim().toLowerCase()).filter(Boolean) : [];
                const userFocusList = userPrimaryFocus.split(",").map(f => f.trim().toLowerCase()).filter(Boolean);
                return prodFocusList.some(pf => userFocusList.some(uf => pf.includes(uf) || uf.includes(pf)));
              }).length;
            } else if (tab.key === "LAB") {
              count = localProducts.filter(p => p.similarity >= 10).length;
            } else if (tab.key === "SKIN") {
              if (userBaseSkin) {
                count = localProducts.filter(p => !p.targetSkinTypes || p.targetSkinTypes.toLowerCase().includes(userBaseSkin)).length;
              } else {
                count = localProducts.length;
              }
            } else if (tab.key === "RATING") {
              count = localProducts.length;
            }
            
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg scale-105"
                    : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 hover:border-slate-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                  isActive 
                    ? "bg-white/20 dark:bg-slate-900/20" 
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Content: Product Grid / Empty State */}
        {currentItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3 grayscale opacity-40">📦</span>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold">
              {activeTab === "VIP" 
                ? "Belum ada rekomendasi kreator untuk kategori ini."
                : activeTab === "LAB"
                ? "Tidak ada produk dengan kemiripan bahan ≥ 10%."
                : "Tidak ada produk yang sesuai filter ini."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
            {currentItems.map((product, idx) => {
              const isVipMode = product.isPinKreator && activeTab === "VIP";
              const globalRank = (currentPage - 1) * itemsPerPage + idx;

              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.96, y: 12 }} 
                  animate={{ opacity: 1, scale: 1, y: 0 }} 
                  exit={{ opacity: 0, scale: 0.96, y: 12 }} 
                  transition={{ 
                    duration: 0.25, 
                    ease: [0.16, 1, 0.3, 1],
                    delay: idx * 0.02 
                  }}
                  onClick={() => setSelectedProduct(product)}
                  className={`flex flex-col rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative h-full ${
                    isVipMode
                      ? "bg-gradient-to-b from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900 border-2 border-amber-300 dark:border-amber-700 shadow-amber-100 dark:shadow-amber-900/20 ring-1 ring-amber-200/50 dark:ring-amber-800/30"
                      : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700"
                  }`}
                >
                  {/* VIP Badge */}
                  {isVipMode && (
                    <div className="absolute top-0 left-0 z-10 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-[9px] font-black px-3 py-1.5 rounded-br-2xl shadow-md flex items-center gap-1">
                      👑 VIP
                    </div>
                  )}

                  {/* Rank Badge (non-VIP, tab LAB/SKIN/RATING only, first 3) */}
                  {!isVipMode && activeTab !== "VIP" && globalRank < 3 && (
                    <div className={`absolute top-0 left-0 z-10 text-white text-[10px] font-black px-3 py-1.5 rounded-br-2xl shadow-md ${
                      globalRank === 0 ? "bg-gradient-to-br from-amber-300 to-amber-500" :
                      globalRank === 1 ? "bg-gradient-to-br from-slate-300 to-slate-400" :
                      "bg-gradient-to-br from-orange-400 to-orange-500"
                    }`}>
                      {globalRank === 0 ? "🥇" : globalRank === 1 ? "🥈" : "🥉"} #{globalRank + 1}
                    </div>
                  )}

                  {/* Image */}
                  <div className={`w-full aspect-square relative flex items-center justify-center p-2 sm:p-4 border-b ${
                    isVipMode ? "bg-amber-50/30 dark:bg-amber-950/10 border-amber-100 dark:border-amber-800/30" : "bg-slate-50 dark:bg-slate-850 border-slate-100 dark:border-slate-800"
                  }`}>
                    <img 
                      src={product.gambarUrl?.split(",")[0] || ""} 
                      alt={product.namaProduk} 
                      className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>

                  {/* Info */}
                  <div className="p-3 sm:p-4 flex flex-col flex-1 gap-1.5 sm:gap-2">
                    {activeTab === "LAB" && (
                      <div className="flex items-start gap-1.5 flex-wrap">
                        <SimilarityBadge similarity={product.similarity} />
                      </div>
                    )}
                    
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs line-clamp-2 leading-snug">
                      {product.namaProduk}
                    </h3>

                    {/* VIP Catatan Kreator */}
                    {isVipMode && product.catatanKreator && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/30 p-2 rounded-lg mt-auto">
                        <p className="text-[9px] text-amber-900 dark:text-amber-200 italic line-clamp-2 leading-relaxed">
                          &quot;{product.catatanKreator}&quot;
                        </p>
                      </div>
                    )}
                    
                    {/* Tag Khusus */}
                    {product.tagKhusus && <TagPills tags={product.tagKhusus} />}

                    {/* Fokus Produk (hanya jika bukan VIP, agar tidak terlalu penuh) */}
                    {!isVipMode && !product.tagKhusus && (
                      <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase line-clamp-1 tracking-wider mt-auto">
                        {product.fokusProduk}
                      </p>
                    )}
                    
                    {/* Footer */}
                    <div className={`pt-3 mt-auto border-t flex items-center justify-between ${
                      isVipMode ? "border-amber-100/50 dark:border-amber-800/30" : "border-slate-100 dark:border-slate-800"
                    }`}>
                      <RenderStars rating={product.rating} reviewCount={product.reviews?.length} />
                      <span className={`text-[10px] font-bold group-hover:underline ${
                        isVipMode ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400"
                      }`}>
                        Detail ›
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button 
              disabled={currentPage === 1} 
              onClick={() => setCurrentPage(p => p - 1)} 
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 text-sm font-black hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
            >←</button>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
              {[...Array(totalPages)].map((_, i) => (
                <button 
                  key={i} 
                  onClick={() => setCurrentPage(i + 1)} 
                  className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                    currentPage === i + 1 
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md" 
                      : "text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 hover:shadow-sm"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button 
              disabled={currentPage === totalPages} 
              onClick={() => setCurrentPage(p => p + 1)} 
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 text-sm font-black hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
            >→</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}