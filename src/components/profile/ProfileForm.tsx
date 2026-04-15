// src/components/profile/ProfileForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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
    primaryFocus: initialData?.primaryFocus || "MERAWAT_MEMBERSIHKAN",
    allergies: initialData?.allergies || "",
    isPregnantOrNursing: initialData?.isPregnantOrNursing || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
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

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-300">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl text-sm font-medium border border-red-200">
          {error}
        </div>
      )}

      {/* 1. Nama Panggilan */}
      <div className="space-y-3">
        <label htmlFor="name" className="block text-sm font-bold text-gray-900">1. Siapa namamu?</label>
        <input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm bg-gray-50 hover:bg-white"
        />
      </div>

      {/* 2. Jenis Kulit */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-900">2. Apa jenis kulitmu?</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {["Normal", "Kering", "Berminyak", "Kombinasi", "Sensitif"].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData({ ...formData, skinType: type })}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                formData.skinType === type
                  ? "bg-black text-white border-black shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Umur */}
      <div className="space-y-3">
        <label htmlFor="age" className="block text-sm font-bold text-gray-900">3. Berapa umurmu?</label>
        <input
          id="age"
          type="number"
          required
          min="10"
          max="100"
          value={formData.age}
          onChange={(e) => setFormData({ ...formData, age: e.target.value })}
          placeholder="Contoh: 22"
          className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm bg-gray-50 hover:bg-white"
        />
      </div>

      {/* Kondisi Khusus: Hamil / Menyusui */}
      <div className="flex items-center gap-3 p-4 bg-pink-50 border border-pink-200 rounded-xl">
        <input
          type="checkbox"
          id="pregnant"
          checked={formData.isPregnantOrNursing}
          onChange={(e) => setFormData({ ...formData, isPregnantOrNursing: e.target.checked })}
          className="w-5 h-5 text-pink-600 bg-white border-gray-300 rounded focus:ring-pink-500 cursor-pointer"
        />
        <label htmlFor="pregnant" className="text-sm font-bold text-pink-900 cursor-pointer">
          Saya sedang Hamil atau Menyusui 🤰
        </label>
      </div>

      {/* 4. Tingkat Keparahan */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-900">4. Tingkat Keparahan Kulit</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { id: "BIASA", label: "Biasa / Normal" },
            { id: "SEDANG", label: "Sedang (Beruntusan)" },
            { id: "PARAH", label: "Parah (Meradang)" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFormData({ ...formData, severity: item.id })}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                formData.severity === item.id
                  ? "bg-black text-white border-black shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Fokus Utama */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-900">5. Apa fokus utama skincare-mu?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { id: "MENCERAHKAN", label: "✨ Mencerahkan (Dullness)" },
            { id: "MENURUNKAN_JERAWAT", label: "🛡️ Menurunkan Jerawat" },
            { id: "MENGHILANGKAN_BEKAS", label: "🎯 Menghilangkan Bekas" },
            { id: "MERAWAT_MEMBERSIHKAN", label: "💧 Hanya Merawat / Basic" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFormData({ ...formData, primaryFocus: item.id })}
              className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all text-left ${
                formData.primaryFocus === item.id
                  ? "bg-black text-white border-black shadow-md"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 6. Alergi */}
      <div className="space-y-3">
        <label htmlFor="allergies" className="block text-sm font-bold text-gray-900">6. Alergi Bahan / Sensitivitas (Opsional)</label>
        <input
          id="allergies"
          type="text"
          value={formData.allergies}
          onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
          placeholder="Contoh: Fragrance, Alcohol..."
          className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all text-sm bg-gray-50 hover:bg-white"
        />
      </div>

      <div className="pt-4">
        <button
          type="submit"
          disabled={isLoading || !formData.age || !formData.name}
          className="w-full py-4 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg text-lg"
        >
          {isLoading ? "Menyimpan..." : "Simpan Profil Kulit"}
        </button>
      </div>
    </form>
  );
}