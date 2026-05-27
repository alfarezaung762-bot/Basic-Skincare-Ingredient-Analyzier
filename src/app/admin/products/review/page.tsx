// src/app/admin/products/review/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AccessDeniedModal } from "@/components/admin/AccessDeniedModal";
import AdminHeader from "@/components/admin/AdminHeader";

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
    gambarUrl: string; 
  };
}

export default function AdminReviewsDashboard() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // STATE KEAMANAN & HAK AKSES
  const [isViewer, setIsViewer] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false); // <-- GEMBOK LAYAR (Solusi Celah Keamanan)
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  // STATE MODAL
  const [activeProduct, setActiveProduct] = useState<string | null>(null);

  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    
    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    try {
      const profile = JSON.parse(profileString);
      setAdminName(profile.username || "Admin");
      setAdminRole(profile.role || "STAFF");
      const superAdminCheck = profile.role === "SUPERADMIN";
      const isViewOnly = profile.role === "VIEWER";
      const hasPermission = profile.permissions && profile.permissions.includes("MANAGE_ULASAN");

      if (!superAdminCheck && !isViewOnly && !hasPermission) {
        setAccessDeniedMessage("Anda tidak berwenang memoderasi ulasan.");
        return; // Hentikan proses
      }

      // JIKA LOLOS PENGECEKAN: Buka gembok layar dan tarik data
      setIsSuperAdmin(superAdminCheck);
      setIsViewer(isViewOnly);
      setIsAuthorized(true); 
      fetchReviews();

    } catch (error) {
      sessionStorage.clear();
      router.push("/admin/login");
    }
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
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  const handleDelete = async (id: string, userName: string) => {
    if (isViewer) return; 

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

  const groupedReviews = reviews.reduce((acc, review) => {
    const prodName = review.product.namaProduk;
    if (!acc[prodName]) acc[prodName] = [];
    acc[prodName].push(review);
    return acc;
  }, {} as Record<string, Review[]>);

  const activeReviews = activeProduct ? groupedReviews[activeProduct] || [] : [];

  useEffect(() => {
    if (activeProduct && activeReviews.length === 0) {
      setActiveProduct(null);
    }
  }, [activeReviews.length, activeProduct]);


  // ========================================================
  // LAYAR KOSONG: Tampil sebelum izin dipastikan (Mencegah UI Flash)
  // ========================================================
  if (accessDeniedMessage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <AccessDeniedModal isOpen={true} message={accessDeniedMessage} onClose={() => router.push("/admin/dashboard")} />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // ========================================================
  // RENDER UTAMA JIKA IZIN DITERIMA
  // ========================================================
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 lg:p-12 relative overflow-hidden">

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER */}
        <AdminHeader 
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          title="Admin Control Panel"
          subtitle="Etalase Manajemen Produk Afiliasi & Rekomendasi Pintar."
        />

        {/* TAB NAVIGASI JALAN PINTAS */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex flex-nowrap overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap md:pb-0 custom-scrollbar">
          <Link href="/admin/dashboard" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            <span>📚 Kamus Bahan Utama</span>
          </Link>
          <Link href="/admin/reportbahan" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            <span>❓ Pusat Tinjauan</span>
          </Link>
          <Link href="/admin/products" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            <span>🛒 Katalog Produk</span>
          </Link>
          
          {/* TAB AKTIF */}
          <div className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg flex items-center gap-2 bg-slate-900 text-white shadow-md cursor-default">
            <span>⭐ Moderasi Ulasan</span>
            <span className="bg-slate-700 text-white text-[10px] px-2 py-0.5 rounded-md">
              {reviews.length}
            </span>
          </div>

          {/* PERENDERAN BERSYARAT: Tombol Manajemen Banner (Hanya Admin dengan Izin / Superadmin) */}
          {(isSuperAdmin || (adminRole === "ADMIN" && sessionStorage.getItem("adminProfile")?.includes("MANAGE_BENNER"))) && (
            <Link href="/admin/benner" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50">
              <span>🖼️ Kelola Banner</span>
            </Link>
          )}

          {/* PERENDERAN BERSYARAT: Tombol Pusat AI */}
          {(isSuperAdmin || adminRole === "ADMIN") && (
            <Link href="/admin/pusat-ai" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
              <span>🧠 Pusat AI</span>
            </Link>
          )}
        </motion.div>

        {/* AREA KONTEN UTAMA DENGAN TABEL */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="bg-white dark:bg-slate-900 min-h-[500px] p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="mb-8">
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Pusat Moderasi Ulasan</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Pantau diskusi komunitas dan hapus komentar yang mengandung kata kasar atau spam.</p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-amber-500 rounded-full animate-spin mb-4"></div>
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-24 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <span className="text-4xl block mb-4 opacity-50">📭</span>
              <p className="text-slate-700 dark:text-slate-300 font-bold text-lg mb-1">Belum Ada Ulasan</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Katalog ulasan saat ini masih bersih.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-4 whitespace-nowrap">Detail Produk</th>
                    <th className="p-4 whitespace-nowrap">Statistik Ulasan</th>
                    <th className="p-4 text-right whitespace-nowrap">Tindakan Admin</th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(groupedReviews).map(([prodName, prodReviews]) => {
                    const avgRating = (prodReviews.reduce((acc, r) => acc + r.rating, 0) / prodReviews.length).toFixed(1);
                    const imageUrl = prodReviews[0]?.product?.gambarUrl; 

                    return (
                      <motion.tr variants={itemVariants} key={prodName} className="hover:bg-blue-50/30 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex shrink-0 items-center justify-center p-1">
                              {imageUrl ? (
                                <img src={imageUrl} alt={prodName} className="max-w-full max-h-full object-contain" />
                              ) : (
                                <span className="text-xl">📦</span>
                              )}
                            </div>
                            <p className="font-black text-slate-800 dark:text-slate-200">{prodName}</p>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                              <span className="text-amber-500 text-[10px]">★</span>
                              <span className="font-black text-amber-800 text-xs">{avgRating}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                              {prodReviews.length} Ulasan
                            </span>
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <button 
                            onClick={() => setActiveProduct(prodName)} 
                            className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm transition-colors opacity-80 group-hover:opacity-100 inline-flex items-center gap-2"
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

      <AnimatePresence>
        {activeProduct && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setActiveProduct(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-50 dark:bg-slate-950 w-full max-w-3xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <button onClick={() => setActiveProduct(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:text-rose-600 rounded-full font-black transition-all">✕</button>
                <div className="text-center flex-1 px-4">
                  <h2 className="font-black text-slate-900 dark:text-slate-100 text-sm sm:text-base leading-tight truncate">{activeProduct}</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total {activeReviews.length} Ulasan Komunitas</p>
                </div>
                <div className="w-10"></div>
              </div>

              <div className="overflow-y-auto flex-1 p-6 md:p-8 space-y-4 custom-scrollbar">
                {activeReviews.map((review, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    key={review.id} 
                    className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row justify-between gap-4 group hover:border-amber-200 dark:hover:border-amber-700 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-sm font-black text-slate-500 dark:text-slate-400">
                          {review.user.name ? review.user.name.charAt(0).toUpperCase() : "U"}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 dark:text-slate-200 text-sm">{review.user.name || "Anonim"}</p>
                          <p className="text-[10px] font-bold text-slate-400">{formatDate(review.createdAt)}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-1 bg-amber-50 px-2 py-1 rounded border border-amber-100">
                          <span className="text-amber-500 text-[10px]">★</span>
                          <span className="font-black text-amber-800 text-[10px]">{review.rating}.0</span>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed italic">
                        "{review.komentar}"
                      </p>
                    </div>

                    <div className="flex items-end justify-end shrink-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700 pt-3 sm:pt-0 mt-2 sm:mt-0">
                      {!isViewer ? (
                        <button 
                          onClick={() => handleDelete(review.id, review.user.name || "Pengguna")}
                          className="w-full sm:w-auto bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-500 hover:text-white border border-rose-200 dark:border-rose-700 shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                          <span>🗑️</span> Hapus
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 italic bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700">Hanya Pantau</span>
                      )}
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