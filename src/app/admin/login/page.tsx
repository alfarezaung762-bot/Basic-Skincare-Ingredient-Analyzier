// src/app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Tambahan state loading

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      // Mengirim data ke API yang baru kita buat di Tahap 2
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // 1. Menyimpan "Kartu Identitas" lengkap dari database (Peran & Hak Akses)
        sessionStorage.setItem("adminProfile", JSON.stringify(data.user));
        
        // 2. Menyimpan kunci lama agar halaman dasbor saat ini tidak rusak/menendangmu keluar selama masa transisi
        sessionStorage.setItem("isAdminAuth", "true"); 
        
        router.push("/admin/dashboard");
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
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-2xl font-black text-slate-900">Admin Login</h1>
          <p className="text-sm text-slate-500 font-medium">Pusat Kendali Pengetahuan AI</p>
        </div>

        {loginError && (
          <div className="p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-200 text-center">
            {loginError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Admin ID</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full text-slate-900 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-black text-sm font-medium"
              placeholder="Masukkan ID"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-black text-sm font-medium text-slate-900"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isLoading} 
          className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Memeriksa Identitas..." : "Masuk Dasbor"}
        </button>
      </form>
    </div>
  );
}