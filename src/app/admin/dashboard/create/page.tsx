// src/app/admin/dashboard/create/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

export default function CreateIngredientPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [skinTypes, setSkinTypes] = useState({
    Normal: false,
    Kering: false,
    Berminyak: false,
    Kombinasi: false,
  });

  // State diperbarui dengan functionalCategory
  const [formData, setFormData] = useState({
    name: "",
    aliases: "", 
    type: "BASIC",
    functionalCategory: "UMUM", // <-- Nilai default
    benefits: "",
    warnings: "",
    comedogenicRating: 0,
    safeForPregnancy: true,
    safeForSensitive: true,
    targetFocus: "",
  });

  useEffect(() => {
    const isAuth = sessionStorage.getItem("isAdminAuth");
    if (!isAuth) {
      router.push("/admin/login");
    }
  }, [router]);

  const handleSkinTypeChange = (type: keyof typeof skinTypes) => {
    setSkinTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    const goodForSkinTypes = Object.entries(skinTypes)
      .filter(([_, isChecked]) => isChecked)
      .map(([key]) => key)
      .join(",");

    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, goodForSkinTypes }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Bahan berhasil ditambahkan ke kamus! ✨" });
        
        // Reset form setelah sukses
        setFormData({
          name: "", aliases: "", type: "BASIC", functionalCategory: "UMUM", benefits: "", warnings: "",
          comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, targetFocus: ""
        });
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 700);
        setSkinTypes({ Normal: false, Kering: false, Berminyak: false, Kombinasi: false });
      } else {
        const data = await res.json();
        throw new Error(data.message || "Gagal menyimpan data.");
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/admin/dashboard" 
          className="text-sm font-bold text-slate-500 hover:text-black transition-colors mb-6 inline-block"
        >
          ← Kembali ke Dasbor
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200"
        >
          <h1 className="text-2xl font-black text-slate-900 mb-2">Tambah Bahan Baru 🧪</h1>
          <p className="text-sm text-slate-500 mb-8 font-medium">Lengkapi data di bawah untuk memperkuat logika analisis AI.</p>

          {message.text && (
            <div className={`p-4 mb-6 rounded-xl text-sm font-bold border ${
              message.type === "success" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nama, Tipe Logika & Kategori Fungsional (DIJADIKAN 3 KOLOM) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-xs font-bold text-slate-700 uppercase">Nama Bahan (INCI Name)</label>
                <input
                  id="name" required type="text" placeholder="Contoh: Centella Asiatica"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm font-medium text-slate-900 bg-white"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="type" className="text-xs font-bold text-slate-700 uppercase">Kategori Logika</label>
                <select 
                  id="type" value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm font-medium text-slate-900 bg-white"
                >
                  <option value="BASIC">BASIC (Standar)</option>
                  <option value="HERO">HERO (Bintang Utama)</option>
                  <option value="HARSH">HARSH (Keras/Aktif)</option>
                  <option value="BUFFER">BUFFER (Penenang)</option>
                  <option value="TOXIC">TOXIC (Berbahaya)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label htmlFor="functionalCategory" className="text-xs font-bold text-slate-700 uppercase">Fungsi Khusus</label>
                <select 
                  id="functionalCategory" value={formData.functionalCategory}
                  onChange={(e) => setFormData({...formData, functionalCategory: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm font-medium text-slate-900 bg-white"
                >
                  <option value="UMUM">UMUM (Pelengkap/Lainnya)</option>
                  <option value="SURFAKTAN">SURFAKTAN (Wajib Face Wash)</option>
                  <option value="UV_FILTER">UV FILTER (Wajib Sunscreen)</option>
                  <option value="PELEMBAP">PELEMBAP (Wajib Moisturizer)</option>
                </select>
              </div>
            </div>

            {/* Input Sinonim/Alias */}
            <div className="space-y-2">
              <label htmlFor="aliases" className="text-xs font-bold text-slate-700 uppercase">Sinonim / Alias (Beda Bahasa / Ejaan)</label>
              <input
                id="aliases" type="text" placeholder="Contoh: pegagan, gotu kola, cica (Pisahkan dengan koma)"
                value={formData.aliases}
                onChange={(e) => setFormData({...formData, aliases: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm font-medium text-slate-900 bg-white"
              />
            </div>

            {/* Manfaat */}
            <div className="space-y-2">
              <label htmlFor="benefits" className="text-xs font-bold text-slate-700 uppercase">Manfaat Utama</label>
              <textarea
                id="benefits" required rows={3} placeholder="Jelaskan apa yang dilakukan bahan ini..."
                value={formData.benefits}
                onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none transition-all text-sm font-medium resize-none text-slate-900 bg-white"
              />
            </div>

            {/* Rating & Keamanan */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="comedogenic" className="text-xs font-bold text-slate-700 uppercase">Komedogenik (0-5)</label>
                <input
                  id="comedogenic" type="number" min="0" max="5"
                  value={formData.comedogenicRating}
                  onChange={(e) => setFormData({...formData, comedogenicRating: parseInt(e.target.value)})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none text-sm font-medium text-slate-900 bg-white"
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input 
                  type="checkbox" id="preg"
                  checked={formData.safeForPregnancy}
                  onChange={(e) => setFormData({...formData, safeForPregnancy: e.target.checked})}
                  className="w-5 h-5 accent-black cursor-pointer"
                />
                <label htmlFor="preg" className="text-sm font-bold text-slate-700 cursor-pointer">Aman Bumil 🤰</label>
              </div>
              <div className="flex items-center gap-2 pt-8">
                <input 
                  type="checkbox" id="sens"
                  checked={formData.safeForSensitive}
                  onChange={(e) => setFormData({...formData, safeForSensitive: e.target.checked})}
                  className="w-5 h-5 accent-black cursor-pointer"
                />
                <label htmlFor="sens" className="text-sm font-bold text-slate-700 cursor-pointer">Aman Sensitif 🌡️</label>
              </div>
            </div>

            {/* Checkbox Jenis Kulit & Fokus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 uppercase">Cocok Untuk Tipe Kulit</label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(skinTypes) as Array<keyof typeof skinTypes>).map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2 rounded-lg border border-slate-200 hover:bg-slate-100">
                      <input
                        type="checkbox" checked={skinTypes[type]}
                        onChange={() => handleSkinTypeChange(type)}
                        className="w-4 h-4 accent-black"
                      />
                      <span className="text-sm font-bold text-slate-800">{type}</span>
                    </label>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 font-medium">Kosongkan jika bahan ini netral/cocok untuk semua.</p>
              </div>

              <div className="space-y-2">
                <label htmlFor="focus" className="text-xs font-bold text-slate-700 uppercase">Fokus Utama (Jika HERO)</label>
                <select 
                  id="focus" value={formData.targetFocus}
                  onChange={(e) => setFormData({...formData, targetFocus: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-black outline-none text-sm font-medium text-slate-900 bg-white"
                >
                  <option value="">-- Bukan Hero / Netral --</option>
                  <option value="MENCERAHKAN">Mencerahkan / Flek</option>
                  <option value="MENURUNKAN_JERAWAT">Menurunkan Jerawat</option>
                  <option value="MENGHILANGKAN_BEKAS">Menghilangkan Bekas</option>
                  <option value="MERAWAT_MEMBERSIHKAN">Basic Care / Melembapkan</option>
                </select>
                <p className="text-[10px] text-slate-500 font-medium">Pilih ini jika bahan di atas adalah bintang utama yang dicari untuk masalah kulit klien.</p>
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:bg-slate-300 shadow-md"
            >
              {isLoading ? "Menyimpan..." : "Simpan Bahan ke Kamus ✨"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}