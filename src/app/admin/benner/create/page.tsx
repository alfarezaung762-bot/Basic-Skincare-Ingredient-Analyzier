"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import ReactCrop, { centerCrop, makeAspectCrop, Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import AdminHeader from "@/components/admin/AdminHeader";

export default function CreateBannerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("");

  const [formData, setFormData] = useState({
    altText: "",
    isActive: true,
  });

  const [imgSrc, setImgSrc] = useState('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    const profileString = sessionStorage.getItem("adminProfile");
    if (!profileString) {
      router.push("/admin/login");
      return;
    }

    if (profileString) {
      try {
        const profile = JSON.parse(profileString);
        setAdminName(profile.username || "Admin");
        setAdminRole(profile.role || "STAFF");
        const isSuperAdmin = profile.role === "SUPERADMIN";
        const hasPermission = profile.permissions && profile.permissions.includes("MANAGE_BENNER");

        if (!isSuperAdmin && !hasPermission) {
          alert("Akses Ditolak: Anda tidak memiliki izin menambah Banner.");
          router.push("/admin/dashboard");
        }
      } catch (error) {
        sessionStorage.clear();
        router.push("/admin/login");
      }
    }
  }, [router]);

  const handleLogout = () => {
    sessionStorage.clear();
    router.push("/admin/login");
  };

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
    try {
      const crop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height), width, height);
      setCrop(crop);
    } catch (e) {
      // Fallback if makeAspectCrop fails (e.g. image is too narrow/short)
      setCrop(centerCrop({ unit: '%', width: 50, height: 50 }, width, height));
    }
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

    if (!uploadedImage) {
      setMessage({ type: "error", text: "Kegagalan: Anda belum mengunggah foto. Silakan pilih foto, sesuaikan area potongan (crop), lalu klik tombol hijau 'Potong & Tambahkan ke Banner' terlebih dahulu." });
      setIsLoading(false);
      return;
    }

    try {
      const payloadData = {
        ...formData,
        imageUrl: uploadedImage,
      };

      const res = await fetch("/api/admin/benner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadData),
      });

      if (res.ok) {
        // Log action
        const profileStr = sessionStorage.getItem("adminProfile");
        if (profileStr) {
          const profile = JSON.parse(profileStr);
          await fetch("/api/admin/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              adminName: profile.username || "Unknown",
              adminEmail: profile.username || "Unknown",
              adminRole: profile.role,
              action: "CREATE",
              entity: "BANNER",
              details: `Menambahkan banner baru: ${formData.altText || "Tanpa alt text"}`,
            }),
          });
        }

        setMessage({ type: "success", text: "Banner berhasil ditambahkan! 🖼️" });
        setTimeout(() => {
          router.push("/admin/benner");
        }, 1500);
      } else {
        const data = await res.json();
        throw new Error(data.message || "Gagal menyimpan banner.");
      }
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <Link href="/admin/benner" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 transition-colors mb-6 inline-block">
          ← Kembali ke Dasbor Banner
        </Link>

        <AdminHeader 
          adminName={adminName}
          adminRole={adminRole}
          onLogout={handleLogout}
          title="Tambah Banner Baru"
          subtitle="Unggah gambar yang akan ditampilkan pada slider halaman utama."
        />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mt-6">
          {message.text && (
            <div className={`p-4 mb-6 rounded-xl text-sm font-bold border ${message.type === "success" ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4 bg-slate-100 dark:bg-slate-800 p-6 rounded-2xl border-2 border-dashed border-slate-300">
              <label className="text-xs font-bold uppercase text-slate-700">Foto Banner</label>
              
              {uploadedImage && (
                <div className="relative w-full max-w-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden group">
                  <img src={uploadedImage} alt="Banner Preview" className="w-full h-auto object-cover" />
                  <button 
                    type="button" 
                    onClick={() => setUploadedImage(null)}
                    className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              )}

              {!uploadedImage && (
                <input 
                  id="fotoUpload"
                  title="Pilih foto banner"
                  type="file" 
                  accept="image/*" 
                  onChange={onSelectFile} 
                  className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                />
              )}
              
              {imgSrc && !uploadedImage && (
                <div className="flex flex-col items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-inner border border-indigo-100">
                  <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={16 / 9}>
                    <img ref={imgRef} alt="Area potong gambar" src={imgSrc} onLoad={onImageLoad} className="max-h-[400px] rounded-lg border border-slate-200 dark:border-slate-800" />
                  </ReactCrop>
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Geser area terang untuk menyesuaikan potongan gambar.</p>
                  
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
                          setUploadedImage(newUrl);
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
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-xl transition-all shadow-sm disabled:opacity-50"
                  >
                    {isUploadingImage ? "Mengunggah Foto..." : "➕ Potong & Tambahkan ke Banner"}
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="space-y-2">
                <label htmlFor="altText" className="text-xs font-bold text-slate-700 uppercase">Teks Alternatif (Opsional, untuk SEO & Aksesibilitas)</label>
                <input 
                  id="altText"
                  type="text" 
                  placeholder="Contoh: Promo Produk Sabun Muka 20%" 
                  value={formData.altText} 
                  onChange={(e) => setFormData({...formData, altText: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-600 transition-all" 
                />
              </div>

              <label className="flex items-center gap-3 p-4 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 cursor-pointer transition-colors">
                <input 
                  type="checkbox" 
                  checked={formData.isActive} 
                  onChange={(e) => setFormData({...formData, isActive: e.target.checked})} 
                  className="w-6 h-6 accent-emerald-600" 
                />
                <span className="text-sm font-black text-emerald-800 tracking-tight">Tampilkan Banner ini Sekarang (Aktif)</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className="w-full py-4 mt-8 font-bold rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-md text-lg bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isLoading ? "Menyimpan Banner..." : "Simpan Banner 🚀"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
