// src/lib/pemisahBahan.ts

/**
 * Utilitas untuk membersihkan dan memisahkan daftar bahan baku.
 * Digunakan baik oleh frontend (untuk menghitung) maupun backend (untuk dianalisis).
 * @param rawText String mentah dari input pengguna
 * @returns Array string berisi bahan-bahan yang sudah dipisah dan dibersihkan
 */
export function ekstrakDaftarBahan(rawText: string): string[] {
  if (!rawText) return [];

  // Hapus zero-width spaces (\u200b, \u200c, \u200d, \ufeff) dan normalisasi non-breaking spaces (\u00a0)
  let text = rawText
    .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/\u00a0/g, ' ');

  // 1. Ganti pemisah-pemisah tidak standar menjadi koma
  // Seperti kata hubung "dan", "and", "&", tanda "•", "-" (jika diapit spasi)
  text = text.replace(/\b(dan|and)\b/gi, ',');
  text = text.replace(/&/g, ',');
  text = text.replace(/•/g, ',');
  text = text.replace(/\s-\s/g, ',');

  // 2. Cegah kata yang dempet karena typo copy-paste (CamelCase)
  // [DIHAPUS] Fitur ini dimatikan karena merusak bahan valid bersistem kapital (BeeSwax, PolyQuaternium, dll).
  // Di dunia nyata, 100% komposisi menggunakan tanda baca koma/titik koma.

  // 2.5. NORMALISASI SLASH (Spasi sebelum slash → tanpa spasi)
  // Banyak kemasan Indonesia menulis "Caprylic/ Capric" dengan spasi setelah slash.
  // Database menyimpan "Caprylic/Capric" tanpa spasi → mismatch fatal.
  // Regex: mendeteksi "/ " (slash diikuti spasi) dan mengganti jadi "/" (slash saja)
  text = text.replace(/\/\s+/g, '/');

  // 3. HAPUS PERSENTASE SECARA AMAN (BUKAN MENGHAPUS SEMUA ANGKA!)
  // Menghapus: "10%", "0.5%", "10 %", "(0.5%)", "(0.02%)", "(0)"
  // Langkah A: Hapus angka persentase yang ada di dalam kurung, termasuk kurungnya
  // Contoh: "Triethanolamine (0.5%)" → "Triethanolamine"
  // Contoh: "Phenoxyethanol(0)" → "Phenoxyethanol"
  text = text.replace(/\s*\([0-9]+(?:\.[0-9]+)?\s*%?\)/g, '');
  // Langkah B: Hapus persentase biasa (tanpa kurung)
  // Contoh: "Homosalate 5%" → "Homosalate"
  text = text.replace(/[0-9]+(?:\.[0-9]+)?\s*%/g, '');

  // 3.5. LINDUNGI ANGKA DENGAN KOMA (Misal: 1,2-Hexanediol)
  // Ganti digit-koma-digit HANYA jika koma LANGSUNG menempel tanpa spasi
  // "1,2-Hexanediol" → dilindungi ✅ (koma langsung antara 1 dan 2)
  // "Glycereth-26, 1,2-Hexanediol" → koma pemisah TIDAK dilindungi ✅ (ada spasi setelah koma)
  text = text.replace(/(\d),(\d)/g, '$1__KOMA__$2');

  // 4. Pisahkan berdasarkan koma, titik koma, atau baris baru (newline)
  // PENTING: Jangan memotong koma yang berada di dalam kurung!
  // (?![^()]*\)) memastikan tidak ada tanda tutup kurung setelah koma tersebut
  const parts = text.split(/[,;\n](?![^()]*\))/g);

  // 5. Bersihkan karakter khusus yang tersisa, kembalikan placeholder koma, dan bersihkan spasi
  let cleanedParts = parts
    .map(item => {
      let cleaned = item.replace(/[\[\]\{\}\*"\u201C\u201D]/g, ' '); // Ganti kurung siku/kurawal/bintang/tanda kutip OCR dengan spasi
      cleaned = cleaned.replace(/__KOMA__/g, ','); // Kembalikan koma pada angka (1,2-Hexanediol)
      cleaned = cleaned.replace(/\.+$/g, ''); // Hapus titik di akhir kata (sering muncul dari OCR/copy-paste, misal: "Disodium Edta.")
      cleaned = cleaned.replace(/\(\s*\)/g, ''); // Hapus kurung kosong sisa pembersihan persentase, misal: "Triethanolamine ()" → "Triethanolamine"
      cleaned = cleaned.replace(/\s+/g, ' ').trim().toLowerCase(); // Normalisasi spasi
      return cleaned;
    })
    .filter(item => item.length > 0);

  // 6. Deduplikasi kata berturut-turut yang tidak perlu (seperti "oil oil", "extract extract", dll)
  // Pengecualian kata "ylang" agar jika ada "ylang ylang" tidak rusak
  cleanedParts = cleanedParts.map(item => {
    // Regex mendeteksi kata berulang berurutan dan menggantinya dengan satu kata
    let deduplicated = item.replace(/\b(?!ylang\b)(\w+)\s+\1\b/gi, '$1');
    // Jalankan sekali lagi untuk menangani kasus triple (jika ada)
    deduplicated = deduplicated.replace(/\b(?!ylang\b)(\w+)\s+\1\b/gi, '$1');
    return deduplicated.replace(/\s+/g, ' ').trim();
  });

  // Kembalikan array hasil
  return cleanedParts;
}
