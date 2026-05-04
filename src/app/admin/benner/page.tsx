"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Banner {
  id: string;
  imageUrl: string;
  altText: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminBannerPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    try {
      const profile = JSON.parse(profileString);
      const isSuperAdmin = profile.role === "SUPERADMIN";
      const hasPermission = profile.permissions && profile.permissions.includes("MANAGE_BENNER");

      if (!isSuperAdmin && !hasPermission) {
        alert("Akses Ditolak: Anda tidak memiliki izin mengelola Banner.");
        router.push("/admin/dashboard");
        return;
      }

      fetchBanners();
    } catch (error) {
      sessionStorage.clear();
      router.push("/admin/login");
    }
  }, [router]);

  const fetchBanners = async () => {
    try {
      const res = await fetch(`/api/admin/benner?t=${new Date().getTime()}`);
      if (res.ok) {
        const data = await res.json();
        setBanners(data);
      }
    } catch (error) {
      console.error("Gagal mengambil data banner", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(`Yakin ingin menghapus banner ini secara permanen?`)) return;

    try {
      const res = await fetch(`/api/admin/benner/${id}`, { method: "DELETE" });
      if (res.ok) {
        // Log action
        const profileStr = sessionStorage.getItem("adminProfile");
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          await fetch("/api/admin/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              adminName: profile.username || "Unknown",
              adminEmail: profile.username || "Unknown",
              adminRole: profile.role,
              action: "DELETE",
              entity: "BANNER",
              details: `Menghapus banner: ${id}`,
            }),
          });
        }

        setBanners((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Gagal menghapus banner.");
      }
    } catch (error) {
      alert("Terjadi kesalahan sistem.");
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/benner/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }), // Kirim data minimal untuk toggle
      });

      if (res.ok) {
        setBanners(prev => prev.map(b => b.id === id ? { ...b, isActive: !currentStatus } : b));
      } else {
        alert("Gagal mengubah status banner.");
      }
    } catch (error) {
      alert("Terjadi kesalahan.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>🖼️</span> Manajemen Banner
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Kelola gambar banner dinamis yang muncul di halaman beranda.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/dashboard" className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-sm rounded-xl transition-all shadow-sm">
              Kembali ke Dasbor
            </Link>
            <button onClick={handleLogout} className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-sm rounded-xl transition-all shadow-sm">
              Logout
            </button>
          </div>
        </motion.div>

        {/* KONTEN */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <h2 className="text-xl font-black text-slate-900">Daftar Banner Beranda</h2>
            <Link href="/admin/benner/create" className="px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 w-fit">
              <span>➕</span> Tambah Banner Baru
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20 opacity-50">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-24 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <span className="text-4xl block mb-3 opacity-50">🖼️</span>
              <p className="text-slate-500 font-medium">Belum ada banner. Ayo tambahkan banner pertamamu!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {banners.map((banner) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }} 
                    key={banner.id} 
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group relative"
                  >
                    <div className="h-48 w-full bg-slate-100 relative">
                      <img src={banner.imageUrl} alt={banner.altText || "Banner"} className="w-full h-full object-cover" />
                      
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button 
                          onClick={() => handleToggleActive(banner.id, banner.isActive)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm backdrop-blur-md transition-all ${banner.isActive ? 'bg-emerald-500/90 text-white hover:bg-emerald-600' : 'bg-slate-500/90 text-white hover:bg-slate-600'}`}
                        >
                          {banner.isActive ? '✅ Aktif' : '❌ Nonaktif'}
                        </button>
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                      <div>
                        <p className="text-sm text-slate-500 truncate">{banner.altText || "Tanpa alt text"}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Ditambahkan: {new Date(banner.createdAt).toLocaleDateString("id-ID")}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Link href={`/admin/benner/edit/${banner.id}`} className="flex-1 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-bold text-xs rounded-xl transition-all text-center border border-blue-100 hover:border-transparent shadow-sm">
                          Edit
                        </Link>
                        <button onClick={() => handleDelete(banner.id)} className="flex-1 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-bold text-xs rounded-xl transition-all border border-red-100 hover:border-transparent shadow-sm">
                          Hapus
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
