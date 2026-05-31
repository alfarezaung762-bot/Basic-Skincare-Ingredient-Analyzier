"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Reorder } from "framer-motion";
import AdminHeader from "@/components/admin/AdminHeader";
import { AccessDeniedModal } from "@/components/admin/AccessDeniedModal";

const DEFAULT_SYSTEM_PROMPT = `Kamu adalah Senior Raw Material Chemist dan Principal Skincare Formulator. Keahlian mutlakmu adalah biokimia kosmetik tingkat seluler (molekul, pH, penetrasi stratum corneum, dan profil interaksi senyawa). Kamu TIDAK merespons layaknya asisten virtual atau beauty blogger, melainkan murni sebagai ilmuwan laboratorium yang berpegang teguh pada Evidence-Based Medicine (EBM) dan literatur dermatologi terverifikasi.

Data JSON yang kamu hasilkan BUKAN sekadar teks bacaan, melainkan PARAMETER MATEMATIS yang akan dieksekusi langsung oleh "Scoring Engine" TypeScript kami. 
Pahami implikasi logikamu sebelum menghasilkan data:
- Salah menentukan "type" (misal: melabeli AHA/BHA sebagai BASIC alih-alih HARSH) akan membutakan engine dan merusak kalkulasi "Toxicity & Irritation Load" pengguna.
- Salah memberi nilai "comedogenicRating" ≥ 3 pada bahan yang sebenarnya aman akan memicu "Match Penalty" palsu bagi kulit rentan jerawat.
- Memberi "functionalCategory" UMUM pada bahan yang terbukti PELEMBAP_OKLUSIF akan membahayakan pengguna, karena engine gagal memblokir bahan pekat tersebut dari profil kulit berjerawat parah.
Tugasmu adalah membedah bahan secara brutal, objektif, dan membongkar klaim "marketing pabrik" yang tidak berdasar sains klinis.

ATURAN SISTEM SAAT INI:
{{ATURAN_SISTEM}}

[PROTOKOL KODE MERAH: ANTI-HALUSINASI & KEAMANAN SISTEM]
1. ZERO HALLUCINATION: Jika data klinis suatu bahan spesifik (terutama ekstrak tanaman eksotis) tidak ditemukan di jurnal referensi, JANGAN pernah mengarang manfaat. Tetapkan "type" sebagai BASIC, "functionalCategory" sebagai UMUM
2. VALIDASI TOKSIKOLOGI KETAT: Parameter "safeForPregnancy", "safeForSensitive", dan "blacklistedSkinTypes" memicu penalti skor keselamatan secara mutlak (-50 hingga -100 poin). Jangan mem-blacklist tipe kulit hanya berdasarkan asumsi; gunakan murni referensi medis nyata.
3. KEPATUHAN JSON MURNI: Output-mu HARUS berupa satu objek JSON mentah yang siap di-parse oleh sistem. DILARANG KERAS menyertakan tag markdown (seperti \`\`\`json), prolog, epilog, penjelasan, atau komentar anya di luar kurung kurawal { }.`;

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
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [promptMode, setPromptMode] = useState<'default' | 'custom'>('default');

  // AI Hybrid Tab 2 State
  const [activeTab, setActiveTab] = useState<"research" | "hybrid">("research");
  const [hybridPrompt, setHybridPrompt] = useState("Anda adalah seorang Konsultan Dermatologi Kosmetik kelas dunia dan Ahli Formulasi (Cosmetic Chemist). Tugas Anda adalah menganalisis interaksi antar bahan dalam formulasi skincare dan memberikan penilaian profesional yang mudah dipahami orang awam.");
  interface ModelConfig {
    provider: "gemini" | "byteplus" | "openrouter";
    model: string;
    label?: string;
    useReasoning?: boolean;
  }

  const [hybridModels, setHybridModels] = useState<ModelConfig[]>([
    { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { provider: "byteplus", model: "ep-20260505074455-nplpn", label: "DeepSeek-V3.2" },
    { provider: "gemini", model: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }
  ]);
  const [newModelConfig, setNewModelConfig] = useState<ModelConfig>({ provider: "gemini", model: "", label: "" });
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
        
        const fetchedPrompt = data.systemPrompt || "";
        if (fetchedPrompt.trim() !== "" && fetchedPrompt.trim() !== DEFAULT_SYSTEM_PROMPT.trim()) {
          setPromptMode('custom');
          setSystemPrompt(fetchedPrompt);
        } else {
          setPromptMode('default');
          setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        }

        // Load AI Hybrid config
        if (data.aihybridPromptingredient) setHybridPrompt(data.aihybridPromptingredient);
        if (data.aihybridModelPriority) {
          try {
            const models = JSON.parse(data.aihybridModelPriority);
            if (Array.isArray(models) && models.length > 0) {
              if (typeof models[0] === 'string') {
                setHybridModels(models.map((m: string) => ({ provider: "gemini", model: m })));
              } else {
                setHybridModels(models);
              }
            }
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
          aihybridModelPriority: JSON.stringify(hybridModels),
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

              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <input 
                    type="radio" 
                    name="promptMode" 
                    checked={promptMode === 'default'} 
                    onChange={() => {
                      setPromptMode('default');
                      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
                    }} 
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" 
                  />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Gunakan Bawaan Sistem (Aman)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <input 
                    type="radio" 
                    name="promptMode" 
                    checked={promptMode === 'custom'} 
                    onChange={() => setPromptMode('custom')} 
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500" 
                  />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Modifikasi Manual (Expert)</span>
                </label>
              </div>

              {promptMode === 'custom' ? (
                <>
                  <div className="mb-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg">
                    <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
                      ⚠️ <strong>Peringatan:</strong> Pastikan Anda tetap menaruh tag <code className="bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded text-amber-900 dark:text-amber-200">{"{{ATURAN_SISTEM}}"}</code> di dalam prompt agar logika engine tetap berjalan.
                    </p>
                  </div>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-64 custom-scrollbar font-mono text-sm"
                  />
                </>
              ) : (
                <div className="relative">
                  <textarea
                    value={systemPrompt}
                    readOnly
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 outline-none h-64 custom-scrollbar font-mono text-sm cursor-not-allowed"
                  />
                  <div className="absolute inset-0 z-10 pointer-events-auto" title="Ubah mode ke Modifikasi Manual untuk mengedit"></div>
                </div>
              )}
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

            {/* 4. Model AI Prioritas (Editable & Sortable) */}
            <div>
              <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2">
                🤖 Urutan Model AI (Fallback Cascade)
              </label>
              
              <Reorder.Group axis="y" values={hybridModels} onReorder={setHybridModels} className="space-y-3 mb-6">
                {hybridModels.map((item, idx) => (
                  <Reorder.Item 
                    key={`${item.provider}-${item.model}`} 
                    value={item} 
                    className="group flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-grab active:cursor-grabbing relative"
                  >
                    {/* Urutan Controls: Drag Handle */}
                    <div className="flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-700 pr-3 shrink-0 text-slate-300 hover:text-slate-500 transition-colors" title="Tahan dan geser untuk mengurutkan">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full text-xs font-bold">
                        {hybridModels.indexOf(item) + 1}
                      </span>
                      <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded ${item.provider === 'gemini' ? 'bg-emerald-100 text-emerald-700' : item.provider === 'byteplus' ? 'bg-blue-100 text-blue-700' : item.provider === 'openrouter' ? 'bg-orange-100 text-orange-700' : 'bg-purple-100 text-purple-700'}`}>
                        {item.provider.toUpperCase()}
                      </span>
                      {item.provider === 'openrouter' && (
                        <label className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                          <input 
                            type="checkbox" 
                            checked={item.useReasoning || false}
                            onChange={(e) => {
                              const newArr = [...hybridModels];
                              const currentIdx = hybridModels.indexOf(item);
                              newArr[currentIdx] = { ...item, useReasoning: e.target.checked };
                              setHybridModels(newArr);
                            }}
                            className="w-3 h-3 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 select-none">
                            🧠 Reasoning
                          </span>
                        </label>
                      )}
                      <div className="flex flex-col truncate">
                        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.model}</span>
                        {item.label && <span className="text-xs text-slate-500 truncate">{item.label}</span>}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {hybridModels.indexOf(item) !== 0 && (
                        <button 
                          onClick={() => {
                            const currentIdx = hybridModels.indexOf(item);
                            const newArr = [...hybridModels];
                            newArr.splice(currentIdx, 1);
                            newArr.unshift(item);
                            setHybridModels(newArr);
                          }}
                          className="shrink-0 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                          title="Pindahkan ke Paling Atas"
                        >
                          ↑ Puncak
                        </button>
                      )}
                      {hybridModels.indexOf(item) !== hybridModels.length - 1 && (
                        <button 
                          onClick={() => {
                            const currentIdx = hybridModels.indexOf(item);
                            const newArr = [...hybridModels];
                            newArr.splice(currentIdx, 1);
                            newArr.push(item);
                            setHybridModels(newArr);
                          }}
                          className="shrink-0 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-md transition-colors"
                          title="Pindahkan ke Paling Bawah"
                        >
                          ↓ Dasar
                        </button>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => setHybridModels(hybridModels.filter((_, i) => i !== hybridModels.indexOf(item)))}
                      className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Hapus Model"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {/* Form Tambah Model */}
              <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/30">
                <p className="text-sm font-bold text-indigo-800 dark:text-indigo-300 mb-3 flex items-center gap-2">
                  <span>➕</span> Tambah Model Baru
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
                  <div className="sm:col-span-3">
                    <select 
                      value={newModelConfig.provider}
                      onChange={(e) => setNewModelConfig({...newModelConfig, provider: e.target.value as any})}
                      className="w-full px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-sm outline-none"
                    >
                      <option value="gemini">Gemini</option>
                      <option value="byteplus">BytePlus (OpenAI)</option>
                      <option value="openrouter">OpenRouter</option>
                    </select>
                  </div>
                  <div className="sm:col-span-5 relative group">
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 dark:text-indigo-500 cursor-help flex items-center justify-center w-5 h-5 rounded-full border border-indigo-200 dark:border-indigo-700 text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 transition-colors">
                      ?
                    </div>
                    {/* Tooltip Hover */}
                    <div className="absolute opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-[11px] p-2.5 rounded-lg shadow-xl text-center font-medium leading-relaxed">
                      {newModelConfig.provider === 'gemini' && "Masukkan versi model Gemini. Contoh: gemini-3.1-flash-lite-preview"}
                      {newModelConfig.provider === 'byteplus' && "Masukkan Endpoint ID dari dasbor Ark, berawalan 'ep-'. Contoh: ep-20260505-nplpn"}
                      {newModelConfig.provider === 'openrouter' && "Masukkan format 'developer/nama-model' sesuai situs OpenRouter. Contoh: anthropic/claude-3.5-sonnet"}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                    </div>

                    <input 
                      type="text" 
                      placeholder={newModelConfig.provider === 'gemini' ? "e.g. gemini-3.1-flash" : newModelConfig.provider === 'byteplus' ? "e.g. ep-202605..." : "e.g. anthropic/claude-3"}
                      value={newModelConfig.model}
                      onChange={(e) => setNewModelConfig({...newModelConfig, model: e.target.value})}
                      className="w-full pl-3 pr-9 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input 
                      type="text" 
                      placeholder="Label (Opsional)" 
                      value={newModelConfig.label}
                      onChange={(e) => setNewModelConfig({...newModelConfig, label: e.target.value})}
                      className="w-full px-3 py-2 rounded-lg border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-slate-800 text-sm outline-none"
                    />
                  </div>
                </div>

                {newModelConfig.provider === 'openrouter' && (
                  <div className="mb-4 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-indigo-600 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={newModelConfig.useReasoning || false}
                        onChange={(e) => setNewModelConfig({...newModelConfig, useReasoning: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      />
                      🧠 Gunakan Mode Reasoning (Khusus OpenRouter)
                    </label>
                  </div>
                )}

                <button 
                  onClick={() => {
                    if (!newModelConfig.model.trim()) return alert("Model ID harus diisi!");
                    setHybridModels([...hybridModels, { ...newModelConfig }]);
                    setNewModelConfig({ provider: "gemini", model: "", label: "" });
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-sm rounded-lg transition-colors w-full sm:w-auto"
                >
                  Tambahkan ke Antrean
                </button>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                Model pertama (nomor 1) akan dicoba terlebih dahulu. Jika mengalami limit/error, sistem akan otomatis beralih (fallback) ke model nomor 2, dan seterusnya.
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
