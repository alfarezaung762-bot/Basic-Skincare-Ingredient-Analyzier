// src/app/admin/management/histori/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface AdminLog {
  id: string;
  adminName: string;
  adminEmail: string;
  adminRole: string;
  action: string;
  entity: string;
  details: string;
  createdAt: string;
}

export default function AdminHistoryLog() {
  const router = useRouter();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1. PENGAMANAN HALAMAN (ROUTE GUARD KHUSUS SUPERADMIN)
  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    const profile = JSON.parse(profileString);
    if (profile.role !== "SUPERADMIN") {
      alert("Akses Ditolak! Halaman ini hanya untuk SUPERADMIN.");
      router.push("/admin/dashboard");
      return;
    }

    fetchLogs();
  }, [router]);

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/log");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Gagal mengambil data log", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "CREATE": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "UPDATE": return "bg-blue-100 text-blue-800 border-blue-200";
      case "DELETE": return "bg-rose-100 text-rose-800 border-rose-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 relative overflow-hidden">
      {/* Efek Latar Belakang */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-blue-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-30 pointer-events-none"></div>

      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* HEADER */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white/50">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <span>📜</span> Histori Aktivitas Admin
            </h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Sistem pencatatan otomatis untuk setiap perubahan yang dilakukan oleh admin.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/management" className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-sm rounded-xl transition-all shadow-sm">
              Kembali
            </Link>
            <button onClick={handleLogout} className="px-5 py-2.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-bold text-sm rounded-xl transition-all shadow-sm">
              Logout
            </button>
          </div>
        </motion.div>

        {/* TABEL LOG */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/90 backdrop-blur-sm p-6 md:p-8 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white h-fit">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-900">Catatan Tindakan</h2>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">{logs.length} Aktivitas</span>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-20 opacity-50">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <span className="text-4xl block mb-4 opacity-50">📭</span>
              <p className="text-slate-500 font-medium">Belum ada histori aktivitas admin.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-5 whitespace-nowrap">Waktu</th>
                    <th className="p-5 whitespace-nowrap">Admin</th>
                    <th className="p-5 whitespace-nowrap">Aksi</th>
                    <th className="p-5 whitespace-nowrap">Entitas</th>
                    <th className="p-5 w-full">Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <AnimatePresence>
                    {logs.map((log) => (
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                        
                        <td className="p-5 whitespace-nowrap text-xs font-medium text-slate-500">
                          {formatDate(log.createdAt)}
                        </td>

                        <td className="p-5 whitespace-nowrap">
                          <div>
                            <p className="font-black text-slate-900 mb-0.5">{log.adminName}</p>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-widest ${
                              log.adminRole === 'SUPERADMIN' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                              log.adminRole === 'ADMIN' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}>
                              {log.adminRole}
                            </span>
                          </div>
                        </td>

                        <td className="p-5 whitespace-nowrap align-middle">
                          <span className={`text-[10px] font-black px-2 py-1 rounded uppercase border shadow-sm ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>

                        <td className="p-5 whitespace-nowrap align-middle">
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-1 rounded uppercase">
                            {log.entity}
                          </span>
                        </td>

                        <td className="p-5 text-sm font-medium text-slate-700">
                          {log.details}
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
  );
}
