// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

interface Ingredient {
  id: string;
  name: string;
  type: string;
  benefits: string;
  comedogenicRating: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const isAuth = sessionStorage.getItem("isAdminAuth");
    if (!isAuth) {
      router.push("/admin/login");
    } else {
      fetchIngredients();
    }
  }, [router]);

  const fetchIngredients = async () => {
    try {
      const res = await fetch("/api/ingredients");
      if (res.ok) {
        const data = await res.json();
        setIngredients(data);
      }
    } catch (error) {
      console.error("Gagal mengambil data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    router.push("/admin/login");
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Yakin ingin menghapus "${name}"?`)) return;

    try {
      const res = await fetch(`/api/ingredients/${id}`, { method: "DELETE" });
      if (res.ok) {
        setIngredients((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Gagal menghapus bahan.");
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem.");
    }
  };

  // Fungsi navigasi klik baris (Edit)
  const handleRowClick = (id: string) => {
    router.push(`/admin/dashboard/edit/${id}`);
  };

  // Varian Animasi untuk Tabel
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden p-6 md:p-12">
      
      {/* Dekorasi Background Abstrak (Halus & Elegan) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header Admin */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/50"
        >
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>🎛️</span> Admin Control Panel
            </h1>
            <p className="text-sm text-slate-500 font-medium">Kelola database bahan untuk logika Analyzer AI.</p>
          </div>
          <button onClick={handleLogout} className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-sm rounded-xl transition-all border border-red-100 hover:border-red-500 shadow-sm active:scale-95">
            Logout
          </button>
        </motion.div>

        {/* Menu Navigasi */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="flex gap-3"
        >
          <Link href="/admin/dashboard" className="px-6 py-3 font-bold text-sm rounded-xl transition-all bg-slate-900 text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5">
            📚 Kamus Bahan Utama
          </Link>
          <Link href="/admin/reportbahan" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            <span>❓ Review Bahan Baru</span>
            <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">Baru</span>
          </Link>
        </motion.div>

        {/* Konten Utama */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-md min-h-[500px] p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60"
        >
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <h2 className="text-xl font-bold text-slate-900">Daftar Bahan Terverifikasi</h2>
            
            <Link 
              href="/admin/dashboard/create"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 w-fit"
            >
              <span>✨</span> Tambah Bahan Baru
            </Link>
          </div>

          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-50">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 font-medium animate-pulse">Memuat data dari server...</p>
            </div>
          ) : ingredients.length === 0 ? (
            <div className="text-center py-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <span className="text-4xl block mb-3 opacity-50">📂</span>
              <p className="text-slate-500 font-medium">Tabel kosong. Belum ada bahan yang ditambahkan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4 whitespace-nowrap">Nama Bahan</th>
                    <th className="p-4 whitespace-nowrap">Tipe Logika</th>
                    <th className="p-4 whitespace-nowrap text-center">Komedogenik</th>
                    <th className="p-4">Manfaat Utama</th>
                    <th className="p-4 whitespace-nowrap text-right">Aksi</th>
                  </tr>
                </thead>
                <motion.tbody 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-slate-100 bg-white"
                >
                  {ingredients.map((item) => (
                    <motion.tr 
                      variants={itemVariants} 
                      key={item.id} 
                      onClick={() => handleRowClick(item.id)} // FUNGSI KLIK BARIS
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="p-4 font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{item.name}</td>
                      <td className="p-4">
                        <span className={`text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full ${
                          item.type === 'HERO' ? 'bg-amber-100 text-amber-700' :
                          item.type === 'TOXIC' ? 'bg-red-100 text-red-700' :
                          item.type === 'HARSH' ? 'bg-orange-100 text-orange-700' :
                          item.type === 'BUFFER' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="p-4 text-center font-bold">
                        <span className={`px-2 py-1 rounded bg-slate-50 border ${item.comedogenicRating >= 3 ? 'text-red-600 border-red-100' : 'text-slate-600 border-slate-200'}`}>
                          {item.comedogenicRating}/5
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 truncate max-w-xs">{item.benefits}</td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // MENCEGAH KLIK BARIS SAAT TOMBOL HAPUS DITEKAN
                            handleDelete(item.id, item.name);
                          }} 
                          className="text-red-500 font-bold hover:text-red-700 transition-colors bg-red-50/50 px-3 py-1.5 rounded-lg active:scale-95 opacity-50 group-hover:opacity-100"
                        >
                          Hapus
                        </button>
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