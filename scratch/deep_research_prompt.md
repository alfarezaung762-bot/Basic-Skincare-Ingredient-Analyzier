# PROMPT UNTUK GEMINI DEEP RESEARCH: REFAKTORISASI 72 ATURAN KLINIS SKINCARE (VERSI LENGKAP & SPESIFIK)

Salin seluruh teks di bawah ini dan masukkan ke AI Deep Research (seperti Gemini 1.5 Pro atau Gemini 3.5 Flash) untuk meriset dan menghasilkan 3 aturan klinis yang baru.

---

```markdown
Kamu adalah Senior Dermatologist, Clinical Skin Formulator, dan Pakar Toksikologi Kosmetik dengan pengalaman klinis lebih dari 25 tahun. Tugasmu adalah meregenerasi 3 file konfigurasi aturan klinis TypeScript:
1. `src/lib/clinicalRules/facewash.ts`
2. `src/lib/clinicalRules/moisturizer.ts`
3. `src/lib/clinicalRules/sunscreen.ts`

Setiap file di atas wajib berisi tepat **24 kunci kombinasi profil kulit** yang sama, yang jika dikalikan 3 tipe produk akan menghasilkan **72 aturan klinis** secara keseluruhan.

---

### 1. DAFTAR 24 KUNCI PROFIL KULIT YANG WAJIB DIHASILKAN
Format kunci yang digunakan adalah `${TIPE_KULIT}_${SENSITIF}_${KEPARAHAN_JERAWAT}` dengan penjelasan berikut:
- **TIPE_KULIT**: `KERING` | `BERMINYAK` | `KOMBINASI` | `NORMAL`
- **SENSITIF**: `TRUE` (Kulit Sensitif) | `FALSE` (Kulit Biasa / Non-Sensitif)
- **KEPARAHAN_JERAWAT**: `BIASA` (Jerawat Ringan/Komedo) | `SEDANG` (Jerawat Sedang/Papula-Pustula) | `PARAH` (Jerawat Parah/Nodulokistik)

Setiap file konfigurasi harus mendefinisikan objek Record dengan tepat 24 kunci berikut secara berurutan, tanpa ada yang dilewati atau diringkas:
1. `KERING_FALSE_BIASA`
2. `KERING_FALSE_SEDANG`
3. `KERING_FALSE_PARAH`
4. `KERING_TRUE_BIASA`
5. `KERING_TRUE_SEDANG`
6. `KERING_TRUE_PARAH`
7. `BERMINYAK_FALSE_BIASA`
8. `BERMINYAK_FALSE_SEDANG`
9. `BERMINYAK_FALSE_PARAH`
10. `BERMINYAK_TRUE_BIASA`
11. `BERMINYAK_TRUE_SEDANG`
12. `BERMINYAK_TRUE_PARAH`
13. `KOMBINASI_FALSE_BIASA`
14. `KOMBINASI_FALSE_SEDANG`
15. `KOMBINASI_FALSE_PARAH`
16. `KOMBINASI_TRUE_BIASA`
17. `KOMBINASI_TRUE_SEDANG`
18. `KOMBINASI_TRUE_PARAH`
19. `NORMAL_FALSE_BIASA`
20. `NORMAL_FALSE_SEDANG`
21. `NORMAL_FALSE_PARAH`
22. `NORMAL_TRUE_BIASA`
23. `NORMAL_TRUE_SEDANG`
24. `NORMAL_TRUE_PARAH`

---

### 2. STRUKTUR DATA TYPESCRIPT (`ClinicalRule`)
Gunakan struktur tipe data ini untuk setiap objek aturan:
```typescript
export interface ClinicalRule {
  dasarKlinis: string; // Penjelasan logis dan medis mengapa aturan ini ditetapkan (maks 25 kata)
  maxSingleComedo: number; // Skor komedogenik maksimal untuk 1 bahan (0 s.d 5)
  maxMultiComedoLoad: number; // Total akumulasi skor komedogenik yang diizinkan
  harsh: { status: "WAJIB" | "DIIZINKAN" | "DILARANG"; maxLoad: number }; // Batas bahan aktif eksfoliasi (HARSH)
  buffer: { status: "WAJIB" | "DIIZINKAN" | "DILARANG"; minLoad: number }; // Syarat minimal soothing agent (BUFFER)
  surfactant: { status: "WAJIB" | "DIIZINKAN" | "DILARANG"; minCount: number; maxCount: number | "UNLIMITED" };
  uvFilter: { status: "WAJIB" | "DIIZINKAN" | "DILARANG"; minCount: number; maxCount: number | "UNLIMITED" };
  moistLight: { status: "WAJIB" | "DIIZINKAN" | "DILARANG"; minCount: number; maxCount: number | "UNLIMITED" };
  moistMedium: { status: "WAJIB" | "DIIZINKAN" | "DILARANG"; minCount: number; maxCount: number | "UNLIMITED" };
  moistHeavy: { status: "WAJIB" | "DIIZINKAN" | "DILARANG"; minCount: number; maxCount: number | "UNLIMITED" };
}
```

---

### 3. PARAMETER & ACUAN MEDIS KLINIS (IDE B: TOLERANSI EKSFOLIASI & REHIDRASI BERTAHAP)

Gunakan pembagian parameter di bawah ini untuk merancang aturan secara presisi:

#### A. Tingkat Komedogenik (comedogenicRating) — Skala 0-5:
- 0 = TIDAK KOMEDOGENIK: Tidak menyumbat pori, larut air/non-oklusif (Contoh: Niacinamide, Glycerin, Hyaluronic Acid, Panthenol).
- 1 = SANGAT RENDAH: Aman untuk 99% tipe kulit (Contoh: Squalane, Dimethicone, Ceramide).
- 2 = RINGAN: Bisa memicu komedo HANYA pada kulit sangat acne-prone (Contoh: Cetyl Alcohol, Hexylene Glycol).
- 3 = SEDANG: Umum memicu komedo dan penumpukan sebum pada kulit berminyak (Contoh: Stearic Acid, Avocado Oil, Soybean Oil).
- 4 = TINGGI: Sangat oklusif, memicu breakout pada sebagian besar tipe kulit (Contoh: Coconut Oil, Cocoa Butter, Cetearyl Alcohol + Ceteareth-20).
- 5 = SANGAT KOMEDOGENIK: Hampir pasti memicu jerawat parah (Contoh: Isopropyl Myristate, Isopropyl Palmitate, Wheat Germ Oil).

#### B. Pembagian Kategori Pelembap:
- moistLight (Pelembap Humektan - Air/Ringan): Menarik & mengikat air (Contoh: Glycerin, Hyaluronic Acid, Butylene Glycol).
- moistMedium (Pelembap Emolien - Lipid/Sedang): Mengisi celah antar sel (Contoh: Ceramide, Squalane, Fatty Alcohols).
- moistHeavy (Pelembap Oklusif - Minyak/Tebal): Mengunci kelembapan (Contoh: Petrolatum, Shea Butter, Mineral Oil).

#### C. Level Kekuatan Bahan Aktif/Kasar (HARSH):
- 1 (Rendah/Lembut): Molekul besar (PHA seperti Gluconolactone, LHA, Mandelic Acid). Meresap lambat di permukaan, ramah untuk kulit rentan.
- 2 (Menengah): Molekul sedang (Lactic Acid, Salicylic Acid / BHA standar). Penetrasi sedang ke epidermis.
- 3 (Sangat Kuat): Molekul amat kecil (Glycolic Acid, Retinol murni, Tretinoin). Menembus kulit dengan sangat cepat dan dalam, berisiko tinggi mengoyak skin barrier jika disalahgunakan.

#### D. Level Kekuatan Bahan Penenang (BUFFER):
- 1 (Rendah/Lembut): Ekstrak tumbuhan dasar sebagai hidrasi penyokong (Aloe Vera, Chamomile).
- 2 (Menengah): Senyawa murni dengan uji klinis penenang standar (Panthenol 2-5%, Allantoin murni).
- 3 (Sangat Kuat): Isolat medis untuk meredam inflamasi berat (Madecassoside murni, Ceramide kompleks NP/AP/EOP).

#### E. Definisi Medis Kulit Sensitif (safeForSensitive):
- Kulit sensitif adalah kondisi di mana skin barrier (stratum corneum) melemah, TEWL tinggi, dan ujung saraf lebih terekspos.
- Bahan tidak aman: SLS/SLES, Alkohol Denat tinggi, iritan kuat (Glycolic Acid >10%, Retinol >0.5% awal), alergen/pewangi (Fragrance, Essential Oil pekat, pengawet MI/MCI).
- Bahan aman: Niacinamide ≤5%, Centella Asiatica, Panthenol, Ceramide, Allantoin, Bisabolol, Madecassoside, Oat Beta-Glucan.

---

### 4. LOGIKA GRADASI TOLERANSI ATURAN KLINIS

Terapkan prinsip berikut agar aturan terhitung dengan harmonis dan sinkron:
1. **Aturan Bahan Keras (harsh)**:
   * **Kulit SENSITIF (TRUE)**: Wajib `status: "DILARANG"`, `maxLoad: 0` pada semua tingkat keparahan jerawat. Pengecualian hanya pada facewash (bilas) jerawat ringan yang memperbolehkan eksfolian ultra-lembut (`maxLoad: 1`).
   * **Kulit NON-SENSITIF (FALSE)**: Diizinkan menggunakan bahan harsh dengan batasan gradasi `maxLoad`:
     * Jerawat `BIASA` (Komedo): `maxLoad` longgar (nilai `3-6`), memperbolehkan bahan aktif menengah/kuat untuk membersihkan pori.
     * Jerawat `SEDANG` (Papula/Pustula): `maxLoad` diperketat (nilai `1-3`), hanya membolehkan bahan aktif lembut (PHA/BHA konsentrasi rendah).
     * Jerawat `PARAH` (Nodulokistik): Wajib `status: "DILARANG"`, `maxLoad: 0` karena barrier kulit telah rusak parah oleh peradangan mendalam.
2. **Aturan Bahan Penenang (buffer)**:
   * **Kulit SENSITIF (TRUE)**: Status wajib `"WAJIB"`, dengan `minLoad` tinggi (`3` hingga `6`) untuk memastikan formulasi memiliki penawar iritasi yang cukup.
   * **Kulit NON-SENSITIF (FALSE)**: Status `"DIIZINKAN"`, tetapi menjadi `"WAJIB"` (dengan `minLoad` minimal `3`) jika kondisi jerawat masuk tahap `SEDANG` atau `PARAH`.
3. **Batas Komedogenik (`maxSingleComedo` & `maxMultiComedoLoad`)**:
   * **Kulit Berminyak/Kombinasi**: Batasi komedogenik secara ekstrem (`maxSingleComedo` maksimal `1` atau `0` pada kondisi jerawat sedang/parah).
   * **Kulit Kering**: Berikan toleransi komedogenik lebih longgar (`maxSingleComedo` hingga `2` atau `3` untuk pelembap) karena kulit kering memerlukan oklusif untuk mencegah TEWL, namun tetap perkecil jika jerawatnya parah.
4. **Jenis Pelembap (Light vs Medium vs Heavy)**:
   * **Kulit Berminyak/Kombinasi**: Larang oklusif berat (`moistHeavy: "DILARANG"`), wajibkan pelembap ringan (`moistLight: "WAJIB"`).
   * **Kulit Kering**: Wajibkan pelembap sedang dan berat (`moistMedium` dan `moistHeavy: "WAJIB"` atau `"DIIZINKAN"`), terutama jika tidak sensitif.

---

### 5. PARAMETER SAINS & KONTEKS HUBUNGAN LOGIS SISTEM

Pahami dan patuhi pedoman hubungan logis sistem dan kredibilitas di bawah ini:

#### A. Hierarki Sumber Bukti Ilmiah (Evidence-Based Dermatology)
Kamu DILARANG keras menyusun aturan klinis berdasarkan asumsi, beautypedia awam, forum diskusi (Reddit), atau blog kosmetik non-medis. Aturan klinis harus didasarkan pada hierarki bukti medis terverifikasi berikut:
1. Jurnal Dermatologi & Sains Kosmetik bereputasi Internasional (Scopus Q1/Q2, PubMed, MEDLINE), contoh: JAAD, BJD, International Journal of Cosmetic Science.
2. Jurnal Dermatologi Nasional terakreditasi minimal Sinta 1 atau Sinta 2 (Kemenristek/BRIN RI).
3. Laporan Toksikologi Resmi & Konsensus Regulator Kosmetik: SCCS (Uni Eropa), CIR (AS), FDA (AS), dan BPOM RI.

#### B. Konsep Evaluasi Status Aturan (Rule Status Concepts)
Aturan kompatibilitas dinilai berdasarkan 3 status utama:
- Status "WAJIB": Bahan dalam kategori tersebut harus ada dalam formulasi agar produk dinilai cocok untuk jenis kulit pengguna.
  * Contoh: Kulit sensitif membutuhkan pelembap yang mengandung bahan penenang (buffer) untuk meredam potensi iritasi.
- Status "DILARANG": Bahan dalam kategori tersebut tidak boleh ada atau jumlahnya harus dibatasi sekecil mungkin agar tidak memicu reaksi negatif pada kulit.
  * Contoh: Kulit berminyak dan berjerawat parah melarang penggunaan minyak oklusif berat (moistHeavy) untuk mencegah sumbatan pori.
- Status "DIIZINKAN": Bahan boleh ada sebagai opsional tambahan tanpa memicu konsekuensi kompatibilitas selama batas wajarnya tidak dilanggar.

#### C. Hubungan Logis Kategori Bahan per Tipe Produk
1. **FACEWASH**:
   - surfactant: WAJIB (minCount: 1 atau 2, maxCount: "UNLIMITED") guna mengangkat sebum dan kotoran.
   - uvFilter: DILARANG (maxCount: 0).
   - moistHeavy (Pelembap Oklusif): DILARANG (maxCount: 0) terutama pada kulit berminyak, karena residu minyak berat setelah dibilas berisiko menyumbat pori.
2. **MOISTURIZER**:
   - surfactant: DIIZINKAN (minCount: 0, maxCount: "UNLIMITED"). Catatan: Kita mengizinkan surfaktan di pelembap untuk mengakomodasi bahan pengemulsi (emulsifier) yang secara teknis tergolong surfaktan agar tidak memicu penalti salah sasaran.
   - uvFilter: DILARANG (maxCount: 0).
   - moistHeavy (Pelembap Oklusif): DIIZINKAN/WAJIB hanya untuk kulit kering, dan DILARANG (maxCount: 0) untuk kulit berminyak/kombinasi.
3. **SUNSCREEN**:
   - surfactant: DIIZINKAN (minCount: 0, maxCount: "UNLIMITED"). Catatan: Mengakomodasi bahan pengemulsi.
   - uvFilter: WAJIB (minCount: 1 atau 2, maxCount: "UNLIMITED") sebagai pelindung utama matahari.
   - moistHeavy (Pelembap Oklusif): DIIZINKAN/WAJIB hanya untuk kulit kering, dan DILARANG (maxCount: 0) untuk kulit berminyak/kombinasi.

#### D. Logika Kontak Fisik (Wash-Off vs Leave-On Exposure)
AI harus menyusun toleransi klinis dengan mempertimbangkan durasi kontak produk pada kulit:
- Produk Bilas (Wash-off / Facewash): Durasi kontak sangat singkat (~60 detik). Potensi iritasi dari bahan aktif kasar (harsh) dan potensi sumbatan pori dari bahan komedogenik berkurang secara signifikan karena langsung dilarutkan oleh air. Oleh karena itu, batasan komedogenisitas maksimal pada sabun wajah bisa sedikit lebih longgar dibanding produk leave-on.
- Produk Menempel (Leave-on / Pelembap & Sunscreen): Produk menempel dan meresap penuh ke dalam kulit selama berjam-jam. Efek penyerapan bahan aktif eksfoliasi dan risiko penyumbatan pori komedogenik terjadi secara maksimal. Batasan toleransi iritasi dan komedogenisitas harus dirancang dengan sangat ketat dan defensif.

---

### 6. ATURAN OUTPUT PENTING (DILARANG MENGGUNAKAN PLACEHOLDER)
- **DILARANG** menyingkat hasil kode dengan komentar seperti `// ... (kunci lainnya)` atau `// sama seperti diatas`. Kamu harus menghasilkan seluruh kode TypeScript untuk ke-24 kunci pada ketiga berkas secara utuh agar dapat kami salin secara langsung.
- Kembalikan output dalam 3 blok kode markdown terpisah yang teratur dan jelas agar asisten pengembang kami dapat dengan mudah membacanya.

Silakan lakukan analisis medis terbaikmu dan buat 72 aturan klinis ini sekarang.
```
---
