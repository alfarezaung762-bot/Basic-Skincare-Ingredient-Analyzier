// src/app/admin/management/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface AdminUser {
  id: string;
  username: string;
  role: "SUPERADMIN" | "ADMIN" | "VIEWER";
  permissions: string[];
  createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
  { id: "MANAGE_KAMUS", label: "📚 Kelola Kamus Bahan", desc: "Akses tambah & edit database bahan" },
  { id: "MANAGE_TINJAUAN", label: "❓ Pusat Tinjauan", desc: "Akses kelola laporan & keluhan pengguna" },
  { id: "MANAGE_KATALOG", label: "🛒 Katalog Produk", desc: "Akses kelola produk afiliasi" },
  { id: "MANAGE_ULASAN", label: "⭐ Moderasi Ulasan", desc: "Akses hapus komentar toksik/spam" },
  { id: "MANAGE_BENNER", label: "🖼️ Kelola Banner", desc: "Akses mengelola banner slider di beranda" },
];

export default function AdminManagement() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  // STATE FORMULIR
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    role: "ADMIN",
    permissions: [] as string[]
  });

  // 1. PENGAMANAN HALAMAN (ROUTE GUARD KHUSUS SUPERADMIN)
  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    const profile = JSON.parse(profileString);
    setAdminName(profile.username || "Admin");
    setAdminRole(profile.role || "STAFF");

    if (profile.role !== "SUPERADMIN") {
      alert("Akses Ditolak! Halaman ini hanya untuk SUPERADMIN.");
      router.push("/admin/dashboard");
      return;
    }

    fetchUsers();
  }, [router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Gagal mengambil data pengguna", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  const handlePermissionChange = (permId: string) => {
    setFormData(prev => {
      const isSelected = prev.permissions.includes(permId);
      if (isSelected) {
        return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
      } else {
        return { ...prev, permissions: [...prev.permissions, permId] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: "Akses admin baru berhasil ditambahkan! 🎉" });
        setFormData({ username: "", password: "", role: "ADMIN", permissions: [] });
        fetchUsers(); // Segarkan tabel
      } else {
        setMessage({ type: "error", text: data.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Terjadi kesalahan pada sistem." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!window.confirm(`Yakin ingin mencabut dan menghapus akses untuk "${username}"?`)) return;

    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      
      if (res.ok) {
        setUsers(prev => prev.filter(user => user.id !== id));
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Gagal menghapus akun.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12 relative overflow-hidden">
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>👑</span> Pusat Manajemen Akun
            </h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Sistem kendali tertinggi untuk mengelola hak akses administrator.</p>
          </div>
          <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 mt-2 md:mt-0">
            <div className="flex items-center gap-3 mr-4">
              <Link href="/admin/management/histori" className="px-5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-sm rounded-xl transition-all shadow-sm">
                📜 Histori Aktivitas
              </Link>
            </div>
            <div className="text-left md:text-right">
              <p className="text-sm font-black text-slate-900">{adminName}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{adminRole}</p>
            </div>
            <button onClick={handleLogout} className="px-5 py-2 shrink-0 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95">
              Logout
            </button>
          </div>
        </motion.div>

        {/* Menu Navigasi Utama */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex flex-nowrap overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap md:pb-0 custom-scrollbar">
          <Link href="/admin/dashboard" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900">
            <span>📚 Kamus Bahan Utama</span>
          </Link>

          <Link href="/admin/reportbahan" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900">
            <span>❓ Pusat Tinjauan</span>
          </Link>

          <Link href="/admin/products" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900">
            <span>🛒 Katalog Produk</span>
          </Link>

          <Link href="/admin/products/review" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900">
            <span>⭐ Moderasi Ulasan</span>
          </Link>

          {/* PERENDERAN BERSYARAT: Tombol Manajemen Banner */}
          <Link href="/admin/benner" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50">
            <span>🖼️ Kelola Banner</span>
          </Link>

          {/* TAB AKTIF */}
          <div className="shrink-0 md:ml-auto px-5 py-2.5 font-bold text-sm rounded-lg flex items-center gap-2 bg-slate-900 text-white shadow-md cursor-default">
            <span>👑 Manajemen Akun</span>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* KOLOM KIRI: FORMULIR TAMBAH AKUN */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-lg shadow-md">
                ➕
              </div>
              <h2 className="text-lg font-black text-slate-900">Admin Baru</h2>
            </div>
            
            {message.text && (
              <div className={`p-4 mb-6 rounded-xl text-sm font-bold border ${message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Username / ID Admin</label>
                <input 
                  required 
                  type="text" 
                  value={formData.username} 
                  onChange={(e) => setFormData({...formData, username: e.target.value.toLowerCase().trim()})} 
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 outline-none text-sm font-bold text-slate-900 bg-white placeholder-slate-400 focus:border-slate-900 focus:ring-0 transition-colors" 
                  placeholder="contoh: budi_katalog" 
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Kata Sandi</label>
                <input 
                  required 
                  type="password" 
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 outline-none text-sm font-bold text-slate-900 bg-white placeholder-slate-400 focus:border-slate-900 focus:ring-0 transition-colors" 
                  placeholder="Minimal 6 karakter" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Tingkat Peran</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${formData.role === "ADMIN" ? 'bg-blue-50 border-blue-600 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}>
                    <input type="radio" name="role" value="ADMIN" checked={formData.role === "ADMIN"} onChange={() => setFormData({...formData, role: "ADMIN"})} className="hidden" />
                    <span className={`text-2xl mb-2 transition-all ${formData.role === "ADMIN" ? 'scale-110' : 'grayscale opacity-50'}`}>🛠️</span>
                    <span className={`text-xs font-black tracking-wide ${formData.role === "ADMIN" ? 'text-blue-800' : 'text-slate-500'}`}>ADMIN</span>
                  </label>
                  
                  <label className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${formData.role === "VIEWER" ? 'bg-purple-50 border-purple-600 shadow-sm' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'}`}>
                    <input type="radio" name="role" value="VIEWER" checked={formData.role === "VIEWER"} onChange={() => setFormData({...formData, role: "VIEWER", permissions: []})} className="hidden" />
                    <span className={`text-2xl mb-2 transition-all ${formData.role === "VIEWER" ? 'scale-110' : 'grayscale opacity-50'}`}>👁️</span>
                    <span className={`text-xs font-black tracking-wide ${formData.role === "VIEWER" ? 'text-purple-800' : 'text-slate-500'}`}>VIEWER</span>
                  </label>
                </div>
              </div>

              <div className={`space-y-3 pt-6 border-t border-slate-100 transition-opacity duration-300 ${formData.role === "VIEWER" ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide block mb-2">Pilih Hak Akses (Modifikasi)</label>
                <div className="space-y-3">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <label key={perm.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.permissions.includes(perm.id) ? 'bg-slate-900 border-slate-900 shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                      <div className="pt-0.5">
                        <input 
                          type="checkbox" 
                          checked={formData.permissions.includes(perm.id)}
                          onChange={() => handlePermissionChange(perm.id)}
                          className="w-5 h-5 accent-white rounded border-slate-300"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-black ${formData.permissions.includes(perm.id) ? 'text-white' : 'text-slate-800'}`}>{perm.label}</span>
                        <span className={`text-[10px] font-medium mt-0.5 ${formData.permissions.includes(perm.id) ? 'text-slate-300' : 'text-slate-500'}`}>{perm.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-4 mt-6 text-sm font-black rounded-2xl transition-all active:scale-95 shadow-lg bg-slate-900 hover:bg-black text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSubmitting ? <span className="animate-pulse">Mendaftarkan...</span> : <><span>✅</span> Simpan & Buat Akun</>}
              </button>
            </form>
          </motion.div>

          {/* KOLOM KANAN: TABEL DAFTAR ADMIN */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-slate-900">Daftar Admin Aktif</h2>
              <span className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all flex items-center gap-2">{users.length} Akun</span>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center py-20 opacity-50">
                <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                <table className="w-full text-left text-sm text-slate-700">
                  <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-5 whitespace-nowrap">Profil & Peran</th>
                      <th className="p-5">Hak Akses Tersedia</th>
                      <th className="p-5 text-right whitespace-nowrap">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    <AnimatePresence>
                      {users.map((user) => (
                        <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.95 }} key={user.id} className="hover:bg-slate-50/80 transition-colors group">
                          
                          <td className="p-5 align-top">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-lg border border-slate-200 shrink-0">
                                {user.role === 'SUPERADMIN' ? '👑' : user.role === 'ADMIN' ? '🛠️' : '👁️'}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 mb-1 text-base">{user.username}</p>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded shadow-sm uppercase tracking-widest ${
                                  user.role === 'SUPERADMIN' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                                  user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                                  'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}>
                                  {user.role}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="p-5 align-middle">
                            {user.role === "SUPERADMIN" ? (
                              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100 inline-block">
                                ✨ Mewarisi Akses Absolut (Semua)
                              </span>
                            ) : user.role === "VIEWER" ? (
                              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100 inline-block">
                                👁️ Hanya Pemantau (Read-Only)
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {user.permissions.length === 0 && (
                                  <span className="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 border border-rose-100 rounded-lg font-bold">
                                    ⚠️ Tidak ada akses diberikan
                                  </span>
                                )}
                                {user.permissions.map(p => {
                                  const label = AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p;
                                  return (
                                    <span key={p} className="text-[10px] font-bold bg-white shadow-sm border border-slate-200 text-slate-700 px-2.5 py-1 rounded-md">
                                      {label}
                                    </span>
                                  )
                                })}
                              </div>
                            )}
                          </td>

                          <td className="p-5 text-right align-middle">
                            {user.role !== "SUPERADMIN" ? (
                              <button 
                                onClick={() => handleDelete(user.id, user.username)} 
                                className="text-rose-600 font-bold hover:text-white bg-rose-50 hover:bg-rose-500 px-4 py-2 rounded-xl transition-colors text-xs border border-rose-200 hover:border-transparent shadow-sm active:scale-95 inline-flex items-center gap-1.5"
                              >
                                <span>🗑️</span> Cabut Akses
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 italic">Dilindungi</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}