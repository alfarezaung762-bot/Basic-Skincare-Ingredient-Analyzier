// src/app/admin/products/review/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// Mendefinisikan kerangka data ulasan
interface Review {
  id: string;
  rating: number;
  komentar: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  };
  product: {
    namaProduk: string;
    gambarUrl: string; // <-- Wajib ada agar foto produk bisa ditarik
  };
}

export default function AdminReviewsDashboard() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // STATE: Menyimpan nama produk yang sedang dibuka modalnya (Views)
  const [activeProduct, setActiveProduct] = useState<string | null>(null);

  useEffect(() => {
    const isAuth = sessionStorage.getItem("isAdminAuth");
    if (!isAuth) {
      router.push("/admin/login");
      return;
    }
    fetchReviews();
  }, [router]);

  const fetchReviews = async () => {
    try {
      const res = await fetch("/api/admin/reviews");
      if (res.ok) {
        const data = await res.json();
        setReviews(data);
      }
    } catch (error) {
      console.error("Gagal mengambil data ulasan:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    router.push("/admin/login");
  };

  const handleDelete = async (id: string, userName: string) => {
    if (!window.confirm(`Peringatan: Yakin ingin menghapus ulasan dari "${userName}" secara permanen? Tindakan ini tidak bisa dibatalkan.`)) return;

    try {
      const res = await fetch(`/api/admin/reviews?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setReviews((prev) => prev.filter((review) => review.id !== id));
      } else {
        alert("Gagal menghapus ulasan.");
      }
    } catch (error) {
      alert("Terjadi kesalahan pada sistem server.");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  // Mengelompokkan ulasan berdasarkan nama produk
  const groupedReviews = reviews.reduce((acc, review) => {
    const prodName = review.product.namaProduk;
    if (!acc[prodName]) acc[prodName] = [];
    acc[prodName].push(review);
    return acc;
  }, {} as Record<string, Review[]>);

  // Data ulasan khusus untuk produk yang sedang dibuka di Modal
  const activeReviews = activeProduct ? groupedReviews[activeProduct] || [] : [];

  // Jika semua ulasan di produk tersebut dihapus, tutup otomatis modalnya
  useEffect(() => {
    if (activeProduct && activeReviews.length === 0) {
      setActiveProduct(null);
    }
  }, [activeReviews.length, activeProduct]);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-white">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>🎛️</span> Admin Control Panel
            </h1>
            <p className="text-sm text-slate-500 font-medium">Etalase Manajemen Produk Afiliasi & Rekomendasi Pintar.</p>
          </div>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95">
            Logout
          </button>
        </div>

        {/* TAB NAVIGASI JALAN PINTAS */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-wrap gap-3">
          <Link href="/admin/dashboard" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            📚 Kamus Bahan Utama
          </Link>
          <Link href="/admin/reportbahan" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            <span>❓ Pusat Tinjauan</span>
          </Link>
          <Link href="/admin/products" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            <span>🛒 Katalog Produk</span>
          </Link>
          <div className="px-6 py-3 font-bold text-sm rounded-xl flex items-center gap-2 bg-slate-900 text-white shadow-lg cursor-default">
            <span>⭐ Moderasi Ulasan</span>
            <span className="bg-amber-500 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
              {reviews.length}
            </span>
          </div>
        </motion.div>

        {/* AREA KONTEN UTAMA DENGAN TABEL */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/90 backdrop-blur-sm min-h-[500px] p-6 md:p-8 rounded-3xl shadow-sm border border-white">
          <div className="mb-8">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Pusat Moderasi Ulasan</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Pantau diskusi komunitas dan hapus komentar yang mengandung kata kasar atau spam.</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <span className="text-4xl block mb-4 opacity-50">📭</span>
              <p className="text-slate-700 font-bold text-lg mb-1">Belum Ada Ulasan</p>
              <p className="text-sm text-slate-500 font-medium">Katalog ulasan saat ini masih bersih.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4 whitespace-nowrap">Detail Produk</th>
                    <th className="p-4 whitespace-nowrap">Statistik Ulasan</th>
                    <th className="p-4 text-right whitespace-nowrap">Tindakan Admin</th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100">
                  {Object.entries(groupedReviews).map(([prodName, prodReviews]) => {
                    const avgRating = (prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length).toFixed(1);
                    const imageUrl = prodReviews[0]?.product?.gambarUrl; // Menarik foto produk

                    return (
                      <motion.tr variants={itemVariants} key={prodName} className="hover:bg-blue-50/30 transition-colors group">
                        {/* Kolom 1: Foto dan Nama Produk */}
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex shrink-0 items-center justify-center p-1">
                              {imageUrl ? (
                                <img src={imageUrl} alt={prodName} className="max-w-full max-h-full object-contain" />
                              ) : (
                                <span className="text-xl">📦</span>
                              )}
                            </div>
                            <p className="font-black text-slate-800">{prodName}</p>
                          </div>
                        </td>

                        {/* Kolom 2: Rating dan Jumlah */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                              <span className="text-amber-500 text-[10px]">★</span>
                              <span className="font-black text-amber-800 text-xs">{avgRating}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                              {prodReviews.length} Ulasan
                            </span>
                          </div>
                        </td>

                        {/* Kolom 3: Tombol Buka Modal */}
                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setActiveProduct(prodName)} 
                            className="bg-white text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 border border-slate-200 shadow-sm transition-colors opacity-80 group-hover:opacity-100 inline-flex items-center gap-2"
                          >
                            <span>💬</span> Lihat & Moderasi
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </motion.tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>

      {/* MODAL / VIEW KHUSUS MODERASI ULASAN */}
      <AnimatePresence>
        {activeProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setActiveProduct(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-50 w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <button onClick={() => setActiveProduct(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-full font-black transition-all">✕</button>
                <div className="text-center flex-1 px-4">
                  <h2 className="font-black text-slate-900 text-sm sm:text-base leading-tight truncate">{activeProduct}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total {activeReviews.length} Ulasan Komunitas</p>
                </div>
                <div className="w-10"></div> {/* Spacer */}
              </div>

              {/* Modal Body (Daftar Ulasan) */}
              <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-4 custom-scrollbar">
                {activeReviews.map((review, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    key={review.id} 
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between gap-4 group hover:border-amber-200 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm font-black text-slate-500">
                          {review.user.name ? review.user.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{review.user.name || "Anonim"}</p>
                          <p className="text-[10px] font-bold text-slate-400">{formatDate(review.createdAt)}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                          <span className="text-amber-500 text-[10px]">★</span>
                          <span className="font-black text-amber-800 text-[10px]">{review.rating}.0</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed italic">
                        "{review.komentar}"
                      </p>
                    </div>

                    <div className="flex items-end justify-end shrink-0 border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 mt-2 sm:mt-0">
                      <button 
                        onClick={() => handleDelete(review.id, review.user.name || "Pengguna")}
                        className="w-full sm:w-auto bg-white text-rose-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white border border-rose-200 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                      >
                        <span>🗑️</span> Hapus
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}