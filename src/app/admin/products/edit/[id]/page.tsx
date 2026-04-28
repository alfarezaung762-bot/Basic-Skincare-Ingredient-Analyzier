// src/app/admin/products/edit/[id]/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [formData, setFormData] = useState({
    namaProduk: "",
    tipeProduk: "FACEWASH",
    gambarUrl: "",
    tautanAfiliasi: "",
    komposisiAsli: "",
    isPinKreator: false,
    masalahKulitPin: "",
    catatanKreator: "",
  });

  // State Khusus Gambar Baru & Crop ✂️
  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const [focuses, setFocuses] = useState({
    "Mencerahkan & Bekas Jerawat": false,
    "Merawat Jerawat & Sebum": false,
    "Anti-Aging & Garis Halus": false,
    "Memperbaiki Skin Barrier & Hidrasi": false,
    "Menenangkan Kemerahan (Soothing)": false,
    "Eksfoliasi & Tekstur Pori-pori": false,
  });

  // Penarikan Data Lama
  useEffect(() => {
    const isAuth = sessionStorage.getItem("isAdminAuth");
    if (!isAuth) {
      router.push("/admin/login");
      return;
    }

    if (params.id) {
      fetch("/api/admin/products")
        .then((res) => res.json())
        .then((data) => {
          const product = data.find((p: any) => p.id === params.id);
          if (product) {
            setFormData({
              namaProduk: product.namaProduk,
              tipeProduk: product.tipeProduk,
              gambarUrl: product.gambarUrl || "", // Menyimpan URL gambar lama
              tautanAfiliasi: product.tautanAfiliasi,
              komposisiAsli: product.komposisiAsli,
              isPinKreator: product.isPinKreator,
              masalahKulitPin: product.masalahKulitPin || "",
              catatanKreator: product.catatanKreator || "",
            });

            if (product.fokusProduk) {
              const selectedFocuses = product.fokusProduk.split(", ");
              setFocuses((prev) => {
                const newFocuses = { ...prev };
                selectedFocuses.forEach((focus: string) => {
                  if (focus in newFocuses) {
                    newFocuses[focus as keyof typeof focuses] = true;
                  }
                });
                return newFocuses;
              });
            }
          }
        })
        .catch((err) => console.error("Gagal menarik data produk", err));
    }
  }, [router, params.id]);

  const handleFocusChange = (focus: keyof typeof focuses) => {
    setFocuses((prev) => ({ ...prev, [focus]: !prev[focus] }));
  };

  const handleCatatanChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputText = e.target.value;
    const wordCount = inputText.trim() === "" ? 0 : inputText.trim().split(/\s+/).length;

    if (wordCount <= 30 || inputText.length < formData.catatanKreator.length) {
      setFormData({ ...formData, catatanKreator: inputText });
    }
  };

  const catatanWordCount = formData.catatanKreator.trim() === "" ? 0 : formData.catatanKreator.trim().split(/\s+/).length;

  // Logika Pilih & Potong File Baru
  function onSelectFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setCrop(undefined); 
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(e.target.files[0]);
    }
  }

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 1, width, height), width, height);
    setCrop(crop);
  }

  async function uploadToCloudinary(canvas: HTMLCanvasElement) {
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg'));
    const data = new FormData();
    data.append("file", blob);
    // GANTI TEKS DI BAWAH DENGAN NAMA UPLOAD PRESET CLOUDINARY MILIKMU
    data.append("upload_preset", "skincare_katalog"); 

    const res = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: data
    });
    const file = await res.json();
    return file.secure_url;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });

    const selectedFocuses = Object.entries(focuses)
      .filter(([_, isChecked]) => isChecked)
      .map(([key]) => key)
      .join(", ");

    if (!selectedFocuses) {
      setMessage({ type: "error", text: "Kegagalan: Anda harus memilih minimal satu Fokus Produk." });
      setIsLoading(false);
      return;
    }

    if (formData.isPinKreator && (!formData.masalahKulitPin || formData.catatanKreator.trim() === "")) {
      setMessage({ type: "error", text: "Kegagalan: Masalah Kulit dan Catatan wajib diisi untuk Pin Kreator." });
      setIsLoading(false);
      return;
    }

    try {
      let finalImageUrl = formData.gambarUrl; // Default: Gunakan tautan gambar yang lama

      // Jika ada file baru yang dipilih dan dipotong, proses ke Cloudinary
      if (completedCrop && imgRef.current) {
        const canvas = document.createElement('canvas');
        const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
        const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          ctx.drawImage(imgRef.current, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
          finalImageUrl = await uploadToCloudinary(canvas);
        }
      }

      const payloadData = {
        id: params.id, 
        ...formData,
        gambarUrl: finalImageUrl, // Menimpa gambar jika ada yang baru
        fokusProduk: selectedFocuses,
      };

      // MENGGUNAKAN METODE PUT UNTUK MEMPERBARUI
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadData),
      });

      if (res.ok) {
        setMessage({ type: "success", text: "Perubahan produk berhasil disimpan! 🛒" });
        setTimeout(() => {
          router.push("/admin/products");
        }, 1500);
      } else {
        const data = await res.json();
        throw new Error(data.message || "Gagal memperbarui produk di basis data.");
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
        <Link href="/admin/products" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6 inline-block">
          ← Kembali ke Dasbor Produk
        </Link>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Ubah Data Produk ✍️</h1>
          <p className="text-sm text-slate-500 mb-8 font-medium">Perbarui informasi produk afiliasi di bawah ini.</p>

          {message.text && (
            <div className={`p-4 mb-6 rounded-xl text-sm font-bold border ${message.type === "success" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Bagian Edit Gambar & Cropper */}
            <div className="space-y-4 bg-slate-100 p-6 rounded-2xl border-2 border-dashed border-slate-300">
              <div className="flex flex-col md:flex-row gap-6 md:items-start">
                
                {/* Menampilkan Gambar Saat Ini jika tidak ada file baru yang dipilih */}
                {!imgSrc && (
                  <div className="shrink-0 max-w-[150px]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-2">Foto Saat Ini:</p>
                    <div className="w-32 h-32 rounded-xl border border-slate-300 overflow-hidden bg-white p-1 flex items-center justify-center">
                      {formData.gambarUrl ? (
                         <img 
                           src={formData.gambarUrl} 
                           alt="Produk Saat Ini" 
                           className="w-full h-full object-cover rounded-lg" 
                           onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/150?text=Rusak" }}
                         />
                      ) : (
                        <span className="text-3xl">📦</span>
                      )}
                    </div>
                    {/* Menampilkan Teks URL Gambar agar jelas */}
                    <p className="text-[9px] text-blue-500 mt-2 truncate w-full" title={formData.gambarUrl}>
                      {formData.gambarUrl || "Belum ada tautan gambar"}
                    </p>
                  </div>
                )}

                <div className="flex-1">
                  <label htmlFor="fotoUpload" className="text-xs font-bold uppercase text-slate-700">Ganti Foto Produk (Opsional)</label>
                  <p className="text-[10px] font-medium text-slate-500 mb-3">Biarkan kosong jika tidak ingin mengubah foto. Sistem akan memotong otomatis 1:1.</p>
                  <input 
                    id="fotoUpload"
                    title="Pilih foto produk baru"
                    type="file" 
                    accept="image/*" 
                    onChange={onSelectFile} 
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                </div>
              </div>
              
              {imgSrc && (
                <div className="flex flex-col items-center gap-4 bg-white p-4 rounded-xl shadow-inner mt-4">
                  <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1}>
                    <img ref={imgRef} alt="Area potong gambar" src={imgSrc} onLoad={onImageLoad} className="max-h-[300px] rounded-lg border border-slate-200" />
                  </ReactCrop>
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-[11px] font-medium text-slate-500">Geser area terang untuk menyesuaikan potongan.</p>
                    <button type="button" onClick={() => {setImgSrc(''); setCompletedCrop(undefined)}} className="px-4 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-xs hover:bg-red-100 transition-all border border-red-200">
                      Batal Ganti Foto
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Identitas Produk */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <div className="space-y-2">
                <label htmlFor="namaProduk" className="text-xs font-bold text-slate-700 uppercase">Nama Lengkap & Merek</label>
                <input 
                  id="namaProduk"
                  required 
                  type="text" 
                  placeholder="Contoh: Skintific 5X Ceramide Moisturizer" 
                  value={formData.namaProduk} 
                  onChange={(e) => setFormData({...formData, namaProduk: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600 transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="tipeProduk" className="text-xs font-bold text-slate-700 uppercase">Tipe Kategori Produk</label>
                <select 
                  id="tipeProduk"
                  title="Tipe Produk"
                  value={formData.tipeProduk} 
                  onChange={(e) => setFormData({...formData, tipeProduk: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-600"
                >
                  <option value="FACEWASH">Sabun Cuci Muka (Facewash)</option>
                  <option value="MOISTURIZER">Pelembap (Moisturizer)</option>
                  <option value="SUNSCREEN">Tabir Surya (Sunscreen)</option>
                </select>
              </div>
            </div>

            {/* Tautan Afiliasi */}
            <div className="space-y-2">
              <label htmlFor="tautanAfiliasi" className="text-xs font-bold text-slate-700 uppercase">Tautan Pembelian (Afiliasi)</label>
              <input 
                id="tautanAfiliasi"
                required 
                type="url" 
                placeholder="https://..." 
                value={formData.tautanAfiliasi} 
                onChange={(e) => setFormData({...formData, tautanAfiliasi: e.target.value})}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600" 
              />
            </div>

            {/* Komposisi Asli */}
            <div className="space-y-2">
              <label htmlFor="komposisiAsli" className="text-xs font-bold text-slate-700 uppercase">Daftar Komposisi Penuh (Ingredients)</label>
              <textarea 
                id="komposisiAsli"
                required 
                rows={4} 
                placeholder="Tempel seluruh komposisi produk di sini, pastikan memisahkan setiap bahan dengan tanda koma..." 
                value={formData.komposisiAsli} 
                onChange={(e) => setFormData({...formData, komposisiAsli: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium resize-none bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-600" 
              />
            </div>

            {/* Fokus Produk */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase">Fokus Perawatan (Pilih minimal satu)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(focuses) as Array<keyof typeof focuses>).map((focus) => (
                  <label key={focus} htmlFor={`focus-${focus}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                    <input 
                      id={`focus-${focus}`}
                      title={`Pilih fokus ${focus}`}
                      type="checkbox" 
                      checked={focuses[focus]} 
                      onChange={() => handleFocusChange(focus)} 
                      className="w-5 h-5 accent-blue-600" 
                    />
                    <span className="text-sm font-bold text-slate-800">{focus}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Pin Kreator */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <label htmlFor="isPinKreator" className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors">
                <input 
                  id="isPinKreator"
                  title="Jadikan Pin Kreator"
                  type="checkbox" 
                  checked={formData.isPinKreator} 
                  onChange={(e) => setFormData({...formData, isPinKreator: e.target.checked})} 
                  className="w-6 h-6 accent-amber-600" 
                />
                <span className="text-base font-black text-amber-800 tracking-tight">📌 Jadikan Rekomendasi Utama (Pin Kreator)</span>
              </label>

              {formData.isPinKreator && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="grid grid-cols-1 gap-6 bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                  <div className="space-y-2">
                    <label htmlFor="masalahKulitPin" className="text-xs font-bold text-amber-800 uppercase block">Tombol Pelatuk: Tautkan ke Masalah Kulit</label>
                    <select 
                      id="masalahKulitPin"
                      title="Pilih Masalah Kulit Sasaran"
                      required={formData.isPinKreator} 
                      value={formData.masalahKulitPin} 
                      onChange={(e) => setFormData({...formData, masalahKulitPin: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white text-slate-900 outline-none text-sm font-medium focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- Pilih Masalah Kulit Sasaran --</option>
                      <option value="Mencerahkan & Bekas Jerawat">Mencerahkan & Bekas Jerawat</option>
                      <option value="Merawat Jerawat & Sebum">Merawat Jerawat & Sebum</option>
                      <option value="Anti-Aging & Garis Halus">Anti-Aging & Garis Halus</option>
                      <option value="Memperbaiki Skin Barrier & Hidrasi">Memperbaiki Skin Barrier & Hidrasi</option>
                      <option value="Menenangkan Kemerahan (Soothing)">Menenangkan Kemerahan (Soothing)</option>
                      <option value="Eksfoliasi & Tekstur Pori-pori">Eksfoliasi & Tekstur Pori-pori</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="catatanKreator" className="text-xs font-bold text-amber-800 uppercase">Catatan Pribadi Kreator</label>
                      <span className={`text-[10px] font-black ${catatanWordCount >= 30 ? 'text-rose-500' : 'text-amber-600'}`}>
                        {catatanWordCount}/30 Kata
                      </span>
                    </div>
                    <textarea 
                      id="catatanKreator"
                      required={formData.isPinKreator} 
                      rows={3} 
                      placeholder="Jelaskan mengapa produk ini sangat direkomendasikan..." 
                      value={formData.catatanKreator} 
                      onChange={handleCatatanChange} 
                      className="w-full px-4 py-3 rounded-xl border border-amber-200 outline-none text-sm font-medium resize-none bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-amber-500" 
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-4 mt-8 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-md text-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? "Menyimpan Pembaruan..." : "Simpan Perubahan Data ✍️"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}