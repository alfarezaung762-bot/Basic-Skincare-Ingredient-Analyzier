// src/app/admin/dashboard/edit/[id]/page.tsx
"use client";

import { useState, useEffect, use } from "react"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

// FUNGSI NORMALISASI TEKS: Menghapus semua spasi, dash, dan underscore untuk pencocokan yang akurat
const normalizeString = (str: string) => {
  if (!str) return "";
  return str.toLowerCase().replace(/[\s\-_]+/g, "");
};

export default function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  
  const resolvedParams = use(params);
  const ingredientId = resolvedParams.id;

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [isViewer, setIsViewer] = useState(false);

  // STATE VALIDASI NAMA & ALIAS
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [nameError, setNameError] = useState("");
  const [aliasError, setAliasError] = useState("");

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
    comedogenicRating: 0,
    safeForPregnancy: true,
    safeForSensitive: true,
    isKeyActive: false,
    strengthLevel: 1,
    blacklistReason: "",
    isVerified: false, 
  });

  // ========================================================
  // 1. PENGAMANAN HALAMAN (ROUTE GUARD) & TARIK DATA
  // ========================================================
  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    
    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    try {
      const profile = JSON.parse(profileString);
      const isSuperAdmin = profile.role === "SUPERADMIN";
      const isViewOnly = profile.role === "VIEWER";
      const hasPermission = profile.permissions && profile.permissions.includes("MANAGE_KAMUS");

      if (!isSuperAdmin && !isViewOnly && !hasPermission) {
        alert("Akses Ditolak: Anda tidak memiliki wewenang di Kamus Bahan.");
        router.push("/admin/login");
        return;
      }

      setIsViewer(isViewOnly);

      const fetchData = async () => {
        try {
          // Tarik data bahan saat ini DAN seluruh daftar bahan untuk validasi
          const [singleRes, allRes] = await Promise.all([
            fetch(`/api/ingredients/${ingredientId}`),
            fetch("/api/ingredients")
          ]);

          if (singleRes.ok && allRes.ok) {
            const data = await singleRes.json();
            const allData = await allRes.json();
            
            // 1. Set Data Form
            setFormData({
              name: data.name, 
              aliases: data.aliases || "", 
              type: data.type, 
              functionalCategory: data.functionalCategory || "UMUM",
              benefits: data.benefits,
              aiContext: data.aiContext || "",
              comedogenicRating: data.comedogenicRating || 0, 
              safeForPregnancy: data.safeForPregnancy ?? true,
              safeForSensitive: data.safeForSensitive ?? true,
              isKeyActive: data.isKeyActive || false,
              strengthLevel: data.strengthLevel || 1,
              blacklistReason: data.blacklistReason || "",
              isVerified: data.isVerified || false,
            });
            
            if (data.targetFocus) {
              const dbFocuses = data.targetFocus.split(",");
              setFocuses(prev => {
                const newFocuses = { ...prev };
                dbFocuses.forEach((f: string) => {
                  const cleanF = f.trim() as keyof typeof focuses;
                  if (newFocuses[cleanF] !== undefined) newFocuses[cleanF] = true;
                });
                return newFocuses;
              });
            }

            if (data.blacklistedSkinTypes) {
              const dbBlacklists = data.blacklistedSkinTypes.split(",");
              setBlacklistedTypes(prev => {
                const newBlacklists = { ...prev };
                dbBlacklists.forEach((b: string) => {
                  const cleanB = b.trim() as keyof typeof blacklistedTypes;
                  if (newBlacklists[cleanB] !== undefined) newBlacklists[cleanB] = true;
                });
                return newBlacklists;
              });
            }

            // 2. Kumpulkan Semua Nama/Alias untuk Pengecekan Duplikasi (KECUALI bahan ini sendiri)
            let allUsedNames: string[] = [];
            allData.forEach((item: any) => {
              if (item.id !== ingredientId) {
                allUsedNames.push(normalizeString(item.name));
                if (item.aliases) {
                  const itemAliases = item.aliases.split(',').map((a: string) => normalizeString(a));
                  allUsedNames = [...allUsedNames, ...itemAliases];
                }
              }
            });
            setExistingNames(Array.from(new Set(allUsedNames)));

          } else {
            setMessage({ type: "error", text: "Bahan tidak ditemukan." });
          }
        } catch (error) {
          setMessage({ type: "error", text: "Gagal menarik data dari server." });
        } finally {
          setIsFetching(false);
        }
      };
      
      fetchData();

    } catch (error) {
      sessionStorage.clear();
      router.push("/admin/login");
    }
  }, [ingredientId, router]); 

  // LOGIKA VALIDASI NAMA (INCI) DENGAN NORMALISASI
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, name: val });

    if (existingNames.includes(normalizeString(val))) {
      setNameError("⚠️ Nama ini sudah dipakai oleh bahan lain di kamus!");
    } else {
      setNameError("");
    }
  };

  // LOGIKA VALIDASI ALIAS DENGAN NORMALISASI
  const handleAliasesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData({ ...formData, aliases: val });

    if (!val.trim()) {
      setAliasError("");
      return;
    }

    const typedAliases = val.split(',')
      .map(a => normalizeString(a))
      .filter(a => a !== "");
      
    const duplicateAliases = typedAliases.filter(a => existingNames.includes(a));

    if (duplicateAliases.length > 0) {
      setAliasError(`⚠️ Terdapat alias yang menabrak bahan lain.`);
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

    if (isViewer) {
      alert("Mode Pemantau: Anda tidak diizinkan menyimpan perubahan data.");
      return;
    }

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
      const res = await fetch(`/api/ingredients/${ingredientId}`, {
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          ...formData, 
          strengthLevel: finalStrengthLevel,
          blacklistedSkinTypes, 
          targetFocus 
        }),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Bahan berhasil diupdate! Mengalihkan..." });
        setTimeout(() => {
          router.push("/admin/dashboard");
        }, 1000);
      } else {
        const data = await res.json();
        throw new Error(data.message || "Gagal mengupdate data.");
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const hasBlacklist = Object.values(blacklistedTypes).some(Boolean);
  const isToxic = formData.type === "TOXIC";

  if (isFetching) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-bold">Memuat data bahan...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/dashboard" className="text-sm font-bold text-slate-500 hover:text-black transition-colors mb-6 inline-block">
          ← Batal & Kembali
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Edit Bahan ✍️</h1>
          <p className="text-sm text-slate-500 mb-8 font-medium">Arsitektur V3.3: Perbarui data bahan ke versi terbaru (Normalisasi Aktif).</p>

          {isViewer && (
            <div className="p-4 mb-6 rounded-xl text-sm font-bold border bg-purple-50 text-purple-700 border-purple-200 flex items-center gap-2">
              <span>👁️</span> Anda masuk dalam mode Pemantau (Read-Only). Perubahan tidak dapat disimpan.
            </div>
          )}

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
                  disabled={isViewer} 
                  type="text" 
                  value={formData.name} 
                  onChange={handleNameChange} 
                  className={`w-full px-4 py-3 rounded-xl border focus:ring-2 outline-none transition-all text-sm font-medium bg-white disabled:bg-slate-50 disabled:text-slate-500 ${
                    nameError 
                      ? 'border-rose-300 text-rose-900 focus:ring-rose-500 bg-rose-50' 
                      : 'border-slate-200 text-slate-900 focus:ring-blue-600'
                  }`} 
                  title="Peringatan: Hati-hati saat mengubah nama INCI" 
                />
                {nameError && (
                  <p className="text-[11px] font-bold text-rose-600 mt-1 animate-pulse">{nameError}</p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="type" className="text-xs font-bold text-slate-700 uppercase">Sifat Kimia</label>
                <select id="type" value={formData.type} disabled={isViewer} onChange={handleTypeChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 disabled:bg-slate-50 disabled:text-slate-500">
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
                  disabled={formData.type !== "HARSH" && formData.type !== "BUFFER" || isViewer}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value={1}>1 - Rendah/Lembut</option>
                  <option value={2}>2 - Menengah</option>
                  <option value={3}>3 - Sangat Kuat</option>
                </select>
              </div>

              <div className={`space-y-2 ${isToxic ? 'opacity-50' : ''}`}>
                <label htmlFor="functionalCategory" className="text-xs font-bold text-slate-700 uppercase">Fungsi Khusus</label>
                <select 
                  id="functionalCategory" 
                  value={formData.functionalCategory} 
                  onChange={(e) => setFormData({...formData, functionalCategory: e.target.value})} 
                  disabled={isToxic || isViewer}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
              <div className="space-y-2 md:col-span-3">
                <label htmlFor="aliases" className="text-xs font-bold text-slate-700 uppercase">Sinonim / Alias</label>
                <input 
                  id="aliases" 
                  disabled={isViewer} 
                  type="text" 
                  value={formData.aliases} 
                  onChange={handleAliasesChange} 
                  className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-medium focus:ring-2 transition-all disabled:bg-slate-50 disabled:text-slate-500 ${
                    aliasError 
                      ? 'bg-amber-50 border-amber-300 text-amber-900 focus:ring-amber-500' 
                      : 'bg-white border-slate-200 text-slate-900 focus:ring-blue-600'
                  }`} 
                />
                {aliasError && (
                  <p className="text-[11px] font-bold text-amber-600 mt-1 animate-pulse">{aliasError}</p>
                )}
              </div>
              <div className={`md:col-span-1 pt-4 ${isToxic ? 'opacity-50 pointer-events-none' : ''}`}>
                <label className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isToxic ? 'bg-slate-100 border-slate-200' : 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100 cursor-pointer'}`}>
                  <input type="checkbox" checked={formData.isKeyActive} disabled={isToxic || isViewer} onChange={(e) => setFormData({...formData, isKeyActive: e.target.checked})} className="w-5 h-5 accent-yellow-600 disabled:cursor-not-allowed" />
                  <span className={`text-sm font-bold ${isToxic ? 'text-slate-400' : 'text-yellow-800'}`}>⭐ Bahan Aktif Utama</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <label htmlFor="benefits" className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                  <span>📱</span> {isToxic ? "Alasan Berbahaya (Singkat)" : "Manfaat Singkat (Untuk Pengguna)"} <span className="text-rose-500">*</span>
                </label>
                <textarea id="benefits" disabled={isViewer} required rows={2} value={formData.benefits} onChange={(e) => setFormData({...formData, benefits: e.target.value})} className={`w-full px-4 py-3 rounded-xl border outline-none text-sm font-medium resize-none focus:ring-2 bg-white disabled:bg-slate-100 disabled:text-slate-500 ${isToxic ? 'border-rose-200 text-rose-900 focus:ring-rose-500' : 'border-slate-200 text-slate-900 focus:ring-blue-600'}`} />
              </div>

              <div className="space-y-2">
                <label htmlFor="aiContext" className="text-xs font-bold text-purple-700 uppercase flex items-center gap-2">
                  <span>🤖</span> Analisis Mendalam (Khusus Mesin AI) <span className="text-slate-400 font-normal lowercase tracking-normal">(Opsional)</span>
                </label>
                <textarea id="aiContext" disabled={isViewer} rows={3} value={formData.aiContext} onChange={(e) => setFormData({...formData, aiContext: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-purple-200 outline-none text-sm font-medium resize-none focus:ring-2 focus:ring-purple-500 bg-purple-50/30 text-purple-950 disabled:opacity-70 disabled:cursor-not-allowed" />
              </div>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 pb-6 border-b border-slate-100 ${isToxic ? 'opacity-50' : ''}`}>
              <div className="space-y-2">
                <label htmlFor="comedogenicRating" className="text-xs font-bold text-slate-700 uppercase">Komedogenik (0-5)</label>
                <input id="comedogenicRating" type="number" min="0" max="5" disabled={isToxic || isViewer} value={formData.comedogenicRating} onChange={(e) => setFormData({...formData, comedogenicRating: parseInt(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
              </div>
              <div className={`flex items-center gap-2 pt-6 ${isToxic || isViewer ? 'pointer-events-none' : 'cursor-pointer'}`}>
                <input type="checkbox" id="preg" checked={formData.safeForPregnancy} disabled={isToxic || isViewer} onChange={(e) => setFormData({...formData, safeForPregnancy: e.target.checked})} className="w-5 h-5 accent-blue-600 disabled:cursor-not-allowed" />
                <label htmlFor="preg" className="text-sm font-bold text-slate-700">Aman Bumil 🤰</label>
              </div>
              <div className={`flex items-center gap-2 pt-6 ${isToxic || isViewer ? 'pointer-events-none' : 'cursor-pointer'}`}>
                <input type="checkbox" id="sens" checked={formData.safeForSensitive} disabled={isToxic || isViewer} onChange={(e) => setFormData({...formData, safeForSensitive: e.target.checked})} className="w-5 h-5 accent-blue-600 disabled:cursor-not-allowed" />
                <label htmlFor="sens" className="text-sm font-bold text-slate-700">Aman Sensitif 🌡️</label>
              </div>
            </div>

            <div className={`space-y-3 ${isToxic ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-xs font-bold text-slate-700 uppercase">Fokus Perawatan (Bisa lebih dari 1)</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {(Object.keys(focuses) as Array<keyof typeof focuses>).map((focus) => (
                  <label key={focus} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isToxic ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer'}`}>
                    <input type="checkbox" disabled={isToxic || isViewer} checked={focuses[focus]} onChange={() => handleFocusChange(focus)} className="w-5 h-5 accent-blue-600 disabled:cursor-not-allowed" />
                    <span className={`text-sm font-bold ${isToxic ? 'text-slate-400' : 'text-slate-800'}`}>{focus}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className={`space-y-3 pt-6 border-t border-slate-100 ${isToxic ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="text-xs font-black text-red-600 uppercase flex items-center gap-2">
                🚫 Dilarang Keras Untuk (Blacklist Mutlak)
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(Object.keys(blacklistedTypes) as Array<keyof typeof blacklistedTypes>).map((type) => (
                  <label key={type} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isToxic ? 'bg-slate-100 border-slate-200' : blacklistedTypes[type] ? 'bg-red-50 border-red-300 cursor-pointer' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer'}`}>
                    <input type="checkbox" disabled={isToxic || isViewer} checked={blacklistedTypes[type]} onChange={() => handleBlacklistChange(type)} className="w-5 h-5 accent-red-600 disabled:cursor-not-allowed" />
                    <span className={`text-sm font-bold ${isToxic ? 'text-slate-400' : blacklistedTypes[type] ? 'text-red-700' : 'text-slate-700'}`}>{type}</span>
                  </label>
                ))}
              </div>
              
              {hasBlacklist && !isToxic && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="pt-3">
                  <label htmlFor="blacklistReason" className="sr-only">Alasan Blacklist</label>
                  <textarea id="blacklistReason" required disabled={isViewer} rows={2} value={formData.blacklistReason} onChange={(e) => setFormData({...formData, blacklistReason: e.target.value})} className="w-full px-4 py-3 rounded-xl border-2 border-red-200 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none text-sm font-medium resize-none bg-red-50 text-red-900 disabled:opacity-70 disabled:cursor-not-allowed" />
                </motion.div>
              )}
            </div>

            <div className={`pt-6 border-t border-slate-100 ${isViewer ? 'pointer-events-none opacity-80' : ''}`}>
              <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${formData.isVerified ? 'bg-emerald-50 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${formData.isVerified ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-300'}`}>
                  {formData.isVerified && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
                <div>
                  <span className={`block text-base font-black ${formData.isVerified ? 'text-emerald-800' : 'text-slate-700'}`}>
                    Tandai Bahan Ini Sebagai Terverifikasi ✅
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    Bahan yang terverifikasi akan ditandai hijau di dasbor utama dan siap digunakan oleh mesin AI.
                  </span>
                </div>
                <input type="checkbox" disabled={isViewer} className="hidden" checked={formData.isVerified} onChange={(e) => setFormData({...formData, isVerified: e.target.checked})} />
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isLoading || isViewer || nameError !== "" || aliasError !== ""} 
              className={`w-full py-4 mt-4 font-bold rounded-2xl transition-all active:scale-95 disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed shadow-md text-lg ${isToxic ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
            >
              {isLoading ? "Menyimpan..." : isViewer ? "Hanya Pantau (Read-Only) 👁️" : isToxic ? "Simpan Bahan Berbahaya 🚨" : "Simpan Perubahan 💾"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}