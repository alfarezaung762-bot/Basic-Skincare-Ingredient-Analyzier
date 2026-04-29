// src/app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion"; // <-- Ini yang ditambahkan

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem("adminProfile", JSON.stringify(data.user));
        sessionStorage.setItem("isAdminAuth", "true"); 
        
        // ==========================================================
        // SMART REDIRECT: Melempar admin sesuai dengan hak aksesnya
        // ==========================================================
        const role = data.user.role;
        const permissions = data.user.permissions || [];

        if (role === "SUPERADMIN" || role === "VIEWER" || permissions.includes("MANAGE_KAMUS")) {
          router.push("/admin/dashboard");
        } else if (permissions.includes("MANAGE_TINJAUAN")) {
          router.push("/admin/reportbahan");
        } else if (permissions.includes("MANAGE_KATALOG")) {
          router.push("/admin/products");
        } else if (permissions.includes("MANAGE_ULASAN")) {
          router.push("/admin/products/review");
        } else {
          setLoginError("Akun Anda belum diberikan hak akses ruangan manapun oleh Superadmin.");
          sessionStorage.clear();
        }
      } else {
        setLoginError(data.message || "ID atau Password salah!");
      }
    } catch (error) {
      setLoginError("Terjadi kesalahan pada koneksi server. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* ANIMASI LATAR BELAKANG (GLASSMORPHISM BLOBS) */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1], 
          x: [0, 50, 0],
          y: [0, 30, 0] 
        }} 
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }} 
        className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 pointer-events-none"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1], 
          x: [0, -60, 0],
          y: [0, -40, 0] 
        }} 
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }} 
        className="absolute bottom-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-purple-300 rounded-full mix-blend-multiply filter blur-[120px] opacity-40 pointer-events-none"
      />

      {/* KARTU FORMULIR LOGIN */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <form onSubmit={handleLogin} className="bg-white/70 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_10px_40px_rgb(0,0,0,0.08)] border border-white space-y-8">
          
          <div className="text-center space-y-2">
            <motion.div 
              initial={{ scale: 0 }} 
              animate={{ scale: 1 }} 
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="w-20 h-20 bg-slate-900 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-slate-900/20 mb-6"
            >
              <span className="text-4xl">✨</span>
            </motion.div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Selamat Datang</h1>
            <p className="text-sm text-slate-500 font-medium">Pusat Kendali Skincare Analyzer AI</p>
          </div>

          <AnimatePresence>
            {loginError && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="p-4 bg-rose-50/80 backdrop-blur-sm text-rose-600 text-sm font-bold rounded-2xl border border-rose-200 text-center"
              >
                {loginError}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest pl-1">ID Administrator</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400">👤</span>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-200 bg-white/50 focus:bg-white outline-none text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-0 transition-all duration-300"
                  placeholder="Masukkan ID Anda"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 uppercase tracking-widest pl-1">Kata Sandi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400">🔑</span>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-4 rounded-2xl border-2 border-slate-200 bg-white/50 focus:bg-white outline-none text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:ring-0 transition-all duration-300"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full py-4 bg-slate-900 text-white text-sm font-black rounded-2xl hover:bg-black hover:shadow-xl hover:shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Memverifikasi...</span>
              </>
            ) : (
              <span>Masuk ke Dasbor 🚀</span>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}