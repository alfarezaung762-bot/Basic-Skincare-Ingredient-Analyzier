"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import AdminHeader from "@/components/admin/AdminHeader";
import { AccessDeniedModal } from "@/components/admin/AccessDeniedModal";

export default function PusatAIPage() {
  const router = useRouter();

  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [prioritizedSources, setPrioritizedSources] = useState({
    komedogenik: { sumber: "INCIDecoder, CosDNA, Jurnal Sinta 1", izinkanLuar: false },
    sifatKimia: { sumber: "CIR, SCCS, CosIng", izinkanLuar: false },
    levelKekuatan: { sumber: "FDA OTC, PubMed, Pedoman Klinis", izinkanLuar: false },
    fungsiKhusus: { sumber: "PCPC wINCI Dictionary, UL Prospector", izinkanLuar: false },
    amanBumilSensitif: { sumber: "ACOG, NEA, CIR", izinkanLuar: false },
    bahanAktif: { sumber: "FDA OTC Drug Monographs", izinkanLuar: false },
    fokusPerawatan: { sumber: "SkinSort, INCIDecoder", izinkanLuar: false },
    dilarangKeras: { sumber: "AcneClinicNYC, Harry's Cosmeticology", izinkanLuar: false },
    analisisMendalam: { sumber: "PubMed, JCAD", izinkanLuar: false },
    manfaatSingkat: { sumber: "Paula's Choice Ingredient Dictionary", izinkanLuar: true }
  });
  const [systemPrompt, setSystemPrompt] = useState("");

  // AI Hybrid Tab 2 State
  const [activeTab, setActiveTab] = useState<"research" | "hybrid">("research");
  const [hybridPrompt, setHybridPrompt] = useState("Anda adalah seorang Konsultan Dermatologi Kosmetik kelas dunia dan Ahli Formulasi (Cosmetic Chemist). Tugas Anda adalah menganalisis interaksi antar bahan dalam formulasi skincare dan memberikan penilaian profesional yang mudah dipahami orang awam.");
  const [hybridModels, setHybridModels] = useState("gemma-4-31b-it, gemma-4-26b-a4b-it, gemini-3.1-flash-lite-preview, gemini-3.1-flash-preview, gemini-2.5-flash");
  const [hybridUseExternal, setHybridUseExternal] = useState(false);
  const [hybridReferences, setHybridReferences] = useState("CIR (Cosmetic Ingredient Review), PubChem, JCAD, Paula's Choice Ingredient Dictionary, SkinSort, SCCS");

  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");

    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    try {
      const profile = JSON.parse(profileString);
      setAdminName(profile.username || "Admin");
      setAdminRole(profile.role || "STAFF");
      const superAdminCheck = profile.role === "SUPERADMIN";
      const isAdmin = profile.role === "ADMIN";

      if (!superAdminCheck && !isAdmin) {
        setAccessDeniedMessage("Anda tidak memiliki wewenang untuk mengakses Pusat AI.");
        return;
      }

      setIsSuperAdmin(superAdminCheck);
      setIsAuthorized(true);

      fetchConfig();

    } catch (error) {
      sessionStorage.clear();
      router.push("/admin/login");
    }
  }, [router]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/deep-research/ai-config");
      if (res.ok) {
        const data = await res.json();
        try {
          if (data.prioritizedSources) {
            const parsed = JSON.parse(data.prioritizedSources);
            
            // Helper untuk mengekstrak data JSON yang berpotensi berupa string lama atau object baru
            const parseSource = (key: string, defaultSumber: string, defaultLuar: boolean) => {
              const val = parsed[key];
              if (val && typeof val === 'object') {
                return { sumber: val.sumber || defaultSumber, izinkanLuar: val.izinkanLuar ?? defaultLuar };
              } else if (typeof val === 'string') {
                return { sumber: val, izinkanLuar: defaultLuar };
              }
              return { sumber: defaultSumber, izinkanLuar: defaultLuar };
            };

            setPrioritizedSources({
              komedogenik: parseSource('komedogenik', "INCIDecoder, CosDNA, Jurnal Sinta 1", false),
              sifatKimia: parseSource('sifatKimia', "CIR, SCCS, CosIng", false),
              levelKekuatan: parseSource('levelKekuatan', "FDA OTC, PubMed, Pedoman Klinis", false),
              fungsiKhusus: parseSource('fungsiKhusus', "PCPC wINCI Dictionary, UL Prospector", false),
              amanBumilSensitif: parseSource('amanBumilSensitif', "ACOG, NEA, CIR", false),
              bahanAktif: parseSource('bahanAktif', "FDA OTC Drug Monographs", false),
              fokusPerawatan: parseSource('fokusPerawatan', "SkinSort, INCIDecoder", false),
              dilarangKeras: parseSource('dilarangKeras', "AcneClinicNYC, Harry's Cosmeticology", false),
              analisisMendalam: parseSource('analisisMendalam', "PubMed, JCAD", false),
              manfaatSingkat: parseSource('manfaatSingkat', "Paula's Choice Ingredient Dictionary", true)
            });
          }
        } catch (e) {
          // Fallback if older text format
        }
        setSystemPrompt(data.systemPrompt || "");

        // Load AI Hybrid config
        if (data.aihybridPromptingredient) setHybridPrompt(data.aihybridPromptingredient);
        if (data.aihybridModelPriority) {
          try {
            const models = JSON.parse(data.aihybridModelPriority);
            if (Array.isArray(models)) setHybridModels(models.join(", "));
          } catch { /* keep default */ }
        }
        if (typeof data.aihybridUseExternalSources === 'boolean') setHybridUseExternal(data.aihybridUseExternalSources);
        if (data.aihybridReferenceSources) setHybridReferences(data.aihybridReferenceSources);
      }
    } catch (error) {
      console.error("Failed to fetch AI config", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/deep-research/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prioritizedSources: JSON.stringify(prioritizedSources),
          systemPrompt,
          aihybridPromptingredient: hybridPrompt,
          aihybridModelPriority: JSON.stringify(hybridModels.split(',').map(m => m.trim()).filter(Boolean)),
          aihybridUseExternalSources: hybridUseExternal,
          aihybridReferenceSources: hybridReferences,
        }),
      });

      if (res.ok) {
        alert("Konfigurasi AI berhasil disimpan!");
      } else {
        alert("Gagal menyimpan konfigurasi.");
      }
    } catch (error) {
      console.error("Error saving config", error);
      alert("Terjadi kesalahan.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  if (accessDeniedMessage) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <AccessDeniedModal isOpen={true} message={accessDeniedMessage} onClose={() => router.push("/admin/login")} />
      </div>
    );
  }

  if (!isAuthorized || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden p-4 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <AdminHeader 
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          title="Pusat AI (Command Center)"
          subtitle="Atur parameter dan perilaku asisten AI untuk deep research bahan skincare."
        />

        {/* Menu Navigasi Utama */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="flex flex-nowrap overflow-x-auto gap-2 pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:overflow-visible md:flex-wrap md:pb-0 custom-scrollbar">
          <Link href="/admin/dashboard" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            <span>📚 Kamus Bahan Utama</span>
          </Link>
          <Link href="/admin/reportbahan" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            <span>❓ Pusat Tinjauan</span>
          </Link>
          <Link href="/admin/products" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            <span>🛒 Katalog Produk</span>
          </Link>
          <Link href="/admin/products/review" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white">
            <span>⭐ Moderasi Ulasan</span>
          </Link>

          {/* PERENDERAN BERSYARAT: Tombol Manajemen Banner (Hanya Admin dengan Izin / Superadmin) */}
          {(isSuperAdmin || (adminRole === "ADMIN" && sessionStorage.getItem("adminProfile")?.includes("MANAGE_BENNER"))) && (
            <Link href="/admin/benner" className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50">
              <span>🖼️ Kelola Banner</span>
            </Link>
          )}

          <div className="shrink-0 px-5 py-2.5 font-bold text-sm rounded-lg transition-all flex items-center gap-2 bg-emerald-900 text-white shadow-md cursor-default">
             <span>🧠 Pusat AI</span>
          </div>
        </motion.div>

        {/* TAB SWITCH */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("research")}
            className={`flex-1 px-5 py-3 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'research' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            🔬 Deep Research
          </button>
          <button
            onClick={() => setActiveTab("hybrid")}
            className={`flex-1 px-5 py-3 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${activeTab === 'hybrid' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            🧠 AI Hybrid Analyzer
          </button>
        </div>

        {/* TAB 1: DEEP RESEARCH (EXISTING) */}
        {activeTab === "research" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6"
        >
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            ⚙️ Konfigurasi Utama AI
          </h2>



          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">
                Sumber Prioritas Spesifik (Pisahkan dengan koma)
              </label>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries({
                  komedogenik: "Komedogenik (0-5)",
                  sifatKimia: "Sifat Kimia",
                  levelKekuatan: "Level Kekuatan (1-3)",
                  fungsiKhusus: "Fungsi Khusus",
                  amanBumilSensitif: "Aman Bumil & Sensitif",
                  bahanAktif: "Bahan Aktif (Key Active)",
                  fokusPerawatan: "Fokus Perawatan",
                  dilarangKeras: "Dilarang Keras (Blacklist)",
                  analisisMendalam: "Analisis Mendalam (AI Context)",
                  manfaatSingkat: "Manfaat Singkat (User Awam)"
                }).map(([key, label]) => (
                  <div key={key} className="flex flex-col md:flex-row md:items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                      <input
                        type="text"
                        value={(prioritizedSources as any)[key].sumber}
                        onChange={(e) => setPrioritizedSources(prev => ({ ...prev, [key]: { ...(prev as any)[key], sumber: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: PubMed, EWG"
                      />
                    </div>
                    <label className="flex items-center gap-2 pt-0 md:pt-5 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={(prioritizedSources as any)[key].izinkanLuar}
                        onChange={(e) => setPrioritizedSources(prev => ({ ...prev, [key]: { ...(prev as any)[key], izinkanLuar: e.target.checked } }))}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Izinkan luar sumber</span>
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">
                * Jika kolom dikosongkan, AI akan dipaksa mencari ke literatur medis/Jurnal Sinta 1 sebagai cadangan. Jika tetap tidak ada, AI dilarang berhalusinasi dan pencarian akan digagalkan.
              </p>
            </div>



            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                System Prompt (Aturan Super Ketat)
              </label>
              <div className="mb-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                  💡 <strong>Info:</strong> Gunakan tag <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200">{"{{ATURAN_SISTEM}}"}</code> di dalam prompt. Backend akan otomatis menggantinya dengan parameter dari <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200">scoringEngine.ts</code> saat request ke AI.
                </p>
              </div>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-64 custom-scrollbar font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <span>💾</span> Simpan Konfigurasi
                </>
              )}
            </button>
          </div>

        </motion.div>
        )}

        {/* TAB 2: AI HYBRID ANALYZER */}
        {activeTab === "hybrid" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-indigo-200 dark:border-indigo-800/50 space-y-6"
        >
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            🧠 Konfigurasi AI Hybrid Analyzer
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium -mt-3">
            Mengatur perilaku AI saat menganalisis interaksi antar bahan dalam formulasi skincare.
          </p>

          <div className="space-y-6">
            {/* 1. Prompt Identitas AI (Editable) */}
            <div>
              <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                ✏️ Prompt Identitas AI (Editable)
              </label>
              <textarea
                value={hybridPrompt}
                onChange={(e) => setHybridPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-32 custom-scrollbar text-sm"
                placeholder="Anda adalah seorang Konsultan Dermatologi..."
              />
            </div>

            {/* 2. Aturan Perilaku (LOCKED — Read-only) */}
            <div className="bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-300 dark:border-slate-600">
              <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                🔒 Aturan Perilaku Sistem (Dikunci Permanen)
              </label>
              <div className="text-xs text-slate-500 dark:text-slate-400 italic leading-relaxed font-mono bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <p>• AI HANYA bisa MENGURANGI/MENETRALISIR penalti (maks 50 poin per item)</p>
                <p>• AI TIDAK bisa menambah skor atau memberikan bonus positif</p>
                <p>• Penalti MUTLAK (Toksik, Hamil, Alergi, Tanpa UV) TIDAK bisa disentuh</p>
                <p>• Bahan tanpa aiContext + sumber luar OFF = AI dilarang menyesuaikan</p>
                <p>• Output WAJIB bahasa Indonesia, DILARANG menyebutkan angka skor</p>
                <p>• AI wajib mempertimbangkan urutan bahan (konsentrasi tinggi → rendah)</p>
              </div>
            </div>

            {/* 3. Sumber Referensi (Editable + Toggle) */}
            <div>
              <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2">
                📖 Sumber Referensi Formulasi
              </label>
              <div className="flex items-center gap-3 mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hybridUseExternal}
                    onChange={(e) => setHybridUseExternal(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <span className={`text-sm font-bold ${hybridUseExternal ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {hybridUseExternal ? '🟢 AI boleh merujuk sumber luar' : '🔴 AI hanya pakai database (aiContext)'}
                  </span>
                </label>
              </div>
              {hybridUseExternal && (
                <textarea
                  value={hybridReferences}
                  onChange={(e) => setHybridReferences(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-20 text-sm"
                  placeholder="CIR, PubChem, JCAD, Paula's Choice..."
                />
              )}
            </div>

            {/* 4. Model AI Prioritas (Editable) */}
            <div>
              <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2">
                🤖 Urutan Model AI (Fallback Cascade)
              </label>
              <textarea
                value={hybridModels}
                onChange={(e) => setHybridModels(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-20 font-mono text-sm"
                placeholder="gemma-4-31b-it, gemini-2.5-flash, ..."
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Pisahkan dengan koma. Model pertama akan dicoba terlebih dahulu. Jika gagal, lanjut ke berikutnya.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-indigo-100 dark:border-indigo-800/30">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <span>💾</span> Simpan Konfigurasi Hybrid
                </>
              )}
            </button>
          </div>

        </motion.div>
        )}

      </div>
    </div>
  );
}
