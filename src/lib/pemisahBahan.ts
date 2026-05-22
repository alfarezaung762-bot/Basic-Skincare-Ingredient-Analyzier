// src/lib/pemisahBahan.ts

/**
 * Utilitas untuk membersihkan dan memisahkan daftar bahan baku.
 * Digunakan baik oleh frontend (untuk menghitung) maupun backend (untuk dianalisis).
 * @param rawText String mentah dari input pengguna
 * @returns Array string berisi bahan-bahan yang sudah dipisah dan dibersihkan
 */
export function ekstrakDaftarBahan(rawText: string): string[] {
  if (!rawText) return [];

  let text = rawText;

  // 1. Ganti pemisah-pemisah tidak standar menjadi koma
  // Seperti kata hubung "dan", "and", "&", tanda "•", "-" (jika diapit spasi)
  text = text.replace(/\b(dan|and)\b/gi, ',');
  text = text.replace(/&/g, ',');
  text = text.replace(/•/g, ',');
  text = text.replace(/\s-\s/g, ',');

  // 2. Cegah kata yang dempet karena typo copy-paste (CamelCase)
  // Misal: "GlikolKlorfenesin" -> "Glikol, Klorfenesin"
  // Hanya berlaku jika huruf kecil diikuti huruf besar tanpa spasi.
  text = text.replace(/([a-z])([A-Z])/g, '$1, $2');

  // 3. HAPUS PERSENTASE SECARA AMAN (BUKAN MENGHAPUS SEMUA ANGKA!)
  // Menghapus: "10%", "0.5%", "10 %"
  text = text.replace(/[0-9]+(?:\.[0-9]+)?\s*%/g, '');

  // 3.5. LINDUNGI ANGKA DENGAN KOMA (Misal: 1,2-Hexanediol)
  // Ganti digit-koma-digit dengan placeholder sementara
  text = text.replace(/(\d)\s*,\s*(\d)/g, '$1__KOMA__$2');

  // 4. Pisahkan berdasarkan koma, titik koma, atau baris baru (newline)
  // PENTING: Jangan memotong koma yang berada di dalam kurung!
  // (?![^()]*\)) memastikan tidak ada tanda tutup kurung setelah koma tersebut
  const parts = text.split(/[,;\n](?![^()]*\))/g);

  // 5. Bersihkan karakter khusus yang tersisa, kembalikan placeholder koma, dan bersihkan spasi
  let cleanedParts = parts
    .map(item => {
      let cleaned = item.replace(/[\(\)\[\]\{\}\*]/g, ' '); // Ganti kurung dengan spasi agar kata tidak menempel
      cleaned = cleaned.replace(/__KOMA__/g, ','); // Kembalikan koma pada angka (1,2-Hexanediol)
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
