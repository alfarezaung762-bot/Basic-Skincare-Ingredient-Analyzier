// src/app/admin/products/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

// Mendefinisikan kerangka data produk sesuai skema basis data mutakhir (tanpa rating statis)
interface Product {
  id: string;
  namaProduk: string;
  tipeProduk: string;
  gambarUrl: string;
  tautanAfiliasi: string;
  fokusProduk: string;
  isPinKreator: boolean;
  masalahKulitPin: string | null;
}

export default function AdminProductsDashboard() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Memeriksa otentikasi admin dan menarik data produk
  useEffect(() => {
    const isAuth = sessionStorage.getItem("isAdminAuth");
    if (!isAuth) {
      router.push("/admin/login");
      return;
    }
    fetchProducts();
  }, [router]);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Gagal mengambil data produk:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    router.push("/admin/login");
  };

  // Fungsi untuk menghapus produk
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Peringatan: Yakin ingin menghapus produk "${name}" dari katalog afiliasi?`)) return;

    try {
      const res = await fetch(`/api/admin/products?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setProducts((prev) => prev.filter((product) => product.id !== id));
      } else {
        alert("Gagal menghapus produk.");
      }
    } catch (error) {
      alert("Terjadi kesalahan pada sistem.");
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
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

        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-wrap gap-3">
          <Link href="/admin/dashboard" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            📚 Kamus Bahan Utama
          </Link>
          
          <Link href="/admin/reportbahan" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            <span>❓ Pusat Tinjauan</span>
          </Link>

          <div className="px-6 py-3 font-bold text-sm rounded-xl flex items-center gap-2 bg-slate-900 text-white shadow-lg cursor-default">
            <span>🛒 Katalog Produk</span>
            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              {products.length}
            </span>
          </div>
        </motion.div>
      <Link href="/admin/products/review" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
  <span>⭐ Moderasi Ulasan</span>
</Link>
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="bg-white/90 backdrop-blur-sm min-h-[500px] p-6 md:p-8 rounded-3xl shadow-sm border border-white"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Daftar Produk Rekomendasi</h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                Kelola produk afiliasi yang akan ditampilkan kepada pengguna.
              </p>
            </div>
            
            <Link 
              href="/admin/products/create" 
              className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2"
            >
              <span>➕</span> Tambah Produk Baru
            </Link>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium animate-pulse">Menarik data katalog produk...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <span className="text-4xl block mb-4 opacity-50">🛍️</span>
              <p className="text-slate-700 font-bold text-lg mb-1">Katalog Masih Kosong</p>
              <p className="text-slate-500 text-sm font-medium mb-6">Belum ada produk afiliasi yang kamu daftarkan ke sistem.</p>
              <Link href="/admin/products/create" className="text-blue-600 font-bold text-sm hover:underline">
                Mulai masukkan produk pertamamu sekarang →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4 whitespace-nowrap">Detail Produk</th>
                    <th className="p-4 whitespace-nowrap">Tipe Produk</th>
                    <th className="p-4 whitespace-nowrap">Tautan Afiliasi</th>
                    <th className="p-4 text-right whitespace-nowrap">Tindakan</th>
                  </tr>
                </thead>
                <motion.tbody variants={containerVariants} initial="hidden" animate="visible" className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <motion.tr variants={itemVariants} key={product.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 overflow-hidden flex shrink-0 items-center justify-center p-1">
                            {product.gambarUrl ? (
                              <img src={product.gambarUrl} alt={product.namaProduk} className="max-w-full max-h-full object-contain" />
                            ) : (
                              <span className="text-xl">📦</span>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 flex items-center gap-2">
                              {product.namaProduk}
                              {product.isPinKreator && (
                                <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider" title={`Pin Kreator: ${product.masalahKulitPin}`}>
                                  📌 Tersemat
                                </span>
                              )}
                            </p>
                            <p className="text-xs font-medium text-slate-500 mt-0.5 max-w-[200px] truncate" title={product.fokusProduk}>
                              {product.fokusProduk}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-block bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-bold text-[10px] uppercase tracking-widest border border-slate-200">
                          {product.tipeProduk}
                        </span>
                      </td>
                      <td className="p-4">
                        <a 
                          href={product.tautanAfiliasi} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 font-bold text-xs underline underline-offset-2 flex items-center gap-1"
                        >
                          Buka Tautan ↗
                        </a>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <Link 
                            href={`/admin/products/edit/${product.id}`}
                            className="bg-white text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-slate-50 border border-slate-200 shadow-sm transition-colors"
                          >
                            ✍️ Edit
                          </Link>
                          <button 
                            onClick={() => handleDelete(product.id, product.namaProduk)} 
                            className="bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-100 hover:text-rose-700 border border-rose-200 shadow-sm transition-colors"
                          >
                            🗑️ Hapus
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </motion.tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}