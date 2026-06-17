"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Reorder } from "framer-motion";
import AdminHeader from "@/components/admin/AdminHeader";
import { AccessDeniedModal } from "@/components/admin/AccessDeniedModal";

interface ModelConfig {
  provider: "gemini" | "byteplus" | "openrouter";
  model: string;
  label?: string;
  useReasoning?: boolean;
}

export default function OcrConfigPage() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [ocrPrompt, setOcrPrompt] = useState(
    `Kamu adalah mesin OCR yang mengekstrak daftar bahan (ingredients list) dari foto label produk skincare/kosmetik.

ATURAN:
1. Ekstrak HANYA bagian "Ingredients:" atau "Komposisi:" dari gambar
2. Abaikan nama produk, brand, klaim marketing, barcode, dll
3. Output berupa satu baris teks, setiap bahan dipisahkan koma (,)
4. Pertahankan ejaan INCI asli (jangan terjemahkan ke bahasa Indonesia)
5. Jika ada teks yang terpotong/blur, beri tanda [?] di depan bahan tersebut
6. Jika gambar bukan label bahan kosmetik, kembalikan "ERROR: Gambar bukan label bahan kosmetik"
7. Jika menerima 2 gambar (mode dual/botol melengkung), gabungkan kedua sisi menjadi SATU daftar lengkap tanpa duplikasi

Kembalikan HANYA teks daftar bahan, tanpa penjelasan tambahan.`
  );
  const [ocrModels, setOcrModels] = useState<ModelConfig[]>([
    { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Vision)" },
    { provider: "gemini", model: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Vision)" }
  ]);
  const [newModelConfig, setNewModelConfig] = useState<ModelConfig>({ provider: "gemini", model: "", label: "" });

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
    } catch {
      sessionStorage.clear();
      router.push("/admin/login");
    }
  }, [router]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/analyze/ocrmode");
      if (res.ok) {
        const data = await res.json();
        if (data.ocrPrompt) setOcrPrompt(data.ocrPrompt);
        if (data.ocrModelPriority) {
          try {
            const models = JSON.parse(data.ocrModelPriority);
            if (Array.isArray(models) && models.length > 0) {
              setOcrModels(models);
            }
          } catch {
            /* keep default */
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch OCR config", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/analyze/ocrmode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ocrPrompt,
          ocrModelPriority: JSON.stringify(ocrModels)
        })
      });
      if (res.ok) alert("Konfigurasi OCR AI Vision berhasil disimpan!");
      else alert("Gagal menyimpan konfigurasi.");
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
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-teal-600 rounded-full animate-spin"></div>
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
          title="OCR AI Vision Scanner"
          subtitle="Konfigurasi asisten AI untuk memindai label bahan skincare melalui foto."
        />

        {/* Breadcrumb */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-sm">
          <Link href="/admin/pusat-ai" className="text-teal-600 dark:text-teal-400 hover:underline font-bold">
            ← Pusat AI
          </Link>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600 dark:text-slate-300 font-bold">📷 OCR AI Vision</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl shadow-sm border border-teal-200 dark:border-teal-800/50 space-y-6"
        >
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
            📷 Konfigurasi OCR AI Vision Scanner
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium -mt-3">
            Atur sistem pemindaian gambar label kemasan kosmetik untuk ekstraksi daftar bahan.
          </p>

          <div className="space-y-6">
            {/* 1. Prompt Instruksi OCR */}
            <div>
              <label className="block text-sm font-bold text-teal-700 dark:text-teal-400 mb-2 flex items-center gap-2">
                ✏️ Prompt Instruksi Ekstraksi AI Vision
              </label>
              <textarea
                value={ocrPrompt}
                onChange={(e) => setOcrPrompt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none transition-all h-48 custom-scrollbar text-sm"
                placeholder="Tulis instruksi ekstraksi bahan..."
              />
            </div>

            {/* 2. Model AI Vision Prioritas (Sortable) */}
            <div>
              <label className="block text-sm font-bold text-teal-700 dark:text-teal-400 mb-2">
                🤖 Urutan Model AI Vision (Fallback Cascade)
              </label>
              <Reorder.Group axis="y" values={ocrModels} onReorder={setOcrModels} className="space-y-3 mb-6">
                {ocrModels.map((item, idx) => (
                  <Reorder.Item
                    key={`${item.provider}-${item.model}`}
                    value={item}
                    className="group flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-grab active:cursor-grabbing relative"
                  >
                    {/* Drag Handle */}
                    <div
                      className="flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-700 pr-3 shrink-0 text-slate-300 hover:text-slate-500 transition-colors"
                      title="Tahan dan geser"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <span className="shrink-0 w-6 h-6 flex items-center justify-center bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 rounded-full text-xs font-bold">
                        {ocrModels.indexOf(item) + 1}
                      </span>
                      <span
                        className={`shrink-0 text-xs font-bold px-2 py-1 rounded ${
                          item.provider === "gemini"
                            ? "bg-emerald-100 text-emerald-700"
                            : item.provider === "byteplus"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {item.provider.toUpperCase()}
                      </span>
                      {item.provider === "openrouter" && (
                        <label className="flex items-center gap-1.5 shrink-0 px-2 py-1 rounded-md bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                          <input
                            type="checkbox"
                            checked={item.useReasoning || false}
                            onChange={(e) => {
                              const newArr = [...ocrModels];
                              const ci = ocrModels.indexOf(item);
                              newArr[ci] = { ...item, useReasoning: e.target.checked };
                              setOcrModels(newArr);
                            }}
                            className="w-3 h-3 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                          />
                          <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 select-none">🧠 Reasoning</span>
                        </label>
                      )}
                      <div className="flex flex-col truncate">
                        <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{item.model}</span>
                        {item.label && <span className="text-xs text-slate-500 truncate">{item.label}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {ocrModels.indexOf(item) !== 0 && (
                        <button
                          onClick={() => {
                            const ci = ocrModels.indexOf(item);
                            const a = [...ocrModels];
                            a.splice(ci, 1);
                            a.unshift(item);
                            setOcrModels(a);
                          }}
                          className="shrink-0 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-md transition-colors"
                          title="Pindahkan ke Paling Atas"
                        >
                          ↑ Puncak
                        </button>
                      )}
                      {ocrModels.indexOf(item) !== ocrModels.length - 1 && (
                        <button
                          onClick={() => {
                            const ci = ocrModels.indexOf(item);
                            const a = [...ocrModels];
                            a.splice(ci, 1);
                            a.push(item);
                            setOcrModels(a);
                          }}
                          className="shrink-0 px-2 py-1 text-[10px] font-bold text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 rounded-md transition-colors"
                          title="Pindahkan ke Paling Bawah"
                        >
                          ↓ Dasar
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => setOcrModels(ocrModels.filter((_, i) => i !== ocrModels.indexOf(item)))}
                      className="shrink-0 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      title="Hapus Model"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </Reorder.Item>
                ))}
              </Reorder.Group>

              {/* Form Tambah Model */}
              <div className="bg-teal-50/50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-100 dark:border-teal-800/30">
                <p className="text-sm font-bold text-teal-800 dark:text-teal-300 mb-3 flex items-center gap-2">
                  <span>➕</span> Tambah Model Vision Baru
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3">
                  <div className="sm:col-span-3">
                    <select
                      value={newModelConfig.provider}
                      onChange={(e) => setNewModelConfig({ ...newModelConfig, provider: e.target.value as any })}
                      className="w-full px-3 py-2 rounded-lg border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-sm outline-none"
                    >
                      <option value="gemini">Gemini</option>
                      <option value="byteplus">BytePlus (OpenAI)</option>
                      <option value="openrouter">OpenRouter</option>
                    </select>
                  </div>
                  <div className="sm:col-span-5 relative group">
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-400 dark:text-teal-500 cursor-help flex items-center justify-center w-5 h-5 rounded-full border border-teal-200 dark:border-teal-700 text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-teal-50 hover:text-teal-600 transition-colors">
                      ?
                    </div>
                    <div className="absolute opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-900 text-white text-[11px] p-2.5 rounded-lg shadow-xl text-center font-medium leading-relaxed">
                      {newModelConfig.provider === "gemini" && "Masukkan versi model Gemini Vision. Contoh: gemini-2.5-flash"}
                      {newModelConfig.provider === "byteplus" && "Masukkan Endpoint ID dari dasbor Ark, berawalan 'ep-'. Contoh: ep-20260505-nplpn"}
                      {newModelConfig.provider === "openrouter" && "Masukkan format 'developer/nama-model' vision. Contoh: google/gemini-2.5-flash"}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900"></div>
                    </div>
                    <input
                      type="text"
                      placeholder={
                        newModelConfig.provider === "gemini"
                          ? "e.g. gemini-2.5-flash"
                          : newModelConfig.provider === "byteplus"
                          ? "e.g. ep-202605..."
                          : "e.g. google/gemini-2.5-flash"
                      }
                      value={newModelConfig.model}
                      onChange={(e) => setNewModelConfig({ ...newModelConfig, model: e.target.value })}
                      className="w-full pl-3 pr-9 py-2 rounded-lg border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all focus:ring-2 focus:ring-teal-500/50"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <input
                      type="text"
                      placeholder="Label (Opsional)"
                      value={newModelConfig.label || ""}
                      onChange={(e) => setNewModelConfig({ ...newModelConfig, label: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-teal-200 dark:border-teal-700 bg-white dark:bg-slate-800 text-sm outline-none"
                    />
                  </div>
                </div>
                {newModelConfig.provider === "openrouter" && (
                  <div className="mb-4 flex items-center gap-2">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer hover:text-teal-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={newModelConfig.useReasoning || false}
                        onChange={(e) => setNewModelConfig({ ...newModelConfig, useReasoning: e.target.checked })}
                        className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                      />
                      🧠 Gunakan Mode Reasoning (Khusus OpenRouter)
                    </label>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (!newModelConfig.model.trim()) return alert("Model ID harus diisi!");
                    setOcrModels([...ocrModels, { ...newModelConfig }]);
                    setNewModelConfig({ provider: "gemini", model: "", label: "" });
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/30 text-teal-700 dark:text-teal-300 font-bold text-sm rounded-lg transition-colors w-full sm:w-auto"
                >
                  Tambahkan ke Antrean
                </button>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                Model pertama (nomor 1) akan dicoba terlebih dahulu. Jika mengalami limit/error, sistem akan otomatis beralih (fallback) ke model nomor 2, dan seterusnya.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-teal-100 dark:border-teal-800/30">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Menyimpan...
                </>
              ) : (
                <>
                  <span>💾</span> Simpan Konfigurasi OCR
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
