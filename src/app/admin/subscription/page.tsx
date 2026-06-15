// src/app/admin/subscription/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import AdminHeader from "@/components/admin/AdminHeader";

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  price: number;
  packageName: string;
  paymentType: string;
  status: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

interface SubscriptionConfig {
  pricePro: number;
  pointsPro: number;
  priceProPlus: number;
  pointsProPlus: number;
  initialPoints: number;
  dailyRefresh: number;
  costFast: number;
  costHybrid: number;
}

export default function AdminSubscriptionPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Configurations State
  const [config, setConfig] = useState<SubscriptionConfig>({
    pricePro: 10000,
    pointsPro: 100,
    priceProPlus: 30000,
    pointsProPlus: 500,
    initialPoints: 10,
    dailyRefresh: 1,
    costFast: 1,
    costHybrid: 2,
  });

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Temporary editing state for input focus
  const [activeInput, setActiveInput] = useState<{ [key: string]: string }>({});

  const getDisplayValue = (key: keyof SubscriptionConfig) => {
    if (activeInput[key] !== undefined) {
      return activeInput[key];
    }
    return config[key].toString();
  };

  const handleInputChange = (key: keyof SubscriptionConfig, value: string) => {
    setActiveInput(prev => ({ ...prev, [key]: value }));

    // Strip leading zeros for parsed numeric state
    const cleanValue = value.replace(/^0+/, "");
    const numericValue = cleanValue === "" ? 0 : Number(cleanValue);

    setConfig(prev => ({
      ...prev,
      [key]: isNaN(numericValue) ? 0 : numericValue,
    }));
  };

  const handleInputBlur = (key: keyof SubscriptionConfig) => {
    setActiveInput(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

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

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      // Fetch Config
      const configRes = await fetch("/api/admin/subscription/config");
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
      }

      // Fetch Transactions
      const transRes = await fetch("/api/admin/subscription/transactions");
      if (transRes.ok) {
        const transData = await transRes.json();
        setTransactions(transData);
      }
    } catch (error) {
      console.error("Gagal memuat data:", error);
      setMessage({ type: "error", text: "Gagal memuat data dari server." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setMessage({ type: "", text: "" });

      const res = await fetch("/api/admin/subscription/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminUsername: adminName,
          ...config,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Konfigurasi sistem berhasil disimpan!" });
        // Simpan log ke server secara async
        fetch("/api/admin/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adminName,
            adminEmail: adminName,
            adminRole: "SUPERADMIN",
            action: "UPDATE",
            entity: "SUBSCRIPTION_SETTINGS",
            details: "Memperbarui pengaturan paket langganan dan alokasi poin.",
          }),
        });
      } else {
        setMessage({ type: "error", text: data.message || "Gagal menyimpan konfigurasi." });
      }
    } catch (error) {
      console.error("Simpan error:", error);
      setMessage({ type: "error", text: "Terjadi kesalahan koneksi server." });
    } finally {
      setIsSaving(false);
    }
  };

  // Hitung statistik transaksi
  const successTransactions = transactions.filter(t => t.status === "SUCCESS");
  const totalRevenue = successTransactions.reduce((acc, t) => acc + t.price, 0);
  const totalPointsDistributed = successTransactions.reduce((acc, t) => acc + t.amount, 0);

  // Cari metode pembayaran terpopuler
  const paymentCounts = successTransactions.reduce((acc, t) => {
    acc[t.paymentType] = (acc[t.paymentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const popularPayment = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";

  // Filter transaksi berdasarkan pencarian nama/email dan filter status
  const filteredTransactions = transactions.filter(t => {
    const matchesSearch =
      (t.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      (t.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
      t.packageName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <AdminHeader 
        adminName={adminName} 
        adminRole={adminRole} 
        onLogout={handleLogout}
        title="Pengaturan Langganan & Transaksi"
        subtitle="Halaman khusus SUPERADMIN untuk mengatur harga paket, kuota poin, dan memantau transaksi masuk."
      />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        {/* Tautan Kembali & Judul */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-teal-600 to-indigo-600 bg-clip-text text-transparent dark:from-teal-400 dark:to-indigo-400">
              ⚙️ Pengaturan Langganan
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm hidden sm:block">
              Halaman khusus SUPERADMIN untuk mengatur harga paket, kuota poin, dan memantau transaksi masuk.
            </p>
          </div>
          <Link
            href="/admin/management"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all text-sm self-start sm:self-center"
          >
            ← Kembali ke Akses Admin
          </Link>
        </div>

        {/* Notifikasi Message */}
        <AnimatePresence>
          {message.text && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 mb-6 rounded-2xl text-sm font-medium border shadow-sm flex items-center justify-between ${
                message.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400"
                  : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-400"
              }`}
            >
              <span>{message.text}</span>
              <button onClick={() => setMessage({ type: "", text: "" })} className="hover:opacity-75 text-lg font-bold">
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 font-medium">Memuat data konfigurasi...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
            
            {/* PANEL KIRI: FORM PENGATURAN KONFIGURASI (KOLOM 12 -> 5) */}
            <div className="lg:col-span-5">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md shadow-slate-100/40 dark:shadow-none">
                <div className="border-b border-slate-100 dark:border-slate-700 pb-4 mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Konfigurasi Poin & Tarif
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Atur tarif, kuota, harga, dan refresh harian secara dinamis</p>
                </div>

                <form onSubmit={handleSaveConfig} className="space-y-6">
                  {/* Paket PRO */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-teal-600 dark:text-teal-400">Paket Pro ({config.pointsPro} Poin)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="input-price-pro" className="block text-xs text-slate-400 font-semibold mb-1">Harga (Rp)</label>
                        <input
                          id="input-price-pro"
                          type="number"
                          value={getDisplayValue("pricePro")}
                          onChange={(e) => handleInputChange("pricePro", e.target.value)}
                          onBlur={() => handleInputBlur("pricePro")}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                          min={1}
                        />
                      </div>
                      <div>
                        <label htmlFor="input-points-pro" className="block text-xs text-slate-400 font-semibold mb-1">Kuota Kredit Poin</label>
                        <input
                          id="input-points-pro"
                          type="number"
                          value={getDisplayValue("pointsPro")}
                          onChange={(e) => handleInputChange("pointsPro", e.target.value)}
                          onBlur={() => handleInputBlur("pointsPro")}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                          min={1}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Paket PRO PLUS */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400">Paket Pro Plus ({config.pointsProPlus} Poin)</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="input-price-pro-plus" className="block text-xs text-slate-400 font-semibold mb-1">Harga (Rp)</label>
                        <input
                          id="input-price-pro-plus"
                          type="number"
                          value={getDisplayValue("priceProPlus")}
                          onChange={(e) => handleInputChange("priceProPlus", e.target.value)}
                          onBlur={() => handleInputBlur("priceProPlus")}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                          min={1}
                        />
                      </div>
                      <div>
                        <label htmlFor="input-points-pro-plus" className="block text-xs text-slate-400 font-semibold mb-1">Kuota Kredit Poin</label>
                        <input
                          id="input-points-pro-plus"
                          type="number"
                          value={getDisplayValue("pointsProPlus")}
                          onChange={(e) => handleInputChange("pointsProPlus", e.target.value)}
                          onBlur={() => handleInputBlur("pointsProPlus")}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                          min={1}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Refresh Harian & Poin Awal */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">Pengguna Baru & Kuota Gratis</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="input-initial-points" className="block text-xs text-slate-400 font-semibold mb-1">Kredit Awal Baru</label>
                        <input
                          id="input-initial-points"
                          type="number"
                          value={getDisplayValue("initialPoints")}
                          onChange={(e) => handleInputChange("initialPoints", e.target.value)}
                          onBlur={() => handleInputBlur("initialPoints")}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                          min={0}
                        />
                      </div>
                      <div>
                        <label htmlFor="input-daily-refresh" className="block text-xs text-slate-400 font-semibold mb-1">Refresh Per Hari</label>
                        <input
                          id="input-daily-refresh"
                          type="number"
                          value={getDisplayValue("dailyRefresh")}
                          onChange={(e) => handleInputChange("dailyRefresh", e.target.value)}
                          onBlur={() => handleInputBlur("dailyRefresh")}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tarif Fitur Analisis */}
                  <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">Tarif Kredit Fitur</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="input-cost-fast" className="block text-xs text-slate-400 font-semibold mb-1">Sistem Cepat (Poin)</label>
                        <input
                          id="input-cost-fast"
                          type="number"
                          value={getDisplayValue("costFast")}
                          onChange={(e) => handleInputChange("costFast", e.target.value)}
                          onBlur={() => handleInputBlur("costFast")}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                          min={0}
                        />
                      </div>
                      <div>
                        <label htmlFor="input-cost-hybrid" className="block text-xs text-slate-400 font-semibold mb-1">AI Hybrid (Poin)</label>
                        <input
                          id="input-cost-hybrid"
                          type="number"
                          value={getDisplayValue("costHybrid")}
                          onChange={(e) => handleInputChange("costHybrid", e.target.value)}
                          onBlur={() => handleInputBlur("costHybrid")}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          required
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tombol Simpan */}
                  <button
                    id="btn-save-config"
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-md transition-all duration-300 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <span>Simpan Konfigurasi</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* PANEL KANAN: RINGKASAN & HISTORI TRANSAKSI (KOLOM 12 -> 7) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* STATISTIK RINGKASAN */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">TOTAL REVENUE</span>
                  <span className="text-sm sm:text-lg font-extrabold text-teal-600 dark:text-teal-400 mt-1 sm:mt-2">
                    Rp {totalRevenue.toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">SUKSES TRANSAKSI</span>
                  <span className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-2">
                    {successTransactions.length} <span className="text-xs font-normal text-slate-400">kali</span>
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">POIN TERDISTRIBUSI</span>
                  <span className="text-xl font-extrabold text-amber-500 mt-2">
                    🪙 {totalPointsDistributed}
                  </span>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col justify-between">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wider">PEMBAYARAN POPULER</span>
                  <span className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-2 truncate">
                    {popularPayment === "BANK_VA" ? "💸 BANK VA" : popularPayment === "GOPAY" ? "📱 GOPAY" : popularPayment === "DANA" ? "💎 DANA" : "-"}
                  </span>
                </div>
              </div>

              {/* DAFTAR TRANSAKSI */}
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-700 pb-4 mb-6 gap-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      💰 Riwayat Transaksi Pengguna
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Audit riil transaksi pembelian poin dalam sistem</p>
                  </div>
                  
                  {/* Filter Status */}
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold focus:border-teal-500 outline-none"
                    >
                      <option value="ALL">Semua Status</option>
                      <option value="SUCCESS">SUCCESS</option>
                      <option value="PENDING">PENDING</option>
                      <option value="FAILED">FAILED</option>
                    </select>
                  </div>
                </div>

                {/* Kolom Pencarian */}
                <div className="mb-4">
                  <input
                    type="text"
                    placeholder="Cari berdasarkan nama user, email, atau nama paket..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-teal-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all"
                  />
                </div>

                {/* Tabel Transaksi */}
                <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      ❌ Tidak ditemukan transaksi yang cocok
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                          <th className="p-4">Pengguna</th>
                          <th className="p-4">Paket</th>
                          <th className="p-4 text-center">Poin</th>
                          <th className="p-4 text-right">Harga</th>
                          <th className="p-4">Bayar</th>
                          <th className="p-4">Tanggal</th>
                          <th className="p-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((t) => (
                          <tr
                            key={t.id}
                            className="border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors"
                          >
                            {/* Pengguna */}
                            <td className="p-4">
                              <div className="font-semibold text-slate-700 dark:text-slate-300">
                                {t.user?.name || "User Tanpa Nama"}
                              </div>
                              <div className="text-[10px] text-slate-400 font-medium">
                                {t.user?.email || "Unknown Email"}
                              </div>
                            </td>
                            {/* Paket */}
                            <td className="p-4 align-middle">
                              <span className={`font-bold px-2 py-0.5 rounded-md text-[10px] ${
                                t.packageName === "PRO_PLUS"
                                  ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30"
                                  : "bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30"
                              }`}>
                                {t.packageName}
                              </span>
                            </td>
                            {/* Poin */}
                            <td className="p-4 text-center font-bold text-slate-600 dark:text-slate-300 align-middle">
                              🪙 {t.amount}
                            </td>
                            {/* Harga */}
                            <td className="p-4 text-right font-extrabold text-slate-700 dark:text-slate-300 align-middle">
                              Rp {t.price.toLocaleString("id-ID")}
                            </td>
                            {/* Metode Pembayaran */}
                            <td className="p-4 align-middle font-semibold text-slate-500 dark:text-slate-400">
                              {t.paymentType === "BANK_VA" ? "💸 BANK VA" : t.paymentType === "GOPAY" ? "📱 GOPAY" : t.paymentType === "DANA" ? "💎 DANA" : t.paymentType}
                            </td>
                            {/* Tanggal */}
                            <td className="p-4 align-middle text-slate-400 font-medium">
                              {new Date(t.createdAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </td>
                            {/* Status */}
                            <td className="p-4 text-center align-middle">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wide ${
                                t.status === "SUCCESS"
                                  ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30"
                                  : t.status === "PENDING"
                                  ? "bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30"
                                  : "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30"
                              }`}>
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
