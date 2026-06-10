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

  // STATE BARU: Mengecek apakah pengguna hanya pemantau
  const [isViewer, setIsViewer] = useState(false);

  const [formData, setFormData] = useState({
    namaProduk: "",
    tipeProduk: "FACEWASH",
    gambarUrl: "",
    tautanAfiliasi: "",
    komposisiAsli: "",
    isPinKreator: false,
    masalahKulitPin: "",
    catatanKreator: "",
    tagKhusus: "",
  });

  const [skinTypes, setSkinTypes] = useState({
    "Berminyak": false,
    "Kering": false,
    "Kombinasi": false,
    "Normal": false,
    "Sensitif": false,
  });

  const handleSkinTypeChange = (st: keyof typeof skinTypes) => {
    setSkinTypes(prev => ({ ...prev, [st]: !prev[st] }));
  };

  const [initialData, setInitialData] = useState<any>(null);

  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [focuses, setFocuses] = useState({
    "Mencerahkan & Bekas Jerawat": false,
    "Merawat Jerawat & Sebum": false,
    "Anti-Aging & Garis Halus": false,
    "Memperbaiki Skin Barrier & Hidrasi": false,
    "Menenangkan Kemerahan (Soothing)": false,
    "Eksfoliasi & Tekstur Pori-pori": false,
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
      const hasPermission = profile.permissions && profile.permissions.includes("MANAGE_KATALOG");

      // Tolak jika bukan Superadmin, bukan Viewer, dan tidak punya izin Manage Katalog
      if (!isSuperAdmin && !isViewOnly && !hasPermission) {
        alert("Akses Ditolak: Anda tidak memiliki wewenang di Katalog Produk.");
        router.push("/admin/dashboard");
        return;
      }

      setIsViewer(isViewOnly);

      // Lanjutkan penarikan data jika lolos keamanan
      if (params.id) {
        fetch("/api/admin/products")
          .then((res) => res.json())
          .then((data) => {
            const product = data.find((p: any) => p.id === params.id);
            if (product) {
              setInitialData(product);
              setFormData({
                namaProduk: product.namaProduk,
                tipeProduk: product.tipeProduk,
                gambarUrl: product.gambarUrl || "",
                tautanAfiliasi: product.tautanAfiliasi,
                komposisiAsli: product.komposisiAsli,
                isPinKreator: product.isPinKreator,
                masalahKulitPin: product.masalahKulitPin || "",
                catatanKreator: product.catatanKreator || "",
                tagKhusus: product.tagKhusus || "",
              });

              // Load targetSkinTypes
              if (product.targetSkinTypes) {
                const selectedSTs = product.targetSkinTypes.split(",").map((s: string) => s.trim());
                setSkinTypes(prev => {
                  const newST = { ...prev };
                  selectedSTs.forEach((st: string) => {
                    if (st in newST) newST[st as keyof typeof prev] = true;
                  });
                  return newST;
                });
              }
              
              if (product.gambarUrl) {
                setUploadedImages(product.gambarUrl.split(",").filter((u: string) => u.trim() !== ""));
              }

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
    } catch (error) {
      sessionStorage.clear();
      router.push("/admin/login");
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

    // Pencegahan ganda jika Viewer mencoba meretas fungsi submit
    if (isViewer) {
      alert("Mode Pemantau: Anda tidak diizinkan menyimpan perubahan data.");
      return;
    }

    setIsLoading(true);
    setMessage({ type: "", text: "" });

    const selectedFocuses = Object.entries(focuses)
      .filter(([_, isChecked]) => isChecked)
      .map(([key]) => key)
      .join(", ");

    const selectedSkinTypes = Object.entries(skinTypes)
      .filter(([_, isChecked]) => isChecked)
      .map(([key]) => key)
      .join(",");

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

    if (uploadedImages.length === 0) {
      setMessage({ type: "error", text: "Kegagalan: Anda harus mengunggah dan menambahkan minimal 1 foto produk." });
      setIsLoading(false);
      return;
    }

    try {
      const finalImageUrl = uploadedImages.join(",");

      const payloadData = {
        id: params.id, 
        ...formData,
        gambarUrl: finalImageUrl, 
        fokusProduk: selectedFocuses,
        targetSkinTypes: selectedSkinTypes || null,
      };

      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadData),
      });

      if (res.ok) {
        // --- LOG ACTION ---
        const profileStr = sessionStorage.getItem("adminProfile");
        if (profileStr) {
          try {
            const profile = JSON.parse(profileStr);
            
            // --- DETEKSI PERUBAHAN ---
            const changedFields = [];
            if (initialData) {
              if (formData.namaProduk !== initialData.namaProduk) changedFields.push("Nama Lengkap & Merek");
              if (formData.tipeProduk !== initialData.tipeProduk) changedFields.push("Tipe Kategori Produk");
              if (finalImageUrl !== (initialData.gambarUrl || "")) changedFields.push("Gambar Produk");
              if (formData.tautanAfiliasi !== initialData.tautanAfiliasi) changedFields.push("Tautan Pembelian (Afiliasi)");
              if (formData.komposisiAsli !== initialData.komposisiAsli) changedFields.push("Daftar Komposisi Penuh (Ingredients)");
              if (formData.isPinKreator !== initialData.isPinKreator) changedFields.push("Pin Kreator");
              if (formData.masalahKulitPin !== (initialData.masalahKulitPin || "")) changedFields.push("Tombol Pelatuk");
              if (formData.catatanKreator !== (initialData.catatanKreator || "")) changedFields.push("Catatan Pribadi Kreator");
              if (selectedFocuses !== (initialData.fokusProduk || "")) changedFields.push("Fokus Perawatan");
            }
            const changeText = changedFields.length > 0 ? ` (Perubahan: ${changedFields.join(", ")})` : "";

            await fetch("/api/admin/log", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                adminName: profile.username || "Unknown",
                adminEmail: profile.username || "Unknown",
                adminRole: profile.role,
                action: "UPDATE",
                entity: "PRODUCT",
                details: `Mengubah data produk: ${formData.namaProduk}${changeText}`,
              }),
            });
          } catch (e) {
            console.error("Gagal menyimpan log:", e);
          }
        }
        // --- END LOG ACTION ---

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
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/products" className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6 inline-block">
          ← Kembali ke Dasbor Produk
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h1 className="text-2xl font-black text-slate-900 mb-2">Ubah Data Produk ✍️</h1>
          <p className="text-sm text-slate-500 mb-6 font-medium">Perbarui informasi produk afiliasi di bawah ini.</p>

          {/* PERINGATAN VIEWER */}
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

            {/* Bagian Edit Gambar & Cropper */}
            <div className="space-y-4 bg-slate-100 p-6 rounded-2xl border-2 border-dashed border-slate-300 relative overflow-hidden">
              {isViewer && <div className="absolute inset-0 bg-slate-100/50 cursor-not-allowed z-20"></div>}
              
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase text-slate-700">Galeri Foto Produk (Bisa lebih dari 1)</label>
                <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">{uploadedImages.length} Foto Ditambahkan</span>
              </div>
              
              {/* Daftar Foto yang Sudah Diunggah */}
              {uploadedImages.length > 0 && (
                <div className="flex flex-wrap gap-4 mb-4">
                  {uploadedImages.map((url, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden group">
                      <img src={url} alt={`Preview ${idx+1}`} className="w-full h-full object-cover" />
                      {!isViewer && (
                        <button 
                          type="button" 
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <input 
                id="fotoUpload"
                title="Pilih foto produk"
                type="file" 
                accept="image/*" 
                onChange={onSelectFile} 
                disabled={isViewer}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer disabled:opacity-50"
              />
              
              {imgSrc && !isViewer && (
                <div className="flex flex-col items-center gap-4 bg-white p-4 rounded-xl shadow-inner border border-blue-100 mt-4">
                  <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1}>
                    <img ref={imgRef} alt="Area potong gambar" src={imgSrc} onLoad={onImageLoad} className="max-h-[300px] rounded-lg border border-slate-200" />
                  </ReactCrop>
                  <p className="text-[11px] font-medium text-slate-500">Geser area terang untuk menyesuaikan potongan gambar (Rasio 1:1).</p>
                  
                  <div className="flex gap-2 w-full">
                    <button type="button" onClick={() => {setImgSrc(''); setCompletedCrop(undefined)}} className="flex-1 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-all border border-red-200">
                      Batal
                    </button>
                    <button
                      type="button"
                      disabled={isUploadingImage || !completedCrop}
                      onClick={async () => {
                        if (!completedCrop || !imgRef.current) return;
                        setIsUploadingImage(true);
                        try {
                          const canvas = document.createElement('canvas');
                          const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
                          const scaleY = imgRef.current.naturalHeight / imgRef.current.height;
                          canvas.width = completedCrop.width;
                          canvas.height = completedCrop.height;
                          const ctx = canvas.getContext('2d');
                          if (ctx) {
                            ctx.drawImage(imgRef.current, completedCrop.x * scaleX, completedCrop.y * scaleY, completedCrop.width * scaleX, completedCrop.height * scaleY, 0, 0, completedCrop.width, completedCrop.height);
                            const newUrl = await uploadToCloudinary(canvas);
                            setUploadedImages(prev => [...prev, newUrl]);
                            setImgSrc('');
                            setCrop(undefined);
                            setCompletedCrop(undefined);
                          }
                        } catch (error) {
                          alert("Gagal mengunggah gambar. Silakan coba lagi.");
                        } finally {
                          setIsUploadingImage(false);
                        }
                      }}
                      className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-all shadow-sm disabled:opacity-50"
                    >
                      {isUploadingImage ? "Menambahkan..." : "➕ Tambahkan"}
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
                  disabled={isViewer}
                  type="text" 
                  value={formData.namaProduk} 
                  onChange={(e) => setFormData({...formData, namaProduk: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 transition-all disabled:bg-slate-100 disabled:text-slate-500" 
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="tipeProduk" className="text-xs font-bold text-slate-700 uppercase">Tipe Kategori Produk</label>
                <select 
                  id="tipeProduk"
                  title="Tipe Produk"
                  disabled={isViewer}
                  value={formData.tipeProduk} 
                  onChange={(e) => setFormData({...formData, tipeProduk: e.target.value})} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
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
                disabled={isViewer}
                type="url" 
                value={formData.tautanAfiliasi} 
                onChange={(e) => setFormData({...formData, tautanAfiliasi: e.target.value})}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500" 
              />
            </div>

            {/* Komposisi Asli */}
            <div className="space-y-2">
              <label htmlFor="komposisiAsli" className="text-xs font-bold text-slate-700 uppercase">Daftar Komposisi Penuh (Ingredients)</label>
              <textarea 
                id="komposisiAsli"
                required 
                disabled={isViewer}
                rows={4} 
                value={formData.komposisiAsli} 
                onChange={(e) => setFormData({...formData, komposisiAsli: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none text-sm font-medium resize-none bg-white text-slate-900 focus:ring-2 focus:ring-blue-600 disabled:bg-slate-100 disabled:text-slate-500" 
              />
            </div>

            {/* Fokus Produk */}
            <div className={`space-y-3 pt-4 border-t border-slate-100 ${isViewer ? 'opacity-80 pointer-events-none' : ''}`}>
              <label className="text-xs font-bold text-slate-700 uppercase">Fokus Perawatan (Pilih minimal satu)</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {(Object.keys(focuses) as Array<keyof typeof focuses>).map((focus) => (
                  <label key={focus} htmlFor={`focus-${focus}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                    <input 
                      id={`focus-${focus}`}
                      title={`Pilih fokus ${focus}`}
                      type="checkbox" 
                      disabled={isViewer}
                      checked={focuses[focus]} 
                      onChange={() => handleFocusChange(focus)} 
                      className="w-5 h-5 accent-blue-600 disabled:cursor-not-allowed" 
                    />
                    <span className="text-sm font-bold text-slate-800">{focus}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Jenis Kulit */}
            <div className={`space-y-3 pt-4 border-t border-slate-100 ${isViewer ? 'opacity-80 pointer-events-none' : ''}`}>
              <label className="text-xs font-bold text-slate-700 uppercase">Target Jenis Kulit (Opsional)</label>
              <p className="text-[10px] text-slate-500 font-medium -mt-1">Pilih jenis kulit yang paling cocok menggunakan produk ini.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {(Object.keys(skinTypes) as Array<keyof typeof skinTypes>).map((st) => (
                  <label key={st} htmlFor={`skin-${st}`} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
                    <input 
                      id={`skin-${st}`}
                      title={`Target kulit ${st}`}
                      type="checkbox" 
                      disabled={isViewer}
                      checked={skinTypes[st]} 
                      onChange={() => handleSkinTypeChange(st)} 
                      className="w-5 h-5 accent-teal-600 disabled:cursor-not-allowed" 
                    />
                    <span className="text-sm font-bold text-slate-800">{st}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tag Khusus */}
            <div className="space-y-2 pt-4 border-t border-slate-100">
              <label htmlFor="tagKhusus" className="text-xs font-bold text-slate-700 uppercase">Tag Khusus (Opsional)</label>
              <p className="text-[10px] text-slate-500 font-medium -mt-1">Pisahkan dengan koma. Contoh: fragrance-free, alcohol-free, vegan</p>
              <input 
                id="tagKhusus"
                type="text" 
                disabled={isViewer}
                placeholder="fragrance-free, alcohol-free, vegan" 
                value={formData.tagKhusus} 
                onChange={(e) => setFormData({...formData, tagKhusus: e.target.value})}
                className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-teal-600 transition-all disabled:bg-slate-100 disabled:text-slate-500" 
              />
            </div>

            {/* Pin Kreator */}
            <div className="space-y-6 pt-6 border-t border-slate-100">
              <label htmlFor="isPinKreator" className={`flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 cursor-pointer transition-colors ${isViewer ? 'opacity-80 pointer-events-none' : ''}`}>
                <input 
                  id="isPinKreator"
                  title="Jadikan Pin Kreator"
                  type="checkbox" 
                  disabled={isViewer}
                  checked={formData.isPinKreator} 
                  onChange={(e) => setFormData({...formData, isPinKreator: e.target.checked})} 
                  className="w-6 h-6 accent-amber-600 disabled:cursor-not-allowed" 
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
                      disabled={isViewer}
                      value={formData.masalahKulitPin} 
                      onChange={(e) => setFormData({...formData, masalahKulitPin: e.target.value})} 
                      className="w-full px-4 py-3 rounded-xl border border-amber-200 bg-white text-slate-900 outline-none text-sm font-medium focus:ring-2 focus:ring-amber-500 disabled:bg-amber-100 disabled:text-amber-800"
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
                      disabled={isViewer}
                      rows={3} 
                      value={formData.catatanKreator} 
                      onChange={handleCatatanChange} 
                      className="w-full px-4 py-3 rounded-xl border border-amber-200 outline-none text-sm font-medium resize-none bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 disabled:bg-amber-100 disabled:text-amber-800" 
                    />
                  </div>
                </motion.div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isLoading || isViewer} 
              className={`w-full py-4 mt-8 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-md text-lg ${isViewer ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-slate-900 hover:bg-black text-white'}`}
            >
              {isLoading ? "Menyimpan Pembaruan..." : isViewer ? "Hanya Pantau (Read-Only) 👁️" : "Simpan Perubahan Data ✍️"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}