// src/lib/splitAliases.ts
// =========================================================
// FUNGSI UNIVERSAL PEMISAH ALIAS
// Mendukung format baru (titik koma ";") dan format lama (koma ",")
// Sehingga kompatibel mundur dengan semua data di database.
// =========================================================

/**
 * Membagi string alias menjadi array yang sudah dibersihkan.
 * - Mendukung pemisahan dengan ";" ATAU "," (selama koma tidak berada di dalam kurung)
 */
export function splitAliases(aliasStr: string | null | undefined): string[] {
  if (!aliasStr || !aliasStr.trim()) return [];

  return aliasStr
    .split(/;|,(?![^()]*\))/g)
    .map(a => a.replace(/[()]/g, '').trim().toLowerCase())
    .filter(a => a.length > 0);
}

/**
 * Versi "raw" tanpa lowercase, untuk ditampilkan ke user (misal di UI).
 */
export function splitAliasesRaw(aliasStr: string | null | undefined): string[] {
  if (!aliasStr || !aliasStr.trim()) return [];

  return aliasStr
    .split(/;|,(?![^()]*\))/g)
    .map(a => a.trim())
    .filter(a => a.length > 0);
}
