// src/lib/splitAliases.ts
// =========================================================
// FUNGSI UNIVERSAL PEMISAH ALIAS
// Mendukung format baru (titik koma ";") dan format lama (koma ",")
// Sehingga kompatibel mundur dengan semua data di database.
// =========================================================

/**
 * Membagi string alias menjadi array yang sudah dibersihkan.
 * - Format BARU (disimpan oleh AI/admin): pisah dengan ";"
 * - Format LAMA (data lama di DB): pisah dengan "," (regex khusus agar koma dalam kurung aman)
 */
export function splitAliases(aliasStr: string | null | undefined): string[] {
  if (!aliasStr || !aliasStr.trim()) return [];

  // Deteksi format: jika ada titik koma, gunakan titik koma sebagai pemisah
  if (aliasStr.includes(';')) {
    return aliasStr
      .split(';')
      .map(a => a.replace(/[()]/g, '').trim().toLowerCase())
      .filter(a => a.length > 0);
  }

  // Fallback: format lama dengan koma (koma dalam kurung diabaikan)
  return aliasStr
    .split(/,(?![^()]*\))/g)
    .map(a => a.replace(/[()]/g, '').trim().toLowerCase())
    .filter(a => a.length > 0);
}

/**
 * Versi "raw" tanpa lowercase, untuk ditampilkan ke user (misal di UI).
 */
export function splitAliasesRaw(aliasStr: string | null | undefined): string[] {
  if (!aliasStr || !aliasStr.trim()) return [];

  if (aliasStr.includes(';')) {
    return aliasStr
      .split(';')
      .map(a => a.trim())
      .filter(a => a.length > 0);
  }

  return aliasStr
    .split(/,(?![^()]*\))/g)
    .map(a => a.trim())
    .filter(a => a.length > 0);
}
