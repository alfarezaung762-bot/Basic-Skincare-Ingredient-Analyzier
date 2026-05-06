"use client";

import { useState, useEffect } from "react";

interface AdminHeaderProps {
  adminName: string;
  adminRole: string;
  onLogout: () => void;
  title: string;
  subtitle: string;
}

export default function AdminHeader({ adminName, adminRole, onLogout, title, subtitle }: AdminHeaderProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDark(true);
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>🎛️</span> {title}
        </h1>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{subtitle}</p>
      </div>
      <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-4 pt-4 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800 mt-2 md:mt-0">
        
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all duration-300 border ${
            isDark 
              ? "bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-750" 
              : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-white"
          }`}
          title={isDark ? "Aktifkan Mode Terang" : "Aktifkan Mode Gelap"}
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        <div className="text-left md:text-right">
          <p className="text-sm font-black text-slate-900 dark:text-slate-100">{adminName}</p>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">{adminRole}</p>
        </div>
        <button 
          onClick={onLogout} 
          className="px-5 py-2 shrink-0 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 dark:hover:text-white font-bold text-sm rounded-xl transition-all shadow-sm active:scale-95"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
