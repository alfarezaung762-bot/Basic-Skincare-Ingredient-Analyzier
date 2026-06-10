"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
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
3. KEPATUHAN JSON MURNI: Output-mu HARUS berupa satu objek JSON mentah yang siap di-parse oleh sistem. DILARANG KERAS menyertakan tag markdown (seperti \\\`\\\`\\\`json), prolog, epilog, penjelasan, atau komentar anya di luar kurung kurawal { }.`;

export default function DeepResearchConfigPage() {
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

  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    if (!profileString) { router.push("/admin/login"); return; }
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
    } catch { sessionStorage.clear(); router.push("/admin/login"); }
  }, [router]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/admin/deep-research/ai-config");
      if (res.ok) {
        const data = await res.json();
        try {
          if (data.prioritizedSources) {
            const parsed = JSON.parse(data.prioritizedSources);
            const parseSource = (key: string, defaultSumber: string, defaultLuar: boolean) => {
              const val = parsed[key];
              if (val && typeof val === 'object') return { sumber: val.sumber || defaultSumber, izinkanLuar: val.izinkanLuar ?? defaultLuar };
              if (typeof val === 'string') return { sumber: val, izinkanLuar: defaultLuar };
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
        } catch { /* fallback */ }

        const fetchedPrompt = data.systemPrompt || "";
        if (fetchedPrompt.trim() !== "" && fetchedPrompt.trim() !== DEFAULT_SYSTEM_PROMPT.trim()) {
          setPromptMode('custom');
          setSystemPrompt(fetchedPrompt);
        } else {
          setPromptMode('default');
          setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
        }
      }
    } catch (error) { console.error("Failed to fetch AI config", error); }
    finally { setIsLoading(false); }
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
        }),
      });
      if (res.ok) alert("Konfigurasi Deep Research berhasil disimpan!");
      else alert("Gagal menyimpan konfigurasi.");
    } catch (error) { console.error("Error saving config", error); alert("Terjadi kesalahan."); }
    finally { setIsSaving(false); }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("isAdminAuth");
    sessionStorage.removeItem("adminProfile");
    router.push("/admin/login");
  };

  if (accessDeniedMessage) return (<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><AccessDeniedModal isOpen={true} message={accessDeniedMessage} onClose={() => router.push("/admin/login")} /></div>);
  if (!isAuthorized || isLoading) return (<div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-emerald-600 rounded-full animate-spin"></div></div>);

  const SOURCE_LABELS: Record<string, string> = {
    komedogenik: "Komedogenik (0-5)", sifatKimia: "Sifat Kimia", levelKekuatan: "Level Kekuatan (1-3)",
    fungsiKhusus: "Fungsi Khusus", amanBumilSensitif: "Aman Bumil & Sensitif", bahanAktif: "Bahan Aktif (Key Active)",
    fokusPerawatan: "Fokus Perawatan", dilarangKeras: "Dilarang Keras (Blacklist)", analisisMendalam: "Analisis Mendalam (AI Context)",
    manfaatSingkat: "Manfaat Singkat (User Awam)"
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative overflow-hidden p-4 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        <AdminHeader adminName={adminName} adminRole={adminRole} onLogout={handleLogout} title="Deep Research" subtitle="Konfigurasi riset bahan skincare menggunakan AI." />

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm">
          <Link href="/admin/pusat-ai" className="text-emerald-600 dark:text-emerald-400 hover:underline font-bold">← Pusat AI</Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 dark:text-slate-300 font-bold">🔬 Deep Research</span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">⚙️ Konfigurasi Utama AI</h2>

          <div className="space-y-4">
            {/* Sumber Prioritas */}
            <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Sumber Prioritas Spesifik (Pisahkan dengan koma)</label>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(SOURCE_LABELS).map(([key, label]) => (
                  <div key={key} className="flex flex-col md:flex-row md:items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                      <input type="text" value={(prioritizedSources as any)[key].sumber}
                        onChange={(e) => setPrioritizedSources(prev => ({ ...prev, [key]: { ...(prev as any)[key], sumber: e.target.value } }))}
                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                        placeholder="Contoh: PubMed, EWG" />
                    </div>
                    <label className="flex items-center gap-2 pt-0 md:pt-5 cursor-pointer shrink-0">
                      <input type="checkbox" checked={(prioritizedSources as any)[key].izinkanLuar}
                        onChange={(e) => setPrioritizedSources(prev => ({ ...prev, [key]: { ...(prev as any)[key], izinkanLuar: e.target.checked } }))}
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500" />
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Izinkan luar sumber</span>
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-4">* Jika kolom dikosongkan, AI akan dipaksa mencari ke literatur medis/Jurnal Sinta 1 sebagai cadangan. Jika tetap tidak ada, AI dilarang berhalusinasi dan pencarian akan digagalkan.</p>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">System Prompt (Aturan Super Ketat)</label>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <input type="radio" name="promptMode" checked={promptMode === 'default'} onChange={() => { setPromptMode('default'); setSystemPrompt(DEFAULT_SYSTEM_PROMPT); }} className="w-4 h-4 text-emerald-600 focus:ring-emerald-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Gunakan Bawaan Sistem (Aman)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <input type="radio" name="promptMode" checked={promptMode === 'custom'} onChange={() => setPromptMode('custom')} className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
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
                  <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-64 custom-scrollbar font-mono text-sm" />
                </>
              ) : (
                <div className="relative">
                  <textarea value={systemPrompt} readOnly className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 outline-none h-64 custom-scrollbar font-mono text-sm cursor-not-allowed" />
                  <div className="absolute inset-0 z-10 pointer-events-auto" title="Ubah mode ke Modifikasi Manual untuk mengedit"></div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
            <button onClick={handleSave} disabled={isSaving}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2">
              {isSaving ? (<><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>Menyimpan...</>) : (<><span>💾</span> Simpan Konfigurasi</>)}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
