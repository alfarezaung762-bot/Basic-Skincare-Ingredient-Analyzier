"use client";

export default function CombineAnalyzer() {
  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <span className="bg-purple-100 text-purple-800 font-black text-lg px-4 py-2 rounded-xl border border-purple-200">02</span>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Combine Skincare</h2>
            <p className="text-sm text-slate-500 mt-1 font-medium">Cek kecocokan antara dua produk sebelum dipakai bersamaan</p>
          </div>
        </div>
      </div>

      <div className="p-10 border-2 border-dashed border-slate-200 rounded-3xl text-center bg-slate-50 flex flex-col items-center justify-center min-h-[300px]">
        <span className="text-5xl mb-4">🚧</span>
        <h3 className="text-xl font-bold text-slate-800">Fitur sedang dalam pengembangan</h3>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          Fitur ini akan segera tersedia! Anda bisa mengecek apakah dua produk aman untuk digabungkan di pembaruan selanjutnya.
        </p>
      </div>
    </div>
  );
}
