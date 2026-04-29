// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

interface Ingredient {
  id: string;
  name: string;
  aliases: string | null;
  type: string;
  functionalCategory: string;
  isKeyActive: boolean;
  benefits: string;
  isVerified: boolean;
  aiContext: string | null; 
  createdAt: string; 
}

export default function AdminDashboard() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  // STATE BARU: Menyimpan status hak akses untuk UI
  const [isViewer, setIsViewer] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false); // <-- Tambahan untuk tombol Manajemen Akun
  
  // STATE FILTER & SORT 
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVerified, setFilterVerified] = useState("ALL"); 
  const [filterCategory, setFilterCategory] = useState("ALL"); 
  const [sortBy, setSortBy] = useState("NEWEST"); 

  useEffect(() => {
    const savedSearch = sessionStorage.getItem("admin_search");
    const savedVerified = sessionStorage.getItem("admin_verified");
    const savedCategory = sessionStorage.getItem("admin_category");
    const savedSort = sessionStorage.getItem("admin_sort");

    if (savedSearch) setSearchQuery(savedSearch);
    if (savedVerified) setFilterVerified(savedVerified);
    if (savedCategory) setFilterCategory(savedCategory);
    if (savedSort) setSortBy(savedSort);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("admin_search", searchQuery);
    sessionStorage.setItem("admin_verified", filterVerified);
    sessionStorage.setItem("admin_category", filterCategory);
    sessionStorage.setItem("admin_sort", sortBy);
  }, [searchQuery, filterVerified, filterCategory, sortBy]);

  // PENGAMANAN HALAMAN (ROUTE GUARD) & TARIK DATA
  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    
    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    try {
      const profile = JSON.parse(profileString);
      const superAdminCheck = profile.role === "SUPERADMIN";
      const isViewOnly = profile.role === "VIEWER";
      const hasPermission = profile.permissions && profile.permissions.includes("MANAGE_KAMUS");

      if (!superAdminCheck && !isViewOnly && !hasPermission) {
        alert("Akses Ditolak: Anda tidak memiliki wewenang untuk mengelola Kamus Bahan.");
        router.push("/admin/login");
        return;
      }

      setIsViewer(isViewOnly);
      setIsSuperAdmin(superAdminCheck); // <-- Simpan status Superadmin ke state
      
      fetchIngredients();

    } catch (error) {
      sessionStorage.clear();
      router.push("/admin/login");
    }
  }, [router]);

  const fetchIngredients = async () => {
    try {
      const res = await fetch(`/api/ingredients?t=${new Date().getTime()}`);
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
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  const handleDelete = async (id: string, name: string) => {
    if (isViewer) return; 
    
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

  const handleRowClick = (id: string) => {
    router.push(`/admin/dashboard/edit/${id}`);
  };

  const formatCategory = (cat: string) => {
    if (!cat) return "-";
    return cat.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ');
  };

  const processedIngredients = ingredients
    .filter((item) => {
      const search = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(search);
      const matchAlias = item.aliases ? item.aliases.toLowerCase().includes(search) : false;
      if (!matchName && !matchAlias) return false;

      if (filterVerified === "VERIFIED" && !item.isVerified) return false;
      if (filterVerified === "UNVERIFIED" && item.isVerified) return false;

      if (filterCategory !== "ALL") {
        if (filterCategory === "HERO" && !item.isKeyActive) return false;
        if (filterCategory !== "HERO") {
          if (item.isKeyActive) return false; 
          if (item.type !== filterCategory) return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      if (sortBy === "A_Z") return a.name.localeCompare(b.name);
      if (sortBy === "Z_A") return b.name.localeCompare(a.name);
      if (sortBy === "NEWEST") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "OLDEST") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return 0;
    });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden p-6 md:p-12">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-30 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
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

       {/* Menu Navigasi Utama */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-wrap gap-3">
          <div className="px-6 py-3 font-bold text-sm rounded-xl flex items-center gap-2 transition-all bg-slate-900 text-white shadow-lg cursor-default">
            <span>📚 Kamus Bahan Utama</span>
            <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full shadow-sm">
              {ingredients.length}
            </span>
          </div>
          
          <Link href="/admin/reportbahan" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            <span>❓ Pusat Tinjauan</span>
          </Link>
          
          <Link href="/admin/products" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            <span>🛒 Katalog Produk</span>
          </Link>

          <Link href="/admin/products/review" className="px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-white/80 backdrop-blur-sm text-slate-600 border border-slate-200 hover:bg-slate-100 hover:shadow-md">
            <span>⭐ Moderasi Ulasan</span>
          </Link>

          {/* PERENDERAN BERSYARAT: Tombol Manajemen Akun Khusus Superadmin */}
          {isSuperAdmin && (
            <Link href="/admin/management" className="ml-auto px-6 py-3 font-bold text-sm rounded-xl transition-all flex items-center gap-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 hover:shadow-md">
              <span>👑 Manajemen Akun</span>
            </Link>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white/80 backdrop-blur-md min-h-[500px] p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60"
        >
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Daftar Bahan Terverifikasi</h2>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <div className="relative flex-1 sm:w-72">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                <input 
                  type="text" 
                  placeholder="Cari nama atau alias..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 bg-white placeholder-slate-400 focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-inner"
                />
              </div>
              
              {!isViewer && (
                <Link 
                  href="/admin/dashboard/create"
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-95 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>✨</span> Tambah Baru
                </Link>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8 p-4 bg-slate-100/50 rounded-2xl border border-slate-200">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="filterVerified" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status Verifikasi</label>
              <select id="filterVerified" aria-label="Status Verifikasi" value={filterVerified} onChange={(e) => setFilterVerified(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
                <option value="ALL">Semua Status</option>
                <option value="VERIFIED">✅ Sudah Ditinjau</option>
                <option value="UNVERIFIED">⏳ Belum Ditinjau</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="filterCategory" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kategori Logika</label>
              <select id="filterCategory" aria-label="Kategori Logika" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
                <option value="ALL">Semua Kategori</option>
                <option value="HERO">⭐ Bintang Utama</option>
                <option value="BASIC">Standar (Basic)</option>
                <option value="HARSH">Keras (Harsh)</option>
                <option value="BUFFER">Penenang (Buffer)</option>
                <option value="TOXIC">Berbahaya (Toxic)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="sortBy" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Urutkan Berdasarkan</label>
              <select id="sortBy" aria-label="Urutkan Berdasarkan" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-700 bg-white outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm">
                <option value="NEWEST">⏳ Tanggal: Terbaru ke Terlama</option>
                <option value="OLDEST">🕰️ Tanggal: Terlama ke Terbaru</option>
                <option value="A_Z">🔤 Abjad: A - Z</option>
                <option value="Z_A">🔠 Abjad: Z - A</option>
              </select>
            </div>
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
          ) : processedIngredients.length === 0 ? (
            <div className="text-center py-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <span className="text-4xl block mb-3 opacity-50">🔍</span>
              <p className="text-slate-500 font-medium">Tidak ada bahan yang cocok dengan filter ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-4 whitespace-nowrap w-24">Status</th>
                    <th className="p-4 whitespace-nowrap">Nama Bahan (INCI)</th>
                    <th className="p-4 whitespace-nowrap">Alias</th>
                    <th className="p-4 whitespace-nowrap">Kategori Logika</th>
                    <th className="p-4 whitespace-nowrap">Fungsi Utama</th>
                    <th className="p-4">Manfaat Khusus</th>
                    <th className="p-4 whitespace-nowrap text-right">Aksi</th>
                  </tr>
                </thead>
                <motion.tbody 
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="divide-y divide-slate-100 bg-white"
                >
                  {processedIngredients.map((item) => (
                    <motion.tr 
                      variants={itemVariants} 
                      key={item.id} 
                      onClick={() => handleRowClick(item.id)} 
                      className={`cursor-pointer transition-colors group ${item.isVerified ? 'bg-emerald-50/60 hover:bg-emerald-100/60' : 'hover:bg-blue-50/50'}`}
                    >
                      <td className="p-4">
                        {item.isVerified ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                            Ditinjau
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase bg-slate-100 text-slate-500 border border-slate-200 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                            Tertunda
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-bold text-slate-900 group-hover:text-blue-700 transition-colors capitalize">
                        <div className="flex items-center gap-2">
                          {item.name}
                          {item.aiContext && (
                            <span title="Telah dilengkapi Konteks AI" className="text-sm drop-shadow-sm">🤖</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-4 text-xs font-medium text-slate-500">
                        {item.aliases ? (
                          <div className="flex flex-wrap gap-1">
                            {item.aliases.split(',').map((alias, i) => (
                              <span key={i} className={`px-2 py-0.5 rounded border ${item.isVerified ? 'bg-white border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>{alias.trim()}</span>
                            ))}
                          </div>
                        ) : (
                          <span className="opacity-50">-</span>
                        )}
                      </td>

                      <td className="p-4">
                        {item.isKeyActive ? (
                          <span className="text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                            ⭐ BINTANG UTAMA
                          </span>
                        ) : (
                          <span className={`text-[10px] font-black tracking-wider px-2.5 py-1 rounded-full border ${
                            item.type === 'TOXIC' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                            item.type === 'HARSH' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                            item.type === 'BUFFER' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {item.type}
                          </span>
                        )}
                      </td>

                      <td className="p-4 font-bold text-xs text-slate-600 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-md border ${item.isVerified ? 'bg-white border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                          {formatCategory(item.functionalCategory)}
                        </span>
                      </td>
                      
                      <td className="p-4 text-slate-600 truncate max-w-[150px]">{item.benefits}</td>
                      
                      <td className="p-4 text-right whitespace-nowrap">
                        {!isViewer ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation(); 
                              handleDelete(item.id, item.name);
                            }} 
                            className="text-red-500 font-bold hover:text-red-700 transition-colors bg-red-50/50 hover:bg-red-100 px-3 py-1.5 rounded-lg active:scale-95 opacity-50 group-hover:opacity-100 border border-transparent hover:border-red-200"
                          >
                            Hapus
                          </button>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 italic">Hanya Pantau</span>
                        )}
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