// src/app/eleven/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Voice {
  id?: string; // database id (undfined for default premade ones)
  voiceId: string;
  name: string;
  note: string | null;
  category: string; // "premade" (free) or "database" (kustom)
  createdAt?: string;
}

interface LogEntry {
  time: string;
  message: string;
  type: "info" | "success" | "error";
}

interface GenerateResult {
  voiceId: string;
  name: string;
  success: boolean;
  savedPath?: string;
  error?: string;
}

interface DBVoice {
  id: string;
  voiceId: string;
  name: string;
  note: string | null;
  createdAt: string;
}

interface ElevenLabsVoiceResponse {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
}

export default function ElevenLabsBulkPage() {
  // Config state
  const [text, setText] = useState("halo aero");
  const [modelId, setModelId] = useState("eleven_v3");
  const [outputFormat, setOutputFormat] = useState("mp3_44100_128");
  const [outputPath, setOutputPath] = useState("./elevenlabs_outputs");
  const [apiKey, setApiKey] = useState("");
  const [downloadAsZip, setDownloadAsZip] = useState(true);
  const [saveLocally, setSaveLocally] = useState(false);
  const [languageCode, setLanguageCode] = useState("auto");

  // Voice Settings override state
  const [overrideVoiceSettings, setOverrideVoiceSettings] = useState(false);
  const [stability, setStability] = useState(0.75);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [style, setStyle] = useState(0.0);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);
  const [speed, setSpeed] = useState(1.0);
  const [generationsPerVoice, setGenerationsPerVoice] = useState(1);

  // Tab filtering
  const [activeTab, setActiveTab] = useState<"all" | "premade" | "database">("all");

  // Voices list state
  const [customVoices, setCustomVoices] = useState<Voice[]>([]);
  const [defaultVoices, setDefaultVoices] = useState<Voice[]>([]);
  const [selectedVoiceIds, setSelectedVoiceIds] = useState<Set<string>>(new Set());
  
  const [isLoadingCustom, setIsLoadingCustom] = useState(true);
  const [isLoadingDefault, setIsLoadingDefault] = useState(false);

  // Add voice form state
  const [newVoiceId, setNewVoiceId] = useState("");
  const [newVoiceName, setNewVoiceName] = useState("");
  const [newVoiceNote, setNewVoiceNote] = useState("");
  const [isAddingVoice, setIsAddingVoice] = useState(false);

  // Execution state
  const [isGenerating, setIsGenerating] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [selectingFolder, setSelectingFolder] = useState(false);

  const handleSelectFolder = async () => {
    setSelectingFolder(true);
    try {
      const res = await fetch("/api/eleven?action=select-directory");
      if (res.ok) {
        const data = await res.json();
        if (data.selectedPath) {
          setOutputPath(data.selectedPath);
        } else if (data.message) {
          alert(data.message);
        }
      } else {
        const data = await res.json();
        alert(data.message || "Gagal membuka folder picker.");
      }
    } catch (err) {
      console.error("Error selecting folder:", err);
      alert("Terjadi kesalahan koneksi saat membuka folder picker.");
    } finally {
      setSelectingFolder(false);
    }
  };

  // Load custom voices on mount & custom API Key from localStorage
  useEffect(() => {
    fetchCustomVoices();
    const savedKey = localStorage.getItem("elevenlabs_custom_api_key");
    if (savedKey) {
      setApiKey(savedKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch default premade voices automatically when API Key is available
  useEffect(() => {
    fetchDefaultVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
    const time = new Date().toLocaleTimeString("id-ID");
    setLogs((prev) => [{ time, message, type }, ...prev]);
  };

  // 1. Fetch custom voices from our database
  const fetchCustomVoices = async () => {
    setIsLoadingCustom(true);
    try {
      const res = await fetch("/api/eleven");
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((v: DBVoice) => ({
          ...v,
          category: "database"
        }));
        setCustomVoices(mapped);
      } else {
        addLog("Gagal memuat suara kustom dari database.", "error");
      }
    } catch {
      addLog("Gagal terhubung ke API database suara.", "error");
    } finally {
      setIsLoadingCustom(false);
    }
  };

  // 2. Fetch default premade (free) voices from ElevenLabs API proxy
  const fetchDefaultVoices = async () => {
    setDefaultVoices([]);
    setIsLoadingDefault(true);
    try {
      const url = `/api/eleven?fetchDefault=true${apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Filter hanya category === "premade" (suara default gratis bawaan ElevenLabs)
        const premadeOnly = data
          .filter((v: ElevenLabsVoiceResponse) => v.category === "premade")
          .map((v: ElevenLabsVoiceResponse) => ({
            voiceId: v.voice_id,
            name: v.name,
            note: v.description || "Suara Bawaan Free Tier",
            category: "premade"
          }));
        setDefaultVoices(premadeOnly);
        addLog(`Berhasil sinkronisasi ${premadeOnly.length} suara bawaan (Free) dari ElevenLabs.`, "success");
      } else {
        addLog("Belum bisa mengambil suara bawaan ElevenLabs. Periksa API Key Anda.", "info");
      }
    } catch {
      addLog("Gagal terhubung ke API ElevenLabs default voices.", "error");
    } finally {
      setIsLoadingDefault(false);
    }
  };

  const handleSaveApiKey = (val: string) => {
    setApiKey(val);
    if (val) {
      localStorage.setItem("elevenlabs_custom_api_key", val);
    } else {
      localStorage.removeItem("elevenlabs_custom_api_key");
    }
  };

  const handleAddVoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoiceId.trim() || !newVoiceName.trim()) {
      alert("Voice ID dan Nama wajib diisi.");
      return;
    }

    const normalizedVoiceId = newVoiceId.trim();
    
    // Validasi duplikasi (baik di database kustom maupun suara bawaan yang sudah di-load)
    const isDuplicate = allCombinedVoices.some(
      (v) => v.voiceId.toLowerCase() === normalizedVoiceId.toLowerCase()
    );

    if (isDuplicate) {
      alert("Voice ID ini sudah terdaftar di daftar suara Anda (baik Bawaan maupun Kustom).");
      return;
    }

    setIsAddingVoice(true);
    try {
      const res = await fetch("/api/eleven", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: newVoiceId.trim(),
          name: newVoiceName.trim(),
          note: newVoiceNote.trim(),
        }),
      });

      if (res.ok) {
        const newVoice = await res.json();
        const mapped = { ...newVoice, category: "database" };
        setCustomVoices((prev) => [mapped, ...prev]);
        setNewVoiceId("");
        setNewVoiceName("");
        setNewVoiceNote("");
        addLog(`Berhasil menyimpan suara "${newVoice.name}" ke database kustom.`, "success");
      } else {
        const errData = await res.json();
        alert(errData.message || "Gagal menyimpan suara.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setIsAddingVoice(false);
    }
  };

  const handleDeleteVoice = async (id: string, name: string, voiceId: string) => {
    if (!window.confirm(`Hapus suara kustom "${name}" dari database?`)) return;

    try {
      const res = await fetch(`/api/eleven?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCustomVoices((prev) => prev.filter((v) => v.id !== id));
        setSelectedVoiceIds((prev) => {
          const next = new Set(prev);
          next.delete(voiceId);
          return next;
        });
        addLog(`Menghapus suara "${name}" dari database.`, "info");
      } else {
        alert("Gagal menghapus suara dari database.");
      }
    } catch {
      alert("Terjadi kesalahan koneksi.");
    }
  };

  // Combine voices list based on current selection/tabs
  const allCombinedVoices = [
    ...customVoices,
    ...defaultVoices
  ];

  const filteredVoices = allCombinedVoices.filter((v) => {
    if (activeTab === "database") return v.category === "database";
    if (activeTab === "premade") return v.category === "premade";
    return true;
  });

  // Selection handlers
  const handleToggleSelect = (voiceId: string) => {
    setSelectedVoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(voiceId)) {
        next.delete(voiceId);
      } else {
        next.add(voiceId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const allFilteredVoiceIds = filteredVoices.map((v) => v.voiceId);
    const isAllSelected = allFilteredVoiceIds.every((id) => selectedVoiceIds.has(id));

    setSelectedVoiceIds((prev) => {
      const next = new Set(prev);
      if (isAllSelected) {
        // Uncheck all in current filter
        allFilteredVoiceIds.forEach((id) => next.delete(id));
      } else {
        // Check all in current filter
        allFilteredVoiceIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleSelectLimit = (limit: number) => {
    const listToSelect = filteredVoices.slice(0, limit).map((v) => v.voiceId);
    setSelectedVoiceIds(new Set(listToSelect));
    addLog(`Memilih ${listToSelect.length} model suara teratas.`, "info");
  };

  const handleGenerateBulk = async () => {
    if (selectedVoiceIds.size === 0) {
      alert("Pilih minimal satu suara untuk di-generate.");
      return;
    }
    if (!text.trim()) {
      alert("Masukkan kalimat teks yang ingin diucapkan.");
      return;
    }

    setIsGenerating(true);
    setLogs([]); // Reset logs
    addLog(`Memulai proses Bulk TTS untuk ${selectedVoiceIds.size} suara...`, "info");

    const selectedVoices = allCombinedVoices
      .filter((v) => selectedVoiceIds.has(v.voiceId))
      .map((v) => ({ voiceId: v.voiceId, name: v.name }));

    setProgress({ current: 0, total: selectedVoices.length });

    try {
      const res = await fetch("/api/eleven", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voices: selectedVoices,
          modelId,
          outputFormat,
          outputPath,
          apiKey,
          saveLocally,
          downloadAsZip,
          languageCode,
          generationsPerVoice,
          voiceSettings: overrideVoiceSettings ? {
            stability,
            similarityBoost,
            style,
            useSpeakerBoost,
            speed,
          } : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        
        // Log individual results
        let successCount = 0;
        data.results.forEach((resItem: GenerateResult) => {
          if (resItem.success) {
            successCount++;
            const saveMsg = resItem.savedPath ? ` -> Disimpan di server: ${resItem.savedPath}` : "";
            addLog(`✅ [BERHASIL] ${resItem.name}${saveMsg}`, "success");
          } else {
            addLog(`❌ [GAGAL] ${resItem.name} -> ${resItem.error}`, "error");
          }
        });

        // Trigger browser download if zip was returned
        if (data.zipBase64) {
          try {
            const byteCharacters = atob(data.zipBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/zip" });
            
            const zipName = `${text.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_voices.zip`;
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = zipName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            addLog(`📁 File ZIP "${zipName}" dikirim ke browser. Jendela penyimpanan (Save As) akan muncul secara otomatis.`, "success");
          } catch (zipErr) {
            console.error("Gagal mengunduh ZIP di browser:", zipErr);
            addLog("Gagal memproses unduhan ZIP di browser.", "error");
          }
        }

        setProgress({ current: selectedVoices.length, total: selectedVoices.length });
        addLog(`Proses selesai. ${successCount}/${selectedVoices.length} suara berhasil digenerate.`, "success");
      } else {
        const errData = await res.json();
        addLog(`Gagal: ${errData.message || "Terjadi kesalahan di server."}`, "error");
      }
    } catch {
      addLog("Terjadi kesalahan jaringan/koneksi saat generate.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 lg:p-12 relative overflow-hidden">
      {/* Background Radial Glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[150px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto space-y-8 relative z-10">
        
        {/* Title Header */}
        <div className="border-b border-slate-800 pb-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎙️</span>
            <div>
              <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                ElevenLabs Bulk Voice Generator
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Latih voice command (seperti &quot;halo aero&quot;) menggunakan beberapa model suara kustom sekaligus secara instan.
              </p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column - Configurations (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2">
                ⚙️ Pengaturan TTS
              </h2>

              {/* Teks Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Kalimat / Kata Command
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Misalnya: halo aero"
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-slate-100 font-medium placeholder-slate-600 resize-none"
                />
                <div className="flex justify-between items-center mt-1">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-[9px] text-slate-500 self-center">Gaya Prompt:</span>
                    <button
                      type="button"
                      onClick={() => setText(`[whisper] ${text.replace(/\[.*?\]\s*/g, "")}`)}
                      className="text-[9px] bg-slate-950 border border-slate-800 text-indigo-400 font-bold px-1.5 py-0.5 rounded hover:bg-slate-900 transition-colors"
                      title="Simulasi pelan / jarak jauh"
                    >
                      🤫 Bisik
                    </button>
                    <button
                      type="button"
                      onClick={() => setText(`[shouting] ${text.replace(/\[.*?\]\s*/g, "")}`)}
                      className="text-[9px] bg-slate-950 border border-slate-800 text-indigo-400 font-bold px-1.5 py-0.5 rounded hover:bg-slate-900 transition-colors"
                      title="Simulasi teriakan kencang"
                    >
                      🔊 Teriak
                    </button>
                    <button
                      type="button"
                      onClick={() => setText(`[excited] ${text.replace(/\[.*?\]\s*/g, "")}`)}
                      className="text-[9px] bg-slate-950 border border-slate-800 text-indigo-400 font-bold px-1.5 py-0.5 rounded hover:bg-slate-900 transition-colors"
                      title="Simulasi penuh gairah / ceria"
                    >
                      ⚡ Ceria
                    </button>
                    <button
                      type="button"
                      onClick={() => setText(text.replace(/\[.*?\]\s*/g, ""))}
                      className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded hover:bg-slate-900 transition-colors"
                    >
                      Normal
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {text.length} karakter (total {text.length * (selectedVoiceIds.size || 1)} karakter)
                  </div>
                </div>
              </div>

              {/* Engine Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Model Engine ElevenLabs
                </label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-100 font-bold"
                >
                  <option value="eleven_v3">Eleven v3 (Terbaik & Paling Ekspresif - 70+ Bahasa)</option>
                  <option value="eleven_multilingual_v2">Eleven Multilingual v2 (Stabil - 29 Bahasa)</option>
                  <option value="eleven_turbo_v2_5">Eleven Turbo v2.5 (Super Cepat - Optimasi Inggris)</option>
                </select>
              </div>

              {/* Language Override */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Language Override (Paksa Bahasa)
                </label>
                <select
                  value={languageCode}
                  onChange={(e) => setLanguageCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-100 font-bold"
                >
                  <option value="auto">🌐 Otomatis (Auto-detect - Direkomendasikan)</option>
                  <option value="id">🇮🇩 Indonesia (Indonesian)</option>
                  <option value="en">🇺🇸 Inggris (English)</option>
                  <option value="ja">🇯🇵 Jepang (Japanese)</option>
                  <option value="ko">🇰🇷 Korea (Korean)</option>
                  <option value="zh">🇨🇳 Mandarin (Chinese)</option>
                  <option value="es">🇪🇸 Spanyol (Spanish)</option>
                  <option value="fr">🇫🇷 Prancis (French)</option>
                  <option value="de">🇩🇪 Jerman (German)</option>
                  <option value="it">🇮🇹 Italia (Italian)</option>
                  <option value="pt">🇵🇹 Portugis (Portuguese)</option>
                  <option value="ar">🇸🇦 Arab (Arabic)</option>
                  <option value="ru">🇷🇺 Rusia (Russian)</option>
                  <option value="tr">🇹🇷 Turki (Turkish)</option>
                  <option value="vi">🇻🇳 Vietnam (Vietnamese)</option>
                  <option value="th">🇹🇭 Thailand (Thai)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Memaksa AI menggunakan aksen & pelafalan bahasa tertentu (sangat berguna untuk kata-kata singkatan / campur bahasa).
                </p>
              </div>

              {/* Format Output */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Format Output File
                </label>
                <select
                  value={outputFormat}
                  onChange={(e) => setOutputFormat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-100 font-bold"
                >
                  <option value="mp3_44100_128">MP3 44.1 kHz (128kbps) - [Rekomendasi Free Tier]</option>
                  <option value="mp3_44100_192">MP3 44.1 kHz (192kbps) - [Butuh Creator Plan]</option>
                  <option value="wav_44100">WAV Lossless (44.1 kHz) - [Butuh Pro Plan]</option>
                  <option value="wav_48000">WAV Lossless (48 kHz) - [Butuh Pro Plan]</option>
                </select>
                {outputFormat !== "mp3_44100_128" && (
                  <p className="text-[10px] text-amber-400 font-semibold mt-1">
                    ⚠️ Peringatan: Format WAV atau MP3 kualitas tinggi memerlukan akun ElevenLabs berbayar. Request akan gagal di Free Tier.
                  </p>
                )}
              </div>

              {/* Voice Settings Slider Override */}
              <div className="space-y-3 pt-2 border-t border-slate-800/60">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={overrideVoiceSettings}
                    onChange={(e) => setOverrideVoiceSettings(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <div className="font-bold text-slate-200">Kustomisasi Karakter Suara</div>
                    <div className="text-[10px] text-slate-400">Sesuaikan ekspresi, emosi, stabilitas, & kemiripan suara.</div>
                  </div>
                </label>

                {overrideVoiceSettings && (
                  <div className="space-y-4 bg-slate-950/50 p-4 rounded-xl border border-slate-900/80 mt-2 animate-fadeIn text-xs">
                    
                    {/* Stability Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-300">Stabilitas (Stability): {Math.round(stability * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={stability}
                        onChange={(e) => setStability(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Lebih Ekspresif / Bervariasi</span>
                        <span>Lebih Stabil / Monoton</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                        💡 <strong>Stabilitas Rendah (Creative):</strong> Intonasi suara bervariasi & berbeda di tiap take. Sangat bagus untuk menghasilkan variasi pengucapan di Edge Impulse.
                      </p>
                    </div>

                    {/* Similarity Boost Slider */}
                    <div className="space-y-1 border-t border-slate-900 pt-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-300">Kejelasan & Kemiripan (Clarity): {Math.round(similarityBoost * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={similarityBoost}
                        onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Rendah</span>
                        <span>Sangat Mirip</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                        💡 Menjaga kecocokan suara hasil generate agar tetap mirip dengan model asli.
                      </p>
                    </div>

                    {/* Style Exaggeration Slider */}
                    <div className="space-y-1 border-t border-slate-900 pt-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-300">Gaya Emosi (Style Exaggeration): {Math.round(style * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={style}
                        onChange={(e) => setStyle(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Datar (Flat)</span>
                        <span>Sangat Ekspresif (Dramatis)</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                        💡 Membuat suara melafalkan kata-kata dengan dorongan gaya/energi yang dramatis.
                      </p>
                    </div>

                    {/* Speed Slider */}
                    <div className="space-y-1 border-t border-slate-900 pt-2">
                      <div className="flex justify-between font-semibold">
                        <span className="text-slate-300">Kecepatan Bicara (Speed): {Math.round(speed * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.7"
                        max="1.2"
                        step="0.05"
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-full h-1 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500">
                        <span>Lambat (0.7x)</span>
                        <span>Cepat (1.2x)</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-relaxed">
                        💡 <strong>Sangat Penting untuk Edge Impulse!</strong> Jika kata perintah melebihi batas 2 detik di Edge Impulse, naikkan kecepatan ke 110% atau 120% untuk memampatkan pengucapan.
                      </p>
                    </div>

                    {/* Speaker Boost Checkbox */}
                    <div className="border-t border-slate-900 pt-2 space-y-1">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useSpeakerBoost}
                          onChange={(e) => setUseSpeakerBoost(e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="text-xs text-slate-300 font-semibold">Gunakan Speaker Boost</span>
                      </label>
                      <p className="text-[9px] text-slate-400 leading-relaxed pl-5">
                        💡 Meningkatkan detail kejelasan vokal agar terdengar lebih tajam.
                      </p>
                    </div>

                  </div>
                )}
              </div>

              {/* Jumlah Variasi Per Suara */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                  <span>Jumlah Variasi per Model Suara</span>
                  <span className="text-[10px] text-indigo-400 font-bold">Data Augmentation</span>
                </label>
                <select
                  value={generationsPerVoice}
                  onChange={(e) => setGenerationsPerVoice(parseInt(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-100 font-bold"
                >
                  <option value={1}>1 Versi (Default)</option>
                  <option value={2}>2 Versi (Intonasi Berbeda - Rekomendasi Dataset)</option>
                  <option value={3}>3 Versi (Sangat Bervariasi - Dataset Melimpah)</option>
                </select>
                <p className="text-[10px] text-slate-500">
                  Secara otomatis men-generate kata yang sama berulang kali dengan variasi intonasi berbeda untuk satu model suara (menghasilkan file terpisah dengan akhiran <code>_take1</code>, <code>_take2</code>, dst.).
                </p>
              </div>

              {/* Target Penyimpanan Checkboxes */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tujuan Hasil Suara
                </label>
                <div className="flex flex-col gap-2 bg-slate-950/40 p-3 rounded-xl border border-slate-900">
                  {/* Download as ZIP Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={downloadAsZip}
                      onChange={(e) => setDownloadAsZip(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-200">Unduh Langsung (ZIP)</div>
                      <div className="text-[10px] text-slate-400">Mengunduh file ZIP lewat browser Anda (memunculkan Save As).</div>
                    </div>
                  </label>

                  {/* Save Locally Checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer select-none border-t border-slate-900 pt-2">
                    <input
                      type="checkbox"
                      checked={saveLocally}
                      onChange={(e) => setSaveLocally(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div className="text-xs">
                      <div className="font-bold text-slate-200">Simpan di Server Proyek</div>
                      <div className="text-[10px] text-slate-400">Menyimpan langsung di folder komputer lokal server Anda.</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Output Directory Path */}
              {saveLocally && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Folder Penyimpanan Server
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={outputPath}
                      onChange={(e) => setOutputPath(e.target.value)}
                      placeholder="Contoh: ./elevenlabs_outputs atau C:\ElevenLabs_Outputs"
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-200 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleSelectFolder}
                      disabled={selectingFolder}
                      className="bg-slate-900 border border-slate-800 text-indigo-400 hover:text-indigo-300 font-bold px-3 py-2.5 rounded-xl text-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {selectingFolder ? (
                        <span>Membuka...</span>
                      ) : (
                        <>
                          <span>📁</span>
                          <span>Pilih Folder</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Mendukung relative path (misal: <code>./outputs</code> untuk menyimpan di dalam folder project ini) atau absolute path (misal: <code>C:\HasilAudio</code> untuk Windows, atau <code>/Users/nama/Downloads</code> untuk Mac/Linux). Anda juga dapat mengeklik tombol <strong>Pilih Folder</strong> untuk memilih secara visual di Windows.
                  </p>
                </div>
              )}

              {/* API Key Override */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex justify-between">
                  <span>Custom ElevenLabs API Key</span>
                  <span className="text-[9px] text-slate-500 lowercase">(Opsional jika sudah diisi di .env)</span>
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => handleSaveApiKey(e.target.value)}
                  placeholder="xi-api-key..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-200 font-mono"
                />
                <p className="text-[9px] text-slate-500">
                  Kunci API ini disimpan secara lokal di browser Anda (localStorage).
                </p>
              </div>
            </div>
          </div>

          {/* Right Column - Voice Library Manager (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Add Custom Voice ID Form */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl">
              <h2 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-2 mb-4">
                ➕ Tambah Model Suara Kustom ke Database
              </h2>
              <form onSubmit={handleAddVoice} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Suara</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rachel Clone"
                    value={newVoiceName}
                    onChange={(e) => setNewVoiceName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Voice ID</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 21m00Tcm4..."
                    value={newVoiceId}
                    onChange={(e) => setNewVoiceId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200 font-mono"
                  />
                </div>
                <div className="space-y-1 flex flex-col justify-end">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Catatan (Opsional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Contoh: Suara Ceria"
                      value={newVoiceNote}
                      onChange={(e) => setNewVoiceNote(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={isAddingVoice}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
                    >
                      {isAddingVoice ? "..." : "Simpan"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Voices List Card */}
            <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
              
              {/* Tabs & Title */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-200">
                  📁 Daftar Model Suara ({filteredVoices.length})
                </h2>
                
                {/* Tabs */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80 text-xs font-bold shrink-0">
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "all" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setActiveTab("premade")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "premade" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Bawaan (Free)
                  </button>
                  <button
                    onClick={() => setActiveTab("database")}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      activeTab === "database" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Kustom (DB)
                  </button>
                </div>
              </div>

              {/* Selection Helpers & Shortcut Limits */}
              {filteredVoices.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-900 text-xs">
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {filteredVoices.every((v) => selectedVoiceIds.has(v.voiceId)) ? "Hapus Semua" : "Pilih Semua"}
                    </button>
                    <span className="text-slate-700">|</span>
                    <span className="text-slate-400">
                      Terpilih: <strong className="text-indigo-400">{selectedVoiceIds.size}</strong> suara
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Shortcut Batasan:</span>
                    <button
                      onClick={() => handleSelectLimit(10)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded font-bold transition-all"
                    >
                      10
                    </button>
                    <button
                      onClick={() => handleSelectLimit(20)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded font-bold transition-all"
                    >
                      20
                    </button>
                    <button
                      onClick={() => handleSelectLimit(50)}
                      className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded font-bold transition-all"
                    >
                      50
                    </button>
                  </div>
                </div>
              )}

              {/* Voices List Render */}
              {(isLoadingCustom || isLoadingDefault) && filteredVoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500 animate-pulse text-sm">
                  Menghubungkan & memuat model suara...
                </div>
              ) : filteredVoices.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-slate-500 text-sm">
                  {activeTab === "premade"
                    ? "Tidak ada suara bawaan ditemukan. Harap isi API Key dengan benar."
                    : activeTab === "database"
                    ? "Belum ada suara kustom tersimpan di database."
                    : "Tidak ada suara terdaftar. Tambahkan suara kustom atau masukkan API Key."}
                </div>
              ) : (
                <div className="max-h-[350px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                  {filteredVoices.map((voice) => {
                    const isChecked = selectedVoiceIds.has(voice.voiceId);
                    const isPremade = voice.category === "premade";
                    
                    return (
                      <div
                        key={voice.voiceId}
                        onClick={() => handleToggleSelect(voice.voiceId)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-indigo-950/20 border-indigo-500/50"
                            : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-900/40"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Custom Checkbox */}
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                              isChecked
                                ? "bg-indigo-600 border-indigo-500 text-white"
                                : "border-slate-700 bg-slate-950"
                            }`}
                          >
                            {isChecked && <span className="text-[10px] font-bold">✓</span>}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-slate-200 flex items-center gap-2">
                              {voice.name}
                              <span
                                className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  isPremade
                                    ? "bg-purple-950/60 text-purple-400 border border-purple-800/40"
                                    : "bg-indigo-950/60 text-indigo-400 border border-indigo-800/40"
                                }`}
                              >
                                {isPremade ? "Bawaan (Free)" : "Kustom (DB)"}
                              </span>
                            </div>
                            {voice.note && (
                              <div className="text-slate-400 text-xs font-normal mt-0.5 line-clamp-1">
                                {voice.note}
                              </div>
                            )}
                            <div className="text-[9px] font-mono text-slate-600 mt-0.5">
                              ID: {voice.voiceId}
                            </div>
                          </div>
                        </div>
                        
                        {/* Delete button only for database custom voices */}
                        {!isPremade && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (voice.id) handleDeleteVoice(voice.id, voice.name, voice.voiceId);
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-500 transition-colors shrink-0"
                            title="Hapus dari database"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Action Panel & Realtime Output Console */}
        <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-slate-800 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-200">
                🚀 Eksekusi Bulk Generate
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pastikan Anda telah mencentang model suara di atas sebelum menekan tombol generate.
              </p>
            </div>

            <button
              onClick={handleGenerateBulk}
              disabled={isGenerating || selectedVoiceIds.size === 0}
              className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white font-black text-sm px-8 py-3 rounded-xl transition-all shadow-md hover:shadow-indigo-500/10 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Memproses Suara...
                </>
              ) : (
                <>🎙️ Generate Suara ({selectedVoiceIds.size})</>
              )}
            </button>
          </div>

          {/* Progress Indicator */}
          {isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Meng-generate: {progress.current} / {progress.total} suara selesai</span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Terminal Console Logs */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Terminal Log Output
            </label>
            <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 h-[250px] overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar shadow-inner">
              <AnimatePresence initial={false}>
                {logs.length === 0 ? (
                  <div className="text-slate-600 italic">Console siap. Klik &quot;Generate Suara&quot; untuk memulai...</div>
                ) : (
                  logs.map((log, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start gap-2"
                    >
                      <span className="text-slate-600 shrink-0">[{log.time}]</span>
                      <span
                        className={
                          log.type === "success"
                            ? "text-emerald-400"
                            : log.type === "error"
                            ? "text-rose-400 font-bold"
                            : "text-slate-300"
                        }
                      >
                        {log.message}
                      </span>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
