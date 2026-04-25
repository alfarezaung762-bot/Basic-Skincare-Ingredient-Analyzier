// src/components/profile/ProfileForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, Variants } from "framer-motion";

interface ProfileFormProps {
  initialData?: {
    name: string;
    skinType?: string;
    age?: number;
    severity?: string;
    primaryFocus?: string;
    allergies?: string | null;
    isPregnantOrNursing?: boolean;
  } | null;
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    skinType: initialData?.skinType || "Normal",
    age: initialData?.age ? String(initialData.age) : "",
    severity: initialData?.severity || "BIASA",
    allergies: initialData?.allergies || "",
    isPregnantOrNursing: initialData?.isPregnantOrNursing || false,
  });

  // STATE BARU V3: Array untuk menyimpan banyak fokus (Maksimal 3)
  const [selectedFocuses, setSelectedFocuses] = useState<string[]>(
    initialData?.primaryFocus ? initialData.primaryFocus.split(",") : []
  );

  const [baseSkin, setBaseSkin] = useState("Normal");
  const [isSensitive, setIsSensitive] = useState(false);

  useEffect(() => {
    let currentSkinType = initialData?.skinType || "Normal";

    const quizResult = localStorage.getItem("quizSkinType");
    if (quizResult) {
      currentSkinType = quizResult;
    }

    if (currentSkinType.includes(" & Sensitif")) {
      setIsSensitive(true);
      setBaseSkin(currentSkinType.replace(" & Sensitif", ""));
    } else if (currentSkinType === "Sensitif") {
      setIsSensitive(true);
      setBaseSkin("Normal");
    } else {
      setIsSensitive(false);
      setBaseSkin(currentSkinType);
    }

    setFormData((prev) => ({ ...prev, skinType: currentSkinType }));
  }, [initialData]);

  const handleBaseSkinChange = (type: string) => {
    setBaseSkin(type);
    const newSkinType = isSensitive ? `${type} & Sensitif` : type;
    setFormData({ ...formData, skinType: newSkinType });
  };

  const handleSensitiveToggle = (checked: boolean) => {
    setIsSensitive(checked);
    const newSkinType = checked ? `${baseSkin} & Sensitif` : baseSkin;
    setFormData({ ...formData, skinType: newSkinType });
  };

  // FUNGSI BARU V3: Menangani klik tombol fokus dengan batasan max 3
  const handleFocusToggle = (focusId: string) => {
    if (selectedFocuses.includes(focusId)) {
      // Jika sudah terpilih, hapus dari daftar (Uncheck)
      setSelectedFocuses(selectedFocuses.filter((id) => id !== focusId));
    } else {
      // Jika belum terpilih dan masih di bawah batas maksimal, tambahkan
      if (selectedFocuses.length < 3) {
        setSelectedFocuses([...selectedFocuses, focusId]);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (selectedFocuses.length === 0) {
      setError("Pilih minimal 1 fokus utama perawatan kulitmu.");
      setIsLoading(false);
      return;
    }

    // Gabungkan array fokus menjadi string yang dipisah koma untuk database
    const submitData = {
      ...formData,
      primaryFocus: selectedFocuses.join(","),
    };

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        localStorage.removeItem("quizSkinType"); 
        router.push("/");
        router.refresh(); 
      } else {
        const data = await response.json();
        setError(data.message || "Gagal menyimpan profil.");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setIsLoading(false);
    }
  };

  const formVariants: Variants = {
    hidden: { opacity: 0, y: 40, scale: 0.8 },
    visible: { 
      opacity: 1, y: 0, scale: 1,
      transition: { type: "spring", bounce: 0.3, duration: 0.8, staggerChildren: 0.1 } 
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  // DAFTAR FOKUS V3 (Sesuai dengan Dasbor Admin)
  const focusOptions = [
    { id: "Mencerahkan & Bekas Jerawat", icon: "✨" },
    { id: "Merawat Jerawat & Sebum", icon: "🛡️" },
    { id: "Anti-Aging & Garis Halus", icon: "⏳" },
    { id: "Memperbaiki Skin Barrier & Hidrasi", icon: "🧱" },
    { id: "Menenangkan Kemerahan (Soothing)", icon: "🌿" },
    { id: "Eksfoliasi & Tekstur Pori-pori", icon: "🌪️" },
  ];

  return (
    <div className="relative w-full max-w-4xl mx-auto flex justify-center transform scale-[1.15] md:scale-[1.20] origin-top mb-24 mt-4">
      {/* --- DEKORASI BACKGROUND ANIMASI --- */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden md:overflow-visible flex justify-center">
        <motion.div animate={{ y: [0, -20, 0], rotate: [-5, 5, -5] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="absolute top-4 -left-8 md:-left-28 text-[100px] md:text-[140px] opacity-[0.15] filter blur-[2px]">🧴</motion.div>
        <motion.div animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.3, 0.1], rotate: [0, 90, 180] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute top-12 right-0 md:-right-10 text-[70px] md:text-[90px] filter blur-[1px] text-yellow-500">✨</motion.div>
        <motion.div animate={{ y: [0, 25, 0], rotate: [10, -5, 10] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute top-64 -right-10 md:-right-24 text-[110px] md:text-[150px] opacity-[0.15] filter blur-[2px]">🧪</motion.div>
        <motion.div animate={{ y: [0, -40, 0], x: [0, 15, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }} className="absolute top-80 -left-6 md:-left-16 text-[80px] md:text-[110px] opacity-20 filter blur-[1px]">🫧</motion.div>
        <motion.div animate={{ y: [0, 15, 0], rotate: [-10, 10, -10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }} className="absolute bottom-40 -left-10 md:-left-20 text-[100px] md:text-[130px] opacity-[0.15] filter blur-[2px]">🌿</motion.div>
        <motion.div animate={{ y: [0, -30, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1.5 }} className="absolute bottom-16 -right-8 md:-right-16 text-[90px] md:text-[120px] opacity-20 filter blur-[2px]">💧</motion.div>
        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }} className="absolute -bottom-20 right-1/4 text-[130px] md:text-[180px] opacity-10 filter blur-[3px]">🌸</motion.div>
      </div>

      {/* --- KOTAK FORM UTAMA --- */}
      <motion.form 
        variants={formVariants} initial="hidden" animate="visible" onSubmit={handleSubmit} 
        className="w-full max-w-2xl mx-auto space-y-8 bg-white/90 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 relative z-10"
      >
        {error && (
          <motion.div variants={itemVariants} className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200 shadow-sm">
            {error}
          </motion.div>
        )}

        {/* 1. Nama Panggilan */}
        <motion.div variants={itemVariants} className="space-y-3">
          <label htmlFor="name" className="block text-sm font-bold text-gray-900">1. Siapa namamu?</label>
          <input id="name" type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm bg-gray-50/50 hover:bg-gray-50 shadow-inner" />
        </motion.div>

        {/* 2. Jenis Kulit */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex justify-between items-end mb-2">
            <label className="block text-sm font-bold text-gray-900">2. Apa jenis kulitmu?</label>
            <Link href="/quiz" className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 hover:shadow-md transition-all flex items-center gap-1 group">
              <span className="group-hover:animate-bounce">🤔</span> Bingung? Lakukan Tes !!!
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {["Normal", "Kering", "Berminyak", "Kombinasi"].map((type) => (
              <button key={type} type="button" onClick={() => handleBaseSkinChange(type)} className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transform active:scale-95 transition-all ${baseSkin === type ? "bg-black text-white border-black shadow-lg" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50"}`}>
                {type}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 p-4 bg-red-50/50 border border-red-100 rounded-xl mt-3 transition-colors hover:bg-red-50">
            <input type="checkbox" id="sensitive" checked={isSensitive} onChange={(e) => handleSensitiveToggle(e.target.checked)} className="w-5 h-5 text-red-600 bg-white border-gray-300 rounded focus:ring-red-500 cursor-pointer" />
            <label htmlFor="sensitive" className="text-sm font-bold text-red-900 cursor-pointer select-none">Kulit saya rentan Kemerahan / Sensitif 🌡️</label>
          </div>
        </motion.div>

        {/* 3. Umur */}
        <motion.div variants={itemVariants} className="space-y-3">
          <label htmlFor="age" className="block text-sm font-bold text-gray-900">3. Berapa umurmu?</label>
          <input id="age" type="number" required min="10" max="100" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} placeholder="Contoh: 22" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm bg-gray-50/50 hover:bg-gray-50 shadow-inner" />
        </motion.div>

        {/* Kondisi Khusus: Hamil */}
        <motion.div variants={itemVariants} className="flex items-center gap-3 p-4 bg-pink-50/50 border border-pink-100 rounded-xl transition-colors hover:bg-pink-50">
          <input type="checkbox" id="pregnant" checked={formData.isPregnantOrNursing} onChange={(e) => setFormData({ ...formData, isPregnantOrNursing: e.target.checked })} className="w-5 h-5 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 cursor-pointer" />
          <label htmlFor="pregnant" className="text-sm font-bold text-pink-900 cursor-pointer select-none">Saya sedang Hamil atau Menyusui 🤰</label>
        </motion.div>

        {/* 4. Tingkat Keparahan */}
        <motion.div variants={itemVariants} className="space-y-3">
          <label className="block text-sm font-bold text-gray-900">4. Tingkat Keparahan Kulit (Jerawat)</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: "BIASA", label: "Biasa / Normal" },
              { id: "SEDANG", label: "Sedang (Beruntusan)" },
              { id: "PARAH", label: "Parah (Meradang)" },
            ].map((item) => (
              <button key={item.id} type="button" onClick={() => setFormData({ ...formData, severity: item.id })} className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transform active:scale-95 transition-all ${formData.severity === item.id ? "bg-black text-white border-black shadow-lg" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50"}`}>
                {item.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 5. Fokus Utama (Multi-Select V3) */}
        <motion.div variants={itemVariants} className="space-y-3">
          <div className="flex justify-between items-end">
            <label className="block text-sm font-bold text-gray-900">5. Apa fokus utama skincare-mu?</label>
            <span className={`text-xs font-bold px-2 py-1 rounded-lg ${selectedFocuses.length === 3 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>
              {selectedFocuses.length}/3 Terpilih
            </span>
          </div>
          <p className="text-[11px] font-medium text-gray-500 mb-2">Kamu bisa memilih maksimal 3 fokus untuk menghindari iritasi akibat terlalu banyak bahan aktif.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {focusOptions.map((item) => {
              const isSelected = selectedFocuses.includes(item.id);
              const isDisabled = !isSelected && selectedFocuses.length >= 3;

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleFocusToggle(item.id)}
                  className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transform active:scale-95 transition-all text-left flex items-center gap-2 
                    ${isSelected ? "bg-black text-white border-black shadow-lg" : "bg-white text-gray-600 border-gray-200"}
                    ${isDisabled ? "opacity-50 cursor-not-allowed hover:bg-white hover:border-gray-200" : "hover:border-gray-400 hover:bg-gray-50"}
                  `}
                >
                  <span className="text-base">{item.icon}</span> {item.id}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* 6. Alergi */}
        <motion.div variants={itemVariants} className="space-y-3">
          <label htmlFor="allergies" className="block text-sm font-bold text-gray-900">6. Alergi Bahan / Sensitivitas (Opsional)</label>
          <input id="allergies" type="text" value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} placeholder="Contoh: Fragrance, Alcohol..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black transition-all text-sm bg-gray-50/50 hover:bg-gray-50 shadow-inner" />
        </motion.div>

        <motion.div variants={itemVariants} className="pt-4">
          <button type="submit" disabled={isLoading || !formData.age || !formData.name} className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all transform active:scale-95 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-lg flex justify-center items-center">
            {isLoading ? (
              <span className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Menyimpan...
              </span>
            ) : "Simpan Profil Kulit ✨"}
          </button>
        </motion.div>
      </motion.form>
    </div>
  );
}