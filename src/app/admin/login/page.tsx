// src/app/admin/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "admin") {
      // Simpan tiket masuk sementara di memori browser
      sessionStorage.setItem("isAdminAuth", "true");
      router.push("/admin/dashboard");
    } else {
      setLoginError("ID atau Password salah!");
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
              className="w-full  text-slate-900 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-black text-sm font-medium"
              placeholder="Masukkan ID"
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
            />
          </div>
        </div>

        <button type="submit" className="w-full py-3 bg-black text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-95">
          Masuk Dasbor
        </button>
      </form>
    </div>
  );
}