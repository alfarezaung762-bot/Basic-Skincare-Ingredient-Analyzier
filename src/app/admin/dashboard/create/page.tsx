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

  // STATE BARU: Menyimpan daftar nama DAN alias bahan yang sudah ada di database
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [nameError, setNameError] = useState("");
  const [aliasError, setAliasError] = useState(""); // State baru untuk error alias

  const [blacklistedTypes, setBlacklistedTypes] = useState({
    Normal: false,
    Kering: false,
    Berminyak: false,
    Kombinasi: false,
  });

  const [focuses, setFocuses] = useState({
    "Mencerahkan & Bekas Jerawat": false,
    "Merawat Jerawat & Sebum": false,
    "Anti-Aging & Garis Halus": false,
    "Memperbaiki Skin Barrier & Hidrasi": false,
    "Menenangkan Kemerahan (Soothing)": false,
    "Eksfoliasi & Tekstur Pori-pori": false,
  });

  const [formData, setFormData] = useState({
    name: "",
    aliases: "", 
    type: "BASIC",
    functionalCategory: "UMUM", 
    benefits: "",
    aiContext: "", 
    warnings: "",
    comedogenicRating: 0,
    safeForPregnancy: true,
    safeForSensitive: true,
    isKeyActive: false,
    strengthLevel: 1,
    blacklistReason: "",
  });

  useEffect(() => {
    const isAuth = sessionStorage.getItem("isAdminAuth");
    if (!isAuth) {
      router.push("/admin/login");
      return;
    }

    // Mengambil daftar nama dan alias dari API saat halaman dimuat
    fetch("/api/ingredients")
      .then(res => res.json())
      .then(data => {
        let allUsedNames: string[] = [];
        
        data.forEach((item: any) => {
          // Masukkan nama utama
          allUsedNames.push(item.name.toLowerCase().trim());
          
          // Pecah dan masukkan semua alias jika ada
          if (item.aliases) {
            const itemAliases = item.aliases.split(',').map((a: string) => a.toLowerCase().trim());
            allUsedNames = [...allUsedNames, ...itemAliases];
          }
        });
        
        // Hapus duplikat dari array (jaga-jaga) dan simpan ke state
        const finalExistingNames = Array.from(new Set(allUsedNames));
        setExistingNames(finalExistingNames);

        // ========================================================
        // LOGIKA AUTO-FILL DARI URL (Blueprint 3.3)
        // ========================================================
        const params = new URLSearchParams(window.location.search);
        const urlName = params.get("name");
        
        if (urlName) {
          const cleanUrlName = urlName.toLowerCase().trim();
          setFormData(prev => ({ ...prev, name: cleanUrlName }));
          
          // Langsung lakukan validasi real-time
          if (finalExistingNames.includes(cleanUrlName)) {
            setNameError("⚠️ Bahan ini ternyata sudah terdaftar di kamus!");
          }
        }
      })
      .catch(err => console.error("Gagal memuat daftar nama bahan", err));
  }, [router]);

  // LOGIKA VALIDASI NAMA (INCI)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, name: val });

    if (existingNames.includes(val.toLowerCase().trim())) {
      setNameError("⚠️ Bahan dengan nama/alias ini sudah terdaftar di kamus!");
    } else {
      setNameError("");
    }
  };

  // LOGIKA VALIDASI ALIAS (Bisa mengecek banyak kata sekaligus)
  const handleAliasesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, aliases: val });

    // Jika kosong, hilangkan error
    if (!val.trim()) {
      setAliasError("");
      return;
    }

    // Pecah inputan user berdasarkan koma, bersihkan spasi
    const typedAliases = val.split(',').map(a => a.toLowerCase().trim()).filter(a => a !== "");
    
    // Cari apakah ada kata yang bentrok dengan database
    const duplicateAliases = typedAliases.filter(a => existingNames.includes(a));

    if (duplicateAliases.length > 0) {
      setAliasError(`⚠️ Alias sudah terpakai: ${duplicateAliases.join(", ")}`);
    } else {
      setAliasError("");
    }
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    
    if (newType === "TOXIC") {
      setFormData((prev) => ({
        ...prev,
        type: newType,
        functionalCategory: "UMUM",
        comedogenicRating: 0,
        safeForPregnancy: false, 
        safeForSensitive: false, 
        isKeyActive: false,
        strengthLevel: 1,
        blacklistReason: "",
      }));

      setFocuses({
        "Mencerahkan & Bekas Jerawat": false, "Merawat Jerawat & Sebum": false, "Anti-Aging & Garis Halus": false,
        "Memperbaiki Skin Barrier & Hidrasi": false, "Menenangkan Kemerahan (Soothing)": false, "Eksfoliasi & Tekstur Pori-pori": false,
      });

      setBlacklistedTypes({ Normal: false, Kering: false, Berminyak: false, Kombinasi: false });
    } else {
      setFormData((prev) => ({
        ...prev,
        type: newType,
        safeForPregnancy: prev.type === "TOXIC" ? true : prev.safeForPregnancy,
        safeForSensitive: prev.type === "TOXIC" ? true : prev.safeForSensitive,
      }));
    }
  };

  const handleBlacklistChange = (type: keyof typeof blacklistedTypes) => {
    setBlacklistedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handleFocusChange = (focus: keyof typeof focuses) => {
    setFocuses((prev) => ({ ...prev, [focus]: !prev[focus] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Keamanan Ganda: Jangan proses jika ada error pada nama ATAU alias
    if (nameError || aliasError) return;

    setIsLoading(true);
    setMessage({ type: "", text: "" });

    const blacklistedSkinTypes = Object.entries(blacklistedTypes)
      .filter(([_, isChecked]) => isChecked)
      .map(([key]) => key)
      .join(",");

    const targetFocus = Object.entries(focuses)
      .filter(([_, isChecked]) => isChecked)
      .map(([key]) => key)
      .join(",");

    if (blacklistedSkinTypes.length > 0 && formData.blacklistReason.trim() === "") {
      setMessage({ type: "error", text: "Anda mencentang Blacklist. Alasan medis wajib diisi!" });
      setIsLoading(false);
      return;
    }

    const finalStrengthLevel = (formData.type === "HARSH" || formData.type === "BUFFER") 
      ? formData.strengthLevel 
      : 1;

    try {
      const res = await fetch("/api/ingredients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData, 
          strengthLevel: finalStrengthLevel,
          blacklistedSkinTypes, 
          targetFocus 
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Bahan berhasil ditambahkan ke kamus! ✨" });
        
        // ========================================================
        // LOGIKA HAPUS LAPORAN OTOMATIS (Blueprint 3.3)
        // ========================================================
        const params = new URLSearchParams(window.location.search);
        const urlName = params.get("name");
        
        if (urlName) {
          // Cari bahan di tabel laporan berdasarkan nama
          fetch(`/api/admin/reportbahan`)
            .then(res => res.json())
            .then(data => {
               // Ambil dari unknownReports karena ini berasal dari Tab Bahan Asing
               const unknownReports = data.unknownReports || [];
               const reportToClear = unknownReports.find((r: any) => r.name.toLowerCase() === urlName.toLowerCase());
               
               if(reportToClear) {
                 // Kirim request DELETE dengan tipe "unknown"
                 fetch(`/api/admin/reportbahan?id=${reportToClear.id}&type=unknown`, { method: "DELETE" });
               }
            })
            .catch(err => console.error("Gagal menghapus laporan otomatis:", err));
        }

        // Kembalikan form ke kondisi awal
        setFormData({
          name: "", aliases: "", type: "BASIC", functionalCategory: "UMUM", 
          benefits: "", aiContext: "", warnings: "",
          comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true,
          isKeyActive: false, strengthLevel: 1, blacklistReason: ""
        });
        setBlacklistedTypes({ Normal: false, Kering: false, Berminyak: false, Kombinasi: false });
        setFocuses({
          "Mencerahkan & Bekas Jerawat": false, "Merawat Jerawat & Sebum": false, "Anti-Aging & Garis Halus": false,
          "Memperbaiki Skin Barrier & Hidrasi": false, "Menenangkan Kemerahan (Soothing)": false, "Eksfoliasi & Tekstur Pori-pori": false,
        });

        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 1000);
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

  const hasBlacklist = Object.values(blacklistedTypes).some(Boolean);
  const isToxic = formData.type === "TOXIC";

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/reportbahan" className="text-sm font-bold text-slate-500 hover:text-black transition-colors mb-6 inline-block">
          ← Kembali ke Dasbor Laporan
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Tambah Bahan Baru 🧪</h1>
          <p className="text-sm text-slate-500 mb-8 font-medium">Arsitektur V3.3: Terhubung ke Otomatisasi Laporan Sistem.</p>

          {message.text && (
            <div className={`p-4 mb-6 rounded-xl text-sm font-bold border ${message.type === "success" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 md:col-span-1">
                <label htmlFor="name" className="text-xs font-bold text-slate-700 uppercase">Nama (INCI)</label>
                <input 
                  id="name" 
                  required 
                  type="text" 
                  placeholder="Contoh: Salicylic Acid" 
                  value={formData.name} 
                  onChange={handleNameChange}
                  className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-medium focus:ring-2 transition-all ${
                    nameError 
                      ? 'bg-rose-50 border-2 border-rose-300 text-rose-900 focus:ring-rose-500' 
                      : 'bg-white border border-slate-200 text-slate-900 focus:ring-black'
                  }`} 
                />
                {nameError && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 animate-pulse">
                    {nameError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="type" className="text-xs font-bold text-slate-700 uppercase">Sifat Kimia</label>
                <select id="type" value={formData.type} onChange={handleTypeChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-black">
                  <option value="BASIC">BASIC (Standar)</option>
                  <option value="BUFFER">BUFFER (Penenang)</option>
                  <option value="HARSH">HARSH (Keras/Asam)</option>
                  <option value="TOXIC">TOXIC (Berbahaya)</option>
                </select>
              </div>

              <div className={`space-y-2 ${isToxic ? 'opacity-50' : ''}`}>
                <label htmlFor="strengthLevel" className="text-xs font-bold text-slate-700 uppercase">Level Kekuatan</label>
                <select 
                  id="strengthLevel" 
                  value={formData.strengthLevel} 
                  onChange={(e) => setFormData({...formData, strengthLevel: parseInt(e.target.value)})} 
                  disabled={formData.type !== "HARSH" && formData.type !== "BUFFER"}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-black disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value={1}>1 - Rendah/Lembut</option>
                  <option value={2}>2 - Menengah</option>
                  <option value={3}>3 - Sangat Kuat</option>
                </select>
                <p className="text-[10px] text-slate-500 font-medium">Hanya aktif untuk HARSH & BUFFER</p>
              </div>

              <div className={`space-y-2 ${isToxic ? 'opacity-50' : ''}`}>
                <label htmlFor="functionalCategory" className="text-xs font-bold text-slate-700 uppercase">Fungsi Khusus</label>
                <select 
                  id="functionalCategory" 
                  value={formData.functionalCategory} 
                  onChange={(e) => setFormData({...formData, functionalCategory: e.target.value})} 
                  disabled={isToxic}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-black disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="UMUM">UMUM (Lainnya)</option>
                  <option value="SURFAKTAN">SURFAKTAN (Sabun)</option>
                  <option value="UV_FILTER">UV FILTER (Tabir Surya)</option>
                  <option value="PELEMBAP_HUMEKTAN">PELEMBAP (Air/Ringan)</option>
                  <option value="PELEMBAP_EMOLIEN">PELEMBAP (Lipid/Sedang)</option>
                  <option value="PELEMBAP_OKLUSIF">PELEMBAP (Minyak/Tebal)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
              <div className="space-y-2 md:col-span-3">
                <label htmlFor="aliases" className="text-xs font-bold text-slate-700 uppercase">Sinonim / Alias</label>
                <input 
                  id="aliases" 
                  type="text" 
                  placeholder="Contoh: bha, betahydroxy acid (Pisahkan koma)" 
                  value={formData.aliases} 
                  onChange={handleAliasesChange}
                  className={`w-full px-4 py-3 rounded-xl outline-none text-sm font-medium focus:ring-2 transition-all ${
                    aliasError 
                      ? 'bg-amber-50 border-2 border-amber-300 text-amber-900 focus:ring-amber-500' 
                      : 'bg-white border border-slate-200 text-slate-900 focus:ring-black'
                  }`} 
                />
                {aliasError && (
                  <p className="text-[11px] font-bold text-amber-600 mt-1 animate-pulse">
                    {aliasError}
                  </p>
                )}
              </div>
              <div className={`md:col-span-1 pt-4 ${isToxic ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isToxic ? 'bg-slate-100 border-slate-200' : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 cursor-pointer'}`}>
                  <input type="checkbox" checked={formData.isKeyActive} disabled={isToxic} onChange={(e) => setFormData({...formData, isKeyActive: e.target.checked})} className="w-5 h-5 accent-yellow-600 disabled:cursor-not-allowed" />
                  <span className={`text-sm font-bold ${isToxic ? 'text-slate-400' : 'text-yellow-800'}`}>⭐ Bahan Aktif Utama</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <label htmlFor="benefits" className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                  <span>📱</span> {isToxic ? "Alasan Berbahaya (Singkat)" : "Manfaat Singkat (Untuk Pengguna)"} <span className="text-rose-500">*</span>
                </label>
                <textarea id="benefits" required rows={2} placeholder={isToxic ? "Jelaskan secara singkat mengapa bahan ini berbahaya..." : "Jelaskan maksimal 2 kalimat untuk dibaca pengguna di aplikasi..."} value={formData.benefits} onChange={(e) => setFormData({...formData, benefits: e.target.value})} className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-medium resize-none focus:ring-2 bg-white ${isToxic ? 'border-rose-200 text-rose-900 focus:ring-rose-500 focus:border-transparent placeholder-rose-300' : 'border-slate-200 text-slate-900 focus:ring-black'}`} />
              </div>

              <div className="space-y-2">
                <label htmlFor="aiContext" className="text-xs font-bold text-purple-700 uppercase flex items-center gap-2">
                  <span>🤖</span> Analisis Mendalam (Khusus Mesin AI) <span className="text-slate-400 font-normal lowercase tracking-normal">(Opsional)</span>
                </label>
                <textarea id="aiContext" rows={3} placeholder="Tuliskan mekanisme kimia, pH optimal, pantangan campuran, atau data klinis mendalam. AI akan menggunakan ini sebagai konteks tersembunyi..." value={formData.aiContext} onChange={(e) => setFormData({...formData, aiContext: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-purple-200 outline-none text-sm font-medium resize-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30 text-purple-950 placeholder-purple-300" />
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100 ${isToxic ? 'opacity-50' : ''}`}>
              <div className="space-y-2">
                <label htmlFor="comedogenicRating" className="text-xs font-bold text-slate-700 uppercase">Komedogenik (0-5)</label>
                <input id="comedogenicRating" type="number" min="0" max="5" disabled={isToxic} value={formData.comedogenicRating} onChange={(e) => setFormData({...formData, comedogenicRating: parseInt(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-black disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
              </div>
              <div className={`flex items-center gap-2 pt-6 ${isToxic ? 'pointer-events-none' : 'cursor-pointer'}`}>
                <input type="checkbox" id="preg" checked={formData.safeForPregnancy} disabled={isToxic} onChange={(e) => setFormData({...formData, safeForPregnancy: e.target.checked})} className="w-5 h-5 accent-black disabled:cursor-not-allowed" />
                <label htmlFor="preg" className="text-sm font-bold text-slate-700">Aman Bumil 🤰</label>
              </div>
              <div className={`flex items-center gap-2 pt-6 ${isToxic ? 'pointer-events-none' : 'cursor-pointer'}`}>
                <input type="checkbox" id="sens" checked={formData.safeForSensitive} disabled={isToxic} onChange={(e) => setFormData({...formData, safeForSensitive: e.target.checked})} className="w-5 h-5 accent-black disabled:cursor-not-allowed" />
                <label htmlFor="sens" className="text-sm font-bold text-slate-700">Aman Sensitif 🌡️</label>
              </div>
            </div>

            <div className={`space-y-3 ${isToxic ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-xs font-bold text-slate-700 uppercase">Fokus Perawatan (Bisa lebih dari 1)</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(Object.keys(focuses) as Array<keyof typeof focuses>).map((focus) => (
                  <label key={focus} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isToxic ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer'}`}>
                    <input type="checkbox" disabled={isToxic} checked={focuses[focus]} onChange={() => handleFocusChange(focus)} className="w-5 h-5 accent-black disabled:cursor-not-allowed" />
                    <span className={`text-sm font-bold ${isToxic ? 'text-slate-400' : 'text-slate-800'}`}>{focus}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={`space-y-3 pt-6 border-t border-slate-100 ${isToxic ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-xs font-black text-red-600 uppercase flex items-center gap-2">
                🚫 Dilarang Keras Untuk (Blacklist Mutlak)
              </label>
              <p className="text-[11px] font-medium text-slate-500 mb-2">Hanya centang jika bahan ini merupakan pantangan mutlak (Penalti -50%). Kosongkan jika aman.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(blacklistedTypes) as Array<keyof typeof blacklistedTypes>).map((type) => (
                  <label key={type} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isToxic ? 'bg-slate-100 border-slate-200' : blacklistedTypes[type] ? 'bg-red-50 border-red-300 cursor-pointer' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer'}`}>
                    <input type="checkbox" disabled={isToxic} checked={blacklistedTypes[type]} onChange={() => handleBlacklistChange(type)} className="w-5 h-5 accent-red-600 disabled:cursor-not-allowed" />
                    <span className={`text-sm font-bold ${isToxic ? 'text-slate-400' : blacklistedTypes[type] ? 'text-red-700' : 'text-slate-700'}`}>{type}</span>
                  </label>
                ))}
              </div>
              
              {hasBlacklist && !isToxic && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-3">
                  <label htmlFor="blacklistReason" className="sr-only">Alasan Blacklist</label>
                  <textarea id="blacklistReason" required rows={2} placeholder="Wajib isi: Mengapa tipe kulit tersebut dilarang keras memakai bahan ini?" value={formData.blacklistReason} onChange={(e) => setFormData({...formData, blacklistReason: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none text-sm font-medium resize-none bg-red-50 text-red-900 placeholder-red-300" />
                </motion.div>
              )}
            </div>

            {/* Tombol dikunci jika ada error Nama ATAU Alias */}
            <button 
              type="submit" 
              disabled={isLoading || nameError !== "" || aliasError !== ""} 
              className={`w-full py-4 mt-8 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-md text-lg ${isToxic ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-black hover:bg-slate-800 text-white'}`}
            >
              {isLoading ? "Menyimpan ke Database..." : isToxic ? "Simpan Bahan Berbahaya 🚨" : "Simpan Bahan ke Kamus ✨"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}