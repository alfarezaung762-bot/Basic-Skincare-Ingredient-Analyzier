// src/lib/deepResearchRules.ts
// Aturan Deep Research per parameter — digunakan oleh route.ts DAN export downloadfile

/**
 * Mapping kolom UI → aturan parameter Deep Research
 * Key = nama kolom di checkbox export
 * Value = teks aturan lengkap yang akan disertakan di prompt
 */
export const PARAMETER_RULES: Record<string, { label: string; rule: string }> = {

  type: {
    label: "Sifat Kimia & Level Kekuatan",
    rule: `[SIFAT KIMIA / type]
- HARSH (Keras/Eksfoliator): Bahan pengelupas atau aktif kuat yang berpotensi memicu iritasi dan berisiko merusak skin barrier alami jika digunakan berlebihan.
- BUFFER (Penyokong/Penenang): Bahan pendukung yang TIDAK "menyembuhkan" kulit, melainkan meredakan inflamasi dan menyediakan lingkungan/komponen penyokong yang ideal agar skin barrier dapat memulihkan dirinya sendiri secara alami.
- TOXIC: Dilarang mutlak/karsinogenik (FDA/SCCS).
- BASIC: Bahan netral, pelarut, pengemulsi, pengawet yang aman.

[LEVEL KEKUATAN / strengthLevel] (SKALA 1-3)
Jika BASIC atau TOXIC, WAJIB bernilai 1.
JIKA HARSH (Evaluasi Penetrasi Molekuler):
- 1 (Rendah/Lembut): Molekul besar (PHA, LHA, Mandelic). Meresap lambat di permukaan, ramah pemula.
- 2 (Menengah): Molekul sedang (Lactic Acid, Salicylic Acid standar). Penetrasi moderat.
- 3 (Sangat Kuat): Molekul amat kecil (Glycolic Acid, Retinol murni) yang menembus kulit dengan sangat cepat dan dalam.

JIKA BUFFER (Evaluasi Daya Sokong Inflamasi):
- 1 (Rendah/Lembut): Ekstrak tumbuhan dasar sebagai hidrasi penyokong (Aloe Vera, Chamomile extract).
- 2 (Menengah): Senyawa murni dengan uji klinis penenang standar (Panthenol 2-5%).
- 3 (Sangat Kuat): Isolat tingkat medis untuk meredam inflamasi berat (Madecassoside murni, Kompleks Ceramide NP/AP/EOP tinggi).`
  },

  functionalCategory: {
    label: "Fungsi Khusus",
    rule: `[FUNGSI KHUSUS / functionalCategory]
- PELEMBAP_HUMEKTAN (Pelembap Air/Ringan): Bahan yang menarik dan mengikat molekul air ke dalam kulit (Contoh: Glycerin, Hyaluronic Acid, Propylene Glycol).
- PELEMBAP_EMOLIEN (Pelembap Lipid/Sedang): Bahan yang mengisi celah antar sel kulit untuk menghaluskan dan melembutkan (Contoh: Ceramide, Squalane, Fatty Alcohols).
- PELEMBAP_OKLUSIF (Pelembap Minyak/Tebal): Bahan yang membentuk lapisan kedap air di atas kulit untuk mengunci kelembapan (Contoh: Petrolatum, Shea Butter, Mineral Oil).
- SURFAKTAN (Sabun): Pembersih wajah atau pembentuk busa.
- UV_FILTER (Tabir Surya): Bahan pelindung dari sinar UVA/UVB (Contoh: Zinc Oxide, Avobenzone).
- UMUM (Lainnya): Gunakan jika bahan sama sekali tidak masuk dalam kategori di atas.`
  },

  targetFocus: {
    label: "Fokus Perawatan",
    rule: `[FOKUS PERAWATAN / targetFocus]
HANYA pilih dari nilai persis berikut (boleh dikombinasi dengan koma):

"Mencerahkan & Bekas Jerawat":
  Bahan yang TERBUKTI menghambat tirosinase, mempercepat turnover sel, atau memudarkan hiperpigmentasi pasca-inflamasi (PIH).
  Contoh bahan: Arbutin, Tranexamic Acid, Vitamin C (L-Ascorbic Acid), Kojic Acid, Licorice Root Extract (Glabridin).

"Mengatasi Jerawat & Mengontrol Sebum":
  Bahan yang TERBUKTI antibakteri terhadap C.acnes, mengurangi produksi sebum, atau membersihkan pori tersumbat.
  Contoh bahan: Salicylic Acid, Benzoyl Peroxide, Niacinamide, Zinc PCA, Tea Tree Oil, Sulfur.

"Mengencangkan & Menyamarkan Garis Halus":
  Bahan yang TERBUKTI merangsang sintesis kolagen, mengurangi kerutan, atau melindungi dari kerusakan oksidatif/photoaging.
  Contoh bahan: Retinol, Peptides (Matrixyl, Argireline), Adenosine, Bakuchiol, Resveratrol, Vitamin E (Tocopherol).

"Memperbaiki Skin Barrier & Hidrasi":
  Bahan yang memperkuat lapisan lipid kulit, mengisi celah antar korneosit, atau mengikat air secara efektif.
  Contoh bahan: Ceramide NP/AP/EOP, Cholesterol, Hyaluronic Acid, Squalane, Fatty Acids (Linoleic Acid), Urea.

"Menenangkan Kemerahan (Soothing)":
  Bahan yang TERBUKTI anti-inflamasi, meredam eritema, atau mengurangi TEWL (Trans-Epidermal Water Loss).
  Contoh bahan: Centella Asiatica (Madecassoside, Asiaticoside), Panthenol, Bisabolol, Allantoin, Colloidal Oatmeal.

"Eksfoliasi & Mengurangi Tampilan Pori-pori":
  Bahan yang melarutkan ikatan antar sel mati (desmosomes) secara kimia atau secara fisik mengangkat sel tanduk.
  Contoh bahan: Glycolic Acid, Lactic Acid, PHA (Gluconolactone), Enzim Papain, BHA (Salicylic Acid), Azelaic Acid.

ATURAN: WAJIB ISI jika bahan memiliki efek terapeutik TERBUKTI. KOSONGKAN hanya jika bahan murni pelarut/pengawet/pengemulsi tanpa efek terapeutik langsung.`
  },

  comedogenicRating: {
    label: "Tingkat Komedogenik (0-5)",
    rule: `[TINGKAT KOMEDOGENIK / comedogenicRating] (SKALA 0-5)
Berikan rating secara presisi berdasarkan literatur dermatologi terverifikasi.
- 0 = TIDAK KOMEDOGENIK: Tidak menyumbat pori, larut air/non-oklusif. (Contoh: Niacinamide, Glycerin, Hyaluronic Acid, Panthenol).
- 1 = SANGAT RENDAH: Aman untuk 99% tipe kulit. (Contoh: Squalane, Dimethicone, Ceramide).
- 2 = RINGAN: Bisa memicu komedo HANYA pada kulit sangat acne-prone. (Contoh: Cetyl Alcohol, Hexylene Glycol).
- 3 = SEDANG: Umum memicu komedo dan penumpukan sebum pada kulit berminyak. (Contoh: Stearic Acid, Avocado Oil, Soybean Oil).
- 4 = TINGGI: Sangat oklusif, memicu breakout pada mayoritas kulit. (Contoh: Coconut Oil, Cocoa Butter, Cetearyl Ceteareth-20).
- 5 = SANGAT KOMEDOGENIK: Hampir pasti memicu jerawat parah. (Contoh: Isopropyl Myristate, Isopropyl Palmitate, Wheat Germ Oil).

ATURAN WAJIB KOMEDOGENIK: 
Jika bahan memiliki rating 3, 4, atau 5, WAJIB memberikan catatan bahwa potensi menyumbat pori ini BISA TURUN DRASTIS jika bahan hanya digunakan pada konsentrasi sangat rendah (sebagai pelarut/pengemulsi) atau digunakan dalam produk bilas (Facewash).`
  },

  safeForPregnancy: {
    label: "Keamanan Kehamilan",
    rule: `[KEAMANAN KEHAMILAN / safeForPregnancy]
- false HANYA jika masuk FDA Pregnancy Category X/D, atau ACOG/dermatologi secara eksplisit melarang. (Contoh false: Retinoid, Hydroquinone, Salicylic Acid >2%, Formaldehyde).
- true jika tidak ada bukti klinis risiko atau studi menunjukkan aman.`
  },

  safeForSensitive: {
    label: "Keamanan Kulit Sensitif",
    rule: `[DEFINISI KULIT SENSITIF — UNTUK PARAMETER safeForSensitive]
Kulit sensitif BUKAN tipe kulit bawaan lahir. Kulit sensitif adalah KONDISI kulit dimana:
- Skin barrier (lapisan stratum corneum) rusak atau melemah, menyebabkan TEWL tinggi.
- Ujung saraf di epidermis lebih terekspos, sehingga mudah bereaksi terhadap stimulus ringan.
- Termasuk: dermatitis kontak, rosacea ringan, post-prosedur kulit (laser/chemical peel), kulit atopik.
- Bahan yang TIDAK AMAN: SLS, Alkohol Denat tinggi, Glycolic Acid >10%, Retinol >0.5%, Fragrance sintetis, Essential Oil konsentrasi tinggi.
- Bahan yang AMAN walau aktif: Niacinamide ≤5%, Centella Asiatica, Panthenol, Ceramide, Allantoin, Bisabolol.`
  },

  blacklistedSkinTypes: {
    label: "Blacklist Tipe Kulit",
    rule: `[ATURAN BLACKLIST / blacklistedSkinTypes]
Blacklist memiliki DAMPAK SANGAT BERAT bagi pengguna. HANYA blacklist jika ada BUKTI KLINIS KUAT bahwa bahan ini BERBAHAYA (bukan hanya "kurang ideal") untuk tipe kulit tersebut.

Contoh LAYAK blacklist per tipe kulit:
- Kulit Kering: SLS/SLES, Alkohol Denat konsentrasi tinggi.
- Kulit Berminyak: Petrolatum/Mineral Oil konsentrasi tinggi, Lanolin murni.
- Kulit Kombinasi: SLS (terlalu harsh di zona kering) ATAU Petrolatum tebal (terlalu berat di zona T).
- Kulit Normal: SANGAT JARANG di-blacklist. Hanya bahan TOXIC atau iritan kuat universal.

Contoh TIDAK LAYAK blacklist:
- Glycerin untuk kulit Berminyak (humektan ringan, AMAN untuk semua).
- Niacinamide untuk kulit Sensitif (justru memperbaiki barrier pada konsentrasi ≤5%).`
  },

  isKeyActive: {
    label: "Bahan Aktif Utama (Key Active)",
    rule: `[BAHAN AKTIF UTAMA / isKeyActive]
true HANYA jika bahan ini diakui secara klinis sebagai active ingredient utama dalam formulasi skincare (seperti Retinol, Niacinamide, Vitamin C, AHA/BHA, Hyaluronic Acid).
false untuk bahan pendukung seperti pelarut, pengawet, pengemulsi, fragrance.`
  },

  benefits: {
    label: "Manfaat Singkat (Bahasa Awam)",
    rule: `[ATURAN BAHASA MANFAAT / benefits]
- Wajib menggunakan bahasa yang BISA DIPAHAMI OLEH ANAK SMA (maks 30 kata).
- Contoh Benar: "Membantu meredakan kemerahan dan melembapkan kulit."
- DILARANG menggunakan jargon kimia atau istilah medis yang tidak umum.`
  },

  aiContext: {
    label: "Analisis Mendalam AI (aiContext)",
    rule: `[ATURAN KHUSUS aiContext — SECTION WAJIB]
aiContext adalah analisis mendalam MINIMAL 1000 KATA dengan struktur wajib:

[RISIKO KRITIS & KEHAMILAN] — Data toksikologi dan keamanan kehamilan.
[EFEK SAMPING] — Efek samping klinis yang terverifikasi.
[AMBANG KONSENTRASI & DOSE-RESPONSE] — KRITIS untuk scoring:
  1. AMBANG TERAPEUTIK: Konsentrasi efektif minimum.
  2. AMBANG IRITASI: Konsentrasi yang mulai menimbulkan efek samping.
  3. RELEVANSI POSISI INCI: Apakah efek negatif masih relevan di konsentrasi <1%?
  4. WASH-OFF vs LEAVE-ON: Konsentrasi aman untuk masing-masing tipe produk.
[BUKTI KLINIS] — Studi klinis dan referensi jurnal.
[IDENTITAS] — Rumus kimia, sifat fisik, golongan senyawa.
[MEKANISME KERJA] — Cara kerja bahan di tingkat seluler.
[pH & KONSENTRASI AMAN] — Rentang pH stabil dan konsentrasi aman.
[INTERAKSI TERVERIFIKASI] — Format terstruktur:
  - SINERGI: Bahan yang meningkatkan efektivitas + mekanismenya.
  - ANTAGONIS: Bahan yang menghambat/merusak efektivitas.
  - PENETRAL: Bahan yang mampu menetralisir efek negatif.
[PENETRASI & DURASI] — Kemampuan penetrasi stratum corneum dan durasi kerja.`
  },

  aliases: {
    label: "Sinonim / Alias",
    rule: `[SINONIM / aliases]
Sertakan semua nama alternatif yang digunakan dalam label produk skincare, termasuk:
- Nama INCI resmi standar internasional (PCPC)
- Nama umum dalam bahasa Indonesia
- Nama umum dalam bahasa Inggris
- Variasi label yang sering muncul di pasaran`
  },
};

/**
 * Mapping kolom → key sumber prioritas di DB config
 */
export const COLUMN_TO_SOURCE_KEY: Record<string, string> = {
  comedogenicRating: "komedogenik",
  type: "sifatKimia",
  // strengthLevel termasuk dalam "type"
  functionalCategory: "fungsiKhusus",
  safeForPregnancy: "amanBumilSensitif",
  safeForSensitive: "amanBumilSensitif",
  isKeyActive: "bahanAktif",
  targetFocus: "fokusPerawatan",
  blacklistedSkinTypes: "dilarangKeras",
  aiContext: "analisisMendalam",
  benefits: "manfaatSingkat",
};
