// src/app/api/admin/deep-research/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { splitAliases } from "@/lib/splitAliases";
import OpenAI from "openai";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit max untuk Vercel/Next.js

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ========================================================
// FUNGSI NORMALISASI (Sama dengan create page)
// ========================================================
const normalizeString = (str: string) => {
  if (!str) return "";
  return str.toLowerCase().replace(/[\s\-_]+/g, "");
};

// ========================================================
// DAFTAR FALLBACK MODEL GOOGLE
// Gemini: cascade fallback (3.1 -> 3 -> 2.5 -> 2.0)
// Gemma: standalone, NO fallback
// ========================================================
const GEMINI_FALLBACK_ORDER = [
  "gemini-3.1-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3-flash-preview",
  "gemini-3-flash",
  "gemini-2.5-flash",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
];

// Gemma models are standalone — no fallback chain
const GEMMA_MODELS = [
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
];

const isGemmaModel = (model: string) => model.startsWith("gemma-");

// ========================================================
// JSON SCHEMA UNTUK STRUCTURED OUTPUT
// ========================================================
const INGREDIENT_SCHEMA = {
  type: "object" as const,
  properties: {
    name: { type: "string" as const, description: "Nama INCI resmi standar PCPC (International Nomenclature of Cosmetic Ingredients). Contoh: 'Aqua' bukan 'Air'." },
    aliases: { type: "array" as const, items: { type: "string" as const }, description: "Daftar sinonim sebagai JSON Array of Strings. Contoh: ['Water', 'Air', 'Purified Water'] untuk 'Aqua'. HANYA nama kimia/dagang murni, TANPA deskripsi." },
    type: { type: "string" as const, enum: ["BASIC", "BUFFER", "HARSH", "TOXIC"], description: "Sifat kimia: BASIC=standar/umum, BUFFER=penenang/calming, HARSH=keras/asam kuat, TOXIC=berbahaya" },
    strengthLevel: { type: "number" as const, description: "Level kekuatan 1-3. 1=rendah/lembut, 2=menengah, 3=sangat kuat. Hanya relevan untuk HARSH dan BUFFER." },
    functionalCategory: { type: "string" as const, enum: ["UMUM", "SURFAKTAN", "UV_FILTER", "PELEMBAP_HUMEKTAN", "PELEMBAP_EMOLIEN", "PELEMBAP_OKLUSIF"], description: "Fungsi khusus bahan dalam formulasi skincare" },
    isKeyActive: { type: "boolean" as const, description: "Apakah bahan ini termasuk bahan aktif utama (key active ingredient)?" },
    benefits: { type: "string" as const, description: "Manfaat singkat maksimal 30 kata, bahasa mudah dipahami orang awam" },
    aiContext: { type: "string" as const, description: "Analisis mendalam MINIMAL 500 kata. Jelaskan: mekanisme kerja kimia, pH optimal, konsentrasi efektif, pantangan campuran, data klinis/jurnal, efek samping, sejarah penggunaan dermatologi, dan rekomendasi formulasi. WAJIB lebih dari 500 kata." },
    comedogenicRating: { type: "number" as const, description: "Tingkat komedogenik bahan pada skala 0-5. 0=tidak komedogenik, 5=sangat komedogenik" },
    safeForPregnancy: { type: "boolean" as const, description: "Apakah aman untuk ibu hamil dan menyusui berdasarkan pedoman dermatologi?" },
    safeForSensitive: { type: "boolean" as const, description: "Apakah aman untuk kulit sensitif?" },
    targetFocus: { type: "string" as const, description: "Fokus perawatan yang relevan, dipisahkan koma. Pilih dari: Mencerahkan & Bekas Jerawat, Merawat Jerawat & Sebum, Anti-Aging & Garis Halus, Memperbaiki Skin Barrier & Hidrasi, Menenangkan Kemerahan (Soothing), Eksfoliasi & Tekstur Pori-pori. Boleh kosong jika tidak relevan." },
    blacklistedSkinTypes: { type: "string" as const, description: "Tipe kulit yang dilarang keras memakai bahan ini. Pilih dari: Normal,Kering,Berminyak,Kombinasi dipisahkan koma. Kosongkan jika aman untuk semua." },
    blacklistReason: { type: "string" as const, description: "Alasan medis mengapa dilarang untuk tipe kulit tersebut, maksimal 30 kata. Kosongkan jika tidak ada blacklist." },
    warnings: { type: "string" as const, description: "Peringatan penggunaan umum (konsentrasi, interaksi, dll)" },
  },
  required: ["name", "aliases", "type", "strengthLevel", "functionalCategory", "isKeyActive", "benefits", "aiContext", "comedogenicRating", "safeForPregnancy", "safeForSensitive"],
};

// Helper untuk mengekstrak JSON dari teks markdown
const extractJson = (text: string) => {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      // Lanjut ke pencarian manual jika parse regex gagal
    }
  }
  
  // Pencarian manual dari '{' ke '}'
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      // Lanjut ke parse text mentah jika masih gagal
    }
  }
  
  return JSON.parse(text);
};

// ========================================================
// FUNGSI UTAMA: Riset satu bahan via berbagai AI (dengan fallback otomatis)
// ========================================================
async function researchIngredient(ingredientName: string, provider: string = "gemini", modelName: string = "gemini-2.5-pro", useLiveSearch: boolean = false): Promise<{ success: boolean; data?: any; error?: string; modelUsed?: string; isHallucination?: boolean; triedModels?: string[], usedExternalSource?: boolean }> {
  const currentDate = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const currentYear = new Date().getFullYear();
  
  // Ambil Config AI dari DB
  let aiConfig = await prisma.aIPromptConfig.findUnique({ where: { id: 'singleton_ai_config' } });
  if (!aiConfig) {
    aiConfig = {
      id: 'singleton_ai_config',
      dataTemplate: "Nama (INCI), Sifat Kimia, Level Kekuatan, Fungsi Khusus, Sinonim / Alias, Manfaat Singkat (Untuk Pengguna), Analisis Mendalam (Khusus Mesin AI), Komedogenik (0-5), Aman Bumil, Aman Sensitif, Fokus Perawatan, Dilarang Keras Untuk",
      prioritizedSources: "EWG, Paula's Choice, INCIDecoder, CIR (Cosmetic Ingredient Review), PubMed",
      allowExternalSources: false,
      systemPrompt: "Kamu adalah ahli dermatologi, kosmesi, dan kimia farmasi internasional dengan pengalaman 20+ tahun.\n\nATURAN SISTEM SAAT INI:\n{{ATURAN_SISTEM}}",
      updatedAt: new Date()
    };
  }

  // Ekstrak Sumber Prioritas jika bentuk JSON
  let sourcesList = "";
  try {
    const parsedSources = JSON.parse(aiConfig.prioritizedSources);
    
    const formatSource = (item: any) => {
      if (!item) return "Tidak dibatasi";
      const sumber = item.sumber || "Tidak dibatasi";
      const rule = item.izinkanLuar ? "[BOLEH CARI DI SUMBER LUAR JIKA TIDAK ADA]" : "[HANYA SUMBER INI - DILARANG CARI DI TEMPAT LAIN]";
      return `${sumber} ${rule}`;
    };

    sourcesList = `
    - Komedogenik (0-5): ${formatSource(parsedSources.komedogenik)}
    - Sifat Kimia: ${formatSource(parsedSources.sifatKimia)}
    - Level Kekuatan (1-3): ${formatSource(parsedSources.levelKekuatan)}
    - Fungsi Khusus: ${formatSource(parsedSources.fungsiKhusus)}
    - Keamanan (Bumil & Sensitif): ${formatSource(parsedSources.amanBumilSensitif)}
    - Bahan Aktif (Key Active): ${formatSource(parsedSources.bahanAktif)}
    - Fokus Perawatan: ${formatSource(parsedSources.fokusPerawatan)}
    - Dilarang Keras (Blacklist): ${formatSource(parsedSources.dilarangKeras)}
    - Analisis Mendalam: ${formatSource(parsedSources.analisisMendalam)}
    - Manfaat Singkat: ${formatSource(parsedSources.manfaatSingkat)}
    `;
  } catch (e) {
    sourcesList = aiConfig.prioritizedSources || "Tidak dibatasi";
  }

  const currentMonth = new Date().toLocaleString('id-ID', { month: 'long' });
  const dynamicVersion = `VERSI ${currentMonth.toUpperCase()} ${currentYear}`;

  const aturanSistem = `ATURAN SISTEM & KATEGORISASI DATABASE (${dynamicVersion}):
Tugasmu adalah melakukan ekstraksi data saintifik bahan skincare secara ketat, tanpa jargon berlebihan di bagian awam, dan sangat medis di bagian analisis.

[SIFAT KIMIA / type]
- HARSH (Keras/Eksfoliator): Bahan pengelupas atau aktif kuat yang berpotensi memicu iritasi dan berisiko merusak skin barrier alami jika digunakan berlebihan.
- BUFFER (Penyokong/Penenang): Bahan pendukung yang TIDAK "menyembuhkan" kulit, melainkan meredakan inflamasi dan menyediakan lingkungan/komponen penyokong yang ideal agar skin barrier dapat memulihkan dirinya sendiri secara alami.
- TOXIC: Dilarang mutlak/karsinogenik (FDA/SCCS).
- BASIC: Bahan netral, pelarut, pengemulsi, pengawet yang aman.

[LEVEL KEKUATAN / strengthLevel] (SKALA 1-3)
Jika BASIC atau TOXIC, WAJIB bernilai 1.
JIKA HARSH (Evaluasi Penetrasi Molekuler):
- 1 (Rendah/Lembut): Molekul besar (PHA, LHA, Mandelic). Meresap lambat di permukaan, ramah pemula.
- 2 (Menengah): Molekul sedang (Lactic Acid, Salicylic Acid standar). Penetrasi moderat.
- 3 (Sangat Kuat): Molekul amat kecil (Glycolic Acid, Retinol murni) yang menembus kulit dengan sangat cepat dan dalam. Berisiko tinggi mengoyak skin barrier jika tanpa kehati-hatian.

JIKA BUFFER (Evaluasi Daya Sokong Inflamasi):
- 1 (Rendah/Lembut): Ekstrak tumbuhan dasar sebagai hidrasi penyokong (Aloe Vera, Chamomile extract).
- 2 (Menengah): Senyawa murni dengan uji klinis penenang standar (Panthenol 2-5%).
- 3 (Sangat Kuat): Isolat tingkat medis untuk meredam inflamasi berat dan memberi fondasi kuat bagi perbaikan barrier (Madecassoside murni, Kompleks Ceramide NP/AP/EOP tinggi).

[FUNGSI KHUSUS / functionalCategory]
- PELEMBAP_HUMEKTAN (Pelembap Air/Ringan): Bahan yang menarik dan mengikat molekul air ke dalam kulit (Contoh: Glycerin, Hyaluronic Acid, Propylene Glycol).
- PELEMBAP_EMOLIEN (Pelembap Lipid/Sedang): Bahan yang mengisi celah antar sel kulit untuk menghaluskan dan melembutkan (Contoh: Ceramide, Squalane, Fatty Alcohols).
- PELEMBAP_OKLUSIF (Pelembap Minyak/Tebal): Bahan yang membentuk lapisan kedap air di atas kulit untuk mengunci kelembapan (Contoh: Petrolatum, Shea Butter, Mineral Oil).
- SURFAKTAN (Sabun): Pembersih wajah atau pembentuk busa.
- UV_FILTER (Tabir Surya): Bahan pelindung dari sinar UVA/UVB (Contoh: Zinc Oxide, Avobenzone).
- UMUM (Lainnya): Gunakan jika bahan sama sekali tidak masuk dalam kategori di atas.

[FOKUS PERAWATAN / targetFocus]
HANYA pilih dari nilai persis berikut (boleh dikombinasi dengan koma):
"Mencerahkan & Bekas Jerawat", "Merawat Jerawat & Sebum", "Anti-Aging & Garis Halus", "Memperbaiki Skin Barrier & Hidrasi", "Menenangkan Kemerahan (Soothing)", "Eksfoliasi & Tekstur Pori-pori".
Sifatnya OPSIONAL: Jika bahan ini hanya umum/pelarut, atau sama sekali tidak menyasar fokus perawatan spesifik di atas, KOSONGKAN SAJA (""). Jangan pernah mengada-ada.

[ATURAN BAHASA & PENULISAN]
- "benefits" (Manfaat Awam): Wajib menggunakan bahasa yang BISA DIPAHAMI OLEH ANAK SMA (maks 30 kata). (Contoh Benar: "Membantu meredakan kemerahan dan melembapkan kulit.")
- "blacklistReason": Logis dan membumi (Contoh: "Bahan ini menyerap minyak alami terlalu kuat, sehingga dapat menghambat kemampuan kulit kering dalam memperbaiki dirinya sendiri.")

[ATURAN PENCARIAN SUMBER MUTLAK (KILL SWITCH!)]
Kau WAJIB memprioritaskan pencarian literatur sesuai pemetaan spesifik ini:
${sourcesList}

KONDISI KILL SWITCH:
Jika suatu parameter memiliki label [HANYA SUMBER INI - DILARANG CARI DI TEMPAT LAIN], dan bahan SAMA SEKALI TIDAK DITEMUKAN pada sumber tersebut (serta tidak ada bukti valid di Jurnal Dermatologi Sinta 1 / Scopus Q1), KAU DILARANG MENGARANG BEBAS. 
Tolak instruksi ini dan keluarkan JSON kegagalan:
{
  "error": "GAGAL: Bahan tidak ditemukan pada sumber prioritas mutlak."
}
`;

  const finalSystemPrompt = aiConfig.systemPrompt.replace("{{ATURAN_SISTEM}}", aturanSistem);

  const prompt = `${finalSystemPrompt}

Analisis bahan skincare "${ingredientName}".

Kembalikan TEPAT dalam format JSON berikut (kecuali jika terjadi error):
{
  "name": "nama INCI resmi standar internasional (PCPC)",
  "aliases": ["sinonim ilmiah", "nama umum indonesia", "nama umum inggris", "variasi label"],
  "type": "BASIC atau BUFFER atau HARSH atau TOXIC",
  "strengthLevel": 1,
  "functionalCategory": "UMUM atau SURFAKTAN atau UV_FILTER atau PELEMBAP_HUMEKTAN atau PELEMBAP_EMOLIEN atau PELEMBAP_OKLUSIF",
  "isKeyActive": true,
  "benefits": "manfaat singkat",
  "aiContext": "analisis mendalam MINIMAL 500 KATA...",
  "comedogenicRating": 0,
  "safeForPregnancy": true,
  "safeForSensitive": true,
  "targetFocus": "Mencerahkan & Bekas Jerawat, Merawat Jerawat & Sebum...",
  "blacklistedSkinTypes": "Normal, Kering, Berminyak, Kombinasi (kosongkan jika aman)",
  "blacklistReason": "Alasan klinis (namun dirangkum agar mudah dipahami awam) mengapa bahan ini di-blacklist. WAJIB DIISI jika ada tipe kulit yang di-blacklist!",
  "warnings": "peringatan penggunaan",
  "sumber_yang_digunakan": "Sebutkan sumber aktual darimana data ini didapat",
  "confidenceLevel": "HIGH atau MEDIUM atau LOW"
}

ATURAN KETAT:
1. "name": WAJIB menggunakan standar INCI resmi. JANGAN gunakan nama pasaran.
2. "aliases": WAJIB JSON Array of Strings murni.
3. Pastikan data tidak melanggar ATURAN SISTEM.
4. Jika sumber prioritas diisi dan data tidak ditemukan di sana ATAU di jurnal bereputasi tinggi, "confidenceLevel" WAJIB LOW atau kembalikan { "error": "..." }.
5. JIKA field "blacklistedSkinTypes" memiliki nilai (bukan kosong), maka Anda WAJIB MENGISI field "blacklistReason" dengan alasan klinis yang didukung data medis, NAMUN harus ditulis ulang menggunakan bahasa yang mudah dipahami oleh orang awam. DILARANG KERAS MENGOSONGKAN "blacklistReason" JIKA ADA BLACKLIST!

Kembalikan HANYA JSON murni (mulai dengan { dan akhiri dengan }). Dilarang menggunakan format markdown \`\`\`json.`;

  // Bangun daftar model yang akan dicoba
  const modelsToTry: string[] = [modelName];
  
  if (provider === "gemini") {
    if (isGemmaModel(modelName)) {
      // GEMMA: standalone, NO fallback — hanya coba model yang dipilih
      // modelsToTry sudah berisi [modelName] saja
    } else {
      // GEMINI: cascade fallback — tambahkan semua fallback yang belum ada
      for (const fb of GEMINI_FALLBACK_ORDER) {
        if (!modelsToTry.includes(fb)) modelsToTry.push(fb);
      }
    }
  }

  const triedModels: string[] = [];

  for (let mi = 0; mi < modelsToTry.length; mi++) {
    const currentModel = modelsToTry[mi];
    const isFallback = mi > 0;
    triedModels.push(currentModel);
    
    try {
      console.log(`[Deep Research] ${isFallback ? '🔄 Fallback ke' : 'Menggunakan provider:'} ${provider}, model: ${currentModel} untuk "${ingredientName}"...`);
      
      let parsed: any = null;
      let wordCount = 0;

      if (provider === "gemini") {
        const generationConfig: any = {
          temperature: 0.2,
        };
        
        // Gemma models API does not support application/json responseMimeType natively
        if (!isGemmaModel(currentModel)) {
          generationConfig.responseMimeType = "application/json";
        }

        const tools: any[] = [];
        if (useLiveSearch && !isGemmaModel(currentModel) && currentModel.includes("gemini")) {
          tools.push({ googleSearch: {} });
        }

        const model = genAI.getGenerativeModel({
          model: currentModel,
          generationConfig,
          tools: tools.length > 0 ? tools : undefined,
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        parsed = extractJson(responseText);
      } else {
        // OpenAI Compatible (BytePlus / DeepSeek)
        let client: OpenAI;
        if (provider === "byteplus") {
          let byteplusUrl = process.env.BYTEPLUS_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3";
          if (byteplusUrl.includes("ark.byteplus.com")) {
            byteplusUrl = "https://ark.ap-southeast.bytepluses.com/api/v3";
          }
          client = new OpenAI({
            apiKey: process.env.BYTEPLUS_API_KEY || "",
            baseURL: byteplusUrl,
          });
          console.log(`[Deep Research] BytePlus Request: URL=${byteplusUrl}, Model=${currentModel}`);
        } else {
          client = new OpenAI({
            apiKey: process.env.DEEPSEEK_API_KEY || "",
            baseURL: "https://api.deepseek.com",
          });
        }

        const response = await client.chat.completions.create({
          model: currentModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        });

        const responseText = response.choices[0].message.content || "{}";
        parsed = extractJson(responseText);
      }

      // ANTI-HALUSINASI: Cek Kill Switch (Error dari AI)
      if (parsed.error) {
        console.warn(`[Deep Research] ⚠️ AI Kill Switch Triggered untuk "${ingredientName}": ${parsed.error}`);
        return { success: false, error: parsed.error, modelUsed: currentModel, isHallucination: true, triedModels };
      }

      // ANTI-HALUSINASI: Cek confidenceLevel
      const confidence = String(parsed.confidenceLevel || "HIGH").toUpperCase();
      if (confidence === "LOW") {
        console.warn(`[Deep Research] ⚠️ AI melaporkan confidence LOW untuk "${ingredientName}". Dibatalkan karena rawan halusinasi.`);
        return { success: false, error: `Analisis bahan "${ingredientName}" dibatalkan — AI melaporkan tingkat kepercayaan RENDAH. Bahan kemungkinan fiktif atau kurang data riset medis.`, modelUsed: currentModel, isHallucination: true, triedModels };
      }

      // Validasi: aiContext harus >= 400 kata
      wordCount = (parsed.aiContext || "").split(/\s+/).filter((w: string) => w.length > 0).length;
      if (wordCount < 400) {
        console.warn(`[Deep Research] ⚠️ aiContext hanya ${wordCount} kata untuk "${ingredientName}" (model: ${currentModel}). Mencoba ulang...`);

        const retryPrompt = `${prompt}\n\nPERINGATAN KERAS: Respons sebelumnya hanya menghasilkan ${wordCount} kata untuk aiContext. Kali ini WAJIB menghasilkan MINIMAL 500 KATA untuk field aiContext. Tuliskan analisis yang sangat detail dan komprehensif.`;

        let retryParsed: any = null;
        if (provider === "gemini") {
          const generationConfig: any = { temperature: 0.2 };
          if (!isGemmaModel(currentModel)) {
            generationConfig.responseMimeType = "application/json";
          }
          const tools: any[] = [];
          if (useLiveSearch && !isGemmaModel(currentModel) && currentModel.includes("gemini")) {
            tools.push({ googleSearch: {} });
          }

          const model = genAI.getGenerativeModel({
            model: currentModel,
            generationConfig,
            tools: tools.length > 0 ? tools : undefined,
          });
          const retryResult = await model.generateContent(retryPrompt);
          retryParsed = extractJson(retryResult.response.text());
        } else {
          let byteplusUrl = process.env.BYTEPLUS_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3";
          if (byteplusUrl.includes("ark.byteplus.com")) {
            byteplusUrl = "https://ark.ap-southeast.bytepluses.com/api/v3";
          }
          let client = new OpenAI({
            apiKey: provider === "byteplus" ? process.env.BYTEPLUS_API_KEY || "" : process.env.DEEPSEEK_API_KEY || "",
            baseURL: provider === "byteplus" ? byteplusUrl : "https://api.deepseek.com",
          });
          const response = await client.chat.completions.create({
            model: currentModel,
            messages: [{ role: "user", content: retryPrompt }],
            temperature: 0.2,
          });
          retryParsed = extractJson(response.choices[0].message.content || "{}");
        }

        const retryWordCount = (retryParsed.aiContext || "").split(/\s+/).filter((w: string) => w.length > 0).length;
        console.log(`[Deep Research] ${retryWordCount >= 400 ? '✅' : '⚠️'} Retry: ${retryWordCount} kata (model: ${currentModel})`);
        return { success: true, data: retryParsed, modelUsed: currentModel, triedModels };
      }

      console.log(`[Deep Research] ✅ Berhasil: "${ingredientName}" (${wordCount} kata, model: ${currentModel})`);
      
      let usedExternalSource = false;
      const sourcesUsed = (parsed.sumber_yang_digunakan || "").toLowerCase();
      if (aiConfig.prioritizedSources && aiConfig.prioritizedSources.trim() !== "") {
        const pSources = aiConfig.prioritizedSources.toLowerCase().split(",").map((s: string) => s.trim());
        const hasPriority = pSources.some((ps: string) => sourcesUsed.includes(ps));
        if (!hasPriority && sourcesUsed !== "") {
           usedExternalSource = true;
           console.log(`[Deep Research] ⚠️ Menggunakan sumber luar: ${sourcesUsed}`);
        }
      }

      return { success: true, data: parsed, modelUsed: currentModel, triedModels, usedExternalSource };

    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      console.warn(`[Deep Research] ❌ Model ${currentModel} gagal untuk "${ingredientName}": ${errorMsg}`);
      
      // Non-retryable errors — langsung return
      if (provider === "byteplus" && (err.status === 404 || errorMsg.includes("404"))) {
        return { success: false, error: "Model tidak ditemukan (404). Di BytePlus, Anda WAJIB menggunakan 'Endpoint ID' (format ep-...) bukan nama model.", triedModels };
      }
      if (err.status === 402 || errorMsg.includes("402")) {
        return { success: false, error: "Saldo API Habis (402). Silakan isi saldo di dashboard penyedia AI.", triedModels };
      }

      // Retryable errors — coba model fallback berikutnya (hanya untuk Gemini)
      if (provider === "gemini" && mi < modelsToTry.length - 1) {
        console.log(`[Deep Research] 🔄 Mencoba fallback model berikutnya: ${modelsToTry[mi + 1]}...`);
        await new Promise(r => setTimeout(r, 2000)); // 2 detik jeda sebelum fallback
        continue; // Coba model berikutnya
      }

      // Semua model gagal
      const modelDisplayName = currentModel.includes("ep-") ? `BytePlus Endpoint (${currentModel})` : currentModel;
      if (isGemmaModel(modelName)) {
        return { success: false, error: `Model Gemma (${modelDisplayName}) gagal menganalisis bahan ini: ${errorMsg}. Gemma tidak memiliki fallback — coba gunakan model Gemini.`, triedModels };
      }
      return { success: false, error: `Semua model Gemini gagal (${triedModels.join(' → ')}). Error terakhir: ${errorMsg}`, triedModels };
    }
  }

  return { success: false, error: "Semua model AI gagal. Coba lagi nanti.", triedModels };
}

// ========================================================
// POST: Endpoint utama Deep Research (SSE Streaming)
// ========================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { names, adminName, adminRole, provider, model, useLiveSearch } = body;

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ message: "Daftar bahan kosong." }, { status: 400 });
    }

    if (names.length > 50) {
      return NextResponse.json({ message: "Maksimal 50 bahan per sesi." }, { status: 400 });
    }

    // ========================================================
    // AMBIL DATA EXISTING UNTUK FILTER DUPLIKASI
    // ========================================================
    const existingIngredients = await prisma.ingredientDictionary.findMany({
      select: { name: true, aliases: true },
    });

    // Map: normalizedName -> { inciName, type: 'name'|'alias' }
    const existingNameMap = new Map<string, { inciName: string; matchType: string }>();
    existingIngredients.forEach((item) => {
      existingNameMap.set(normalizeString(item.name), { inciName: item.name, matchType: 'name' });
      if (item.aliases) {
        splitAliases(item.aliases).forEach(cleanAlias => {
          existingNameMap.set(cleanAlias, { inciName: item.name, matchType: 'alias' });
        });
      }
    });
    let allExistingNames = Array.from(existingNameMap.keys());
    allExistingNames = Array.from(new Set(allExistingNames));

    // Filter bahan yang sudah ada
    const filteredNames = names.filter((n: string) => !existingNameMap.has(normalizeString(n)));
    // Build detailed skip info
    const skippedDetails = names
      .filter((n: string) => existingNameMap.has(normalizeString(n)))
      .map((n: string) => {
        const info = existingNameMap.get(normalizeString(n))!;
        return { name: n, existingInci: info.inciName, matchType: info.matchType };
      });
    const skippedNames = skippedDetails.map(s => s.name);

    // ========================================================
    // SSE STREAMING RESPONSE
    // ========================================================
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Kirim info awal
        sendEvent({
          type: "init",
          total: filteredNames.length,
          skipped: skippedNames,
          skippedDetails: skippedDetails,
          skippedCount: skippedNames.length,
        });

        const results: { name: string; success: boolean; aliasCount: number; model?: string; error?: string; usedExternalSource?: boolean }[] = [];
        let totalAliasesFound = 0;
        let totalReportsCleaned = 0;

        // ========================================================
        // PROSES SETIAP BAHAN SECARA SEKUENSIAL
        // ========================================================
        for (let i = 0; i < filteredNames.length; i++) {
          const ingredientName = filteredNames[i];

          sendEvent({
            type: "progress",
            current: i + 1,
            total: filteredNames.length,
            name: ingredientName,
            status: "researching",
          });

          const research = await researchIngredient(ingredientName, provider, model, useLiveSearch);

          // ANTI-HALUSINASI: Jika AI melaporkan LOW confidence, kirim event khusus
          if (!research.success && research.isHallucination) {
            results.push({ name: ingredientName, success: false, aliasCount: 0, error: research.error });
            sendEvent({
              type: "progress",
              current: i + 1,
              total: filteredNames.length,
              name: ingredientName,
              status: "hallucination",
              error: research.error,
            });
            continue;
          }

          if (research.success && research.data) {
            const data = research.data;

            try {
              // ========================================================
              // SIMPAN KE DATABASE
              // ========================================================
              const finalName = (data.name || ingredientName).toLowerCase().trim();

              // ========================================================
              // POST-AI DUPLICATE CHECK (Cek ulang setelah AI merespons)
              // ========================================================
              const freshExisting = await prisma.ingredientDictionary.findMany({
                select: { id: true, name: true, aliases: true },
              });
              const freshMap = new Map<string, { id: string; inciName: string; matchType: string; currentAliases: string | null }>();
              freshExisting.forEach((item) => {
                freshMap.set(normalizeString(item.name), { id: item.id, inciName: item.name, matchType: 'name', currentAliases: item.aliases });
                if (item.aliases) {
                  splitAliases(item.aliases).forEach(cleanAlias => {
                    freshMap.set(cleanAlias, { id: item.id, inciName: item.name, matchType: 'alias', currentAliases: item.aliases });
                  });
                }
              });

              // Cek finalName
              const nameConflict = freshMap.get(normalizeString(finalName));
              
              // Cek setiap alias dari AI
              const aiAliases: string[] = Array.isArray(data.aliases)
                ? data.aliases.map((a: string) => a.trim()).filter((a: string) => a.length > 0)
                : typeof data.aliases === 'string'
                  ? data.aliases.split(/[;,]/).map((a: string) => a.trim()).filter((a: string) => a.length > 0)
                  : [];

              const aliasConflicts: { alias: string; existingInci: string }[] = [];
              aiAliases.forEach((alias: string) => {
                const norm = normalizeString(alias);
                const conflict = freshMap.get(norm);
                if (conflict) {
                  aliasConflicts.push({ alias, existingInci: conflict.inciName });
                }
              });

              if (nameConflict) {
                // AUTO-ADD ALIAS: Tambahkan nama yang dicari sebagai alias baru ke bahan existing
                const searchedName = ingredientName.toLowerCase().trim();
                const existingEntry = freshMap.get(normalizeString(nameConflict.inciName));
                
                if (existingEntry && normalizeString(searchedName) !== normalizeString(nameConflict.inciName)) {
                  // Cek apakah alias belum ada
                  const currentAliasesList = existingEntry.currentAliases 
                    ? splitAliases(existingEntry.currentAliases) 
                    : [];
                  const alreadyHasAlias = currentAliasesList.includes(normalizeString(searchedName));
                  
                  if (!alreadyHasAlias) {
                    // Tambahkan alias baru
                    const newAliasString = existingEntry.currentAliases 
                      ? `${existingEntry.currentAliases}; ${searchedName}` 
                      : searchedName;
                    
                    await prisma.ingredientDictionary.update({
                      where: { id: existingEntry.id },
                      data: { aliases: newAliasString },
                    });
                    
                    sendEvent({
                      type: "alias_update",
                      name: ingredientName,
                      existingInci: nameConflict.inciName,
                      newAlias: searchedName,
                      message: `Bahan "${ingredientName}" ternyata sama dengan "${nameConflict.inciName}". Alias "${searchedName}" berhasil ditambahkan ke bahan "${nameConflict.inciName}".`,
                    });
                  }
                }

                const conflictDetail = `Nama INCI "${finalName}" sudah terdaftar di kamus sebagai ${nameConflict.matchType === 'name' ? 'bahan' : 'alias dari'}: ${nameConflict.inciName}. Alias telah di-update.`;
                results.push({ name: ingredientName, success: false, aliasCount: 0, error: conflictDetail });

                // AUTO-CLEANUP: Hapus laporan UnknownIngredient yang cocok
                try {
                  const matchingReports = await prisma.unknownIngredient.findMany({
                    where: { isReviewed: false },
                  });
                  for (const report of matchingReports) {
                    if (normalizeString(report.name) === normalizeString(ingredientName)) {
                      await prisma.unknownIngredient.delete({ where: { id: report.id } });
                      totalReportsCleaned++;
                    }
                  }
                } catch (cleanupErr) {
                  console.warn(`[Deep Research] Gagal membersihkan laporan untuk "${ingredientName}":`, cleanupErr);
                }

                sendEvent({
                  type: "progress",
                  current: i + 1,
                  total: filteredNames.length,
                  name: ingredientName,
                  status: "alias_added",
                  reason: conflictDetail,
                  conflictType: "name",
                  conflictInci: nameConflict.inciName,
                });
                continue;
              }

              // Jika ada alias yang konflik, filter keluar alias yang konflik (tapi tetap simpan bahan)
              const cleanAliases = aiAliases.filter((alias: string) => {
                const norm = normalizeString(alias);
                return !freshMap.has(norm);
              });

              // ========================================================
              // NORMALISASI SEMUA FIELD (AI bisa return array atau string)
              // ========================================================
              const toStr = (val: any): string | null => {
                if (!val) return null;
                if (Array.isArray(val)) return val.join("; ").trim() || null;
                if (typeof val === "string") return val.trim() || null;
                return String(val).trim() || null;
              };

              // Map type ke enum yang valid
              const validTypes = ["BASIC", "BUFFER", "HARSH", "TOXIC"];
              const rawType = String(data.type || "").toUpperCase().trim();
              const ingredientType = validTypes.includes(rawType) ? rawType : "BASIC";

              // Map functionalCategory ke enum yang valid (termasuk mapping dari bahasa Inggris)
              const validCategories = ["UMUM", "SURFAKTAN", "UV_FILTER", "PELEMBAP_HUMEKTAN", "PELEMBAP_EMOLIEN", "PELEMBAP_OKLUSIF"];
              const categoryMap: Record<string, string> = {
                "HUMECTANT": "PELEMBAP_HUMEKTAN",
                "EMOLLIENT": "PELEMBAP_EMOLIEN",
                "OCCLUSIVE": "PELEMBAP_OKLUSIF",
                "SURFACTANT": "SURFAKTAN",
                "UV FILTER": "UV_FILTER",
                "SUNSCREEN": "UV_FILTER",
                "MOISTURIZER": "PELEMBAP_HUMEKTAN",
              };
              const rawCategory = String(data.functionalCategory || "").toUpperCase().trim();
              const funcCategory = validCategories.includes(rawCategory)
                ? rawCategory
                : categoryMap[rawCategory] || "UMUM";

              // Pastikan strengthLevel valid
              let strengthLevel = Number(data.strengthLevel) || 1;
              if (ingredientType !== "HARSH" && ingredientType !== "BUFFER") {
                strengthLevel = 1;
              }
              strengthLevel = Math.min(3, Math.max(1, strengthLevel));

              // Normalisasi semua field string/array
              // Gunakan alias yang sudah difilter dari konflik, join dengan titik koma
              const aliasesString = cleanAliases.length > 0 
                ? cleanAliases.join("; ").toLowerCase() 
                : null;
              const benefitsStr = toStr(data.benefits) || "";

              // Kirim info alias yang dibuang karena konflik
              if (aliasConflicts.length > 0) {
                sendEvent({
                  type: "alias_conflict",
                  name: ingredientName,
                  finalName: finalName,
                  conflicts: aliasConflicts,
                  message: `${aliasConflicts.length} alias dibuang karena sudah terdaftar di kamus`,
                });
              }
              const warningsStr = toStr(data.warnings);
              const aiContextStr = toStr(data.aiContext);
              const blacklistReasonStr = toStr(data.blacklistReason);

              // Normalisasi targetFocus: validasi terhadap daftar resmi
              const validFocusList = [
                "Mencerahkan & Bekas Jerawat",
                "Merawat Jerawat & Sebum",
                "Anti-Aging & Garis Halus",
                "Memperbaiki Skin Barrier & Hidrasi",
                "Menenangkan Kemerahan (Soothing)",
                "Eksfoliasi & Tekstur Pori-pori",
              ];
              let rawFocus = toStr(data.targetFocus) || "";
              // Filter hanya fokus yang valid
              const matchedFocus = validFocusList.filter(f =>
                rawFocus.toLowerCase().includes(f.toLowerCase()) ||
                rawFocus.toLowerCase().includes(f.split(" & ")[0].toLowerCase())
              );
              const targetFocusStr = matchedFocus.length > 0 ? matchedFocus.join(", ") : null;

              // Normalisasi blacklistedSkinTypes
              const validSkinTypes = ["Normal", "Kering", "Berminyak", "Kombinasi"];
              let rawBlacklist = toStr(data.blacklistedSkinTypes) || "";
              const matchedBlacklist = validSkinTypes.filter(t =>
                rawBlacklist.toLowerCase().includes(t.toLowerCase())
              );
              const blacklistStr = matchedBlacklist.length > 0 ? matchedBlacklist.join(",") : null;

              // isKeyActive: handle string "true"/"false" juga
              let isKeyActive = false;
              if (typeof data.isKeyActive === "boolean") {
                isKeyActive = data.isKeyActive;
              } else if (typeof data.isKeyActive === "string") {
                isKeyActive = data.isKeyActive.toLowerCase() === "true";
              }

              await prisma.ingredientDictionary.create({
                data: {
                  name: finalName,
                  aliases: aliasesString,
                  type: ingredientType as any,
                  functionalCategory: funcCategory as any,
                  strengthLevel: strengthLevel,
                  isKeyActive: isKeyActive,
                  benefits: benefitsStr,
                  aiContext: aiContextStr,
                  warnings: warningsStr,
                  comedogenicRating: Math.min(5, Math.max(0, Number(data.comedogenicRating) || 0)),
                  safeForPregnancy: data.safeForPregnancy === false ? false : Boolean(data.safeForPregnancy),
                  safeForSensitive: data.safeForSensitive === false ? false : Boolean(data.safeForSensitive),
                  targetFocus: targetFocusStr,
                  blacklistedSkinTypes: blacklistStr,
                  blacklistReason: blacklistReasonStr,
                  isVerified: false, // Selalu false, admin harus review
                },
              });

              // ========================================================
              // AUTO-CLEANUP: Hapus laporan yang cocok (nama + alias + nama asli pencarian)
              // ========================================================
              const namesToMatch = [normalizeString(finalName)];
              // Tambahkan nama asli yang dicari (bisa beda dari finalName AI)
              if (normalizeString(ingredientName) !== normalizeString(finalName)) {
                namesToMatch.push(normalizeString(ingredientName));
              }
              if (aliasesString) {
                splitAliases(aliasesString).forEach(cleanAlias => {
                  if (!namesToMatch.includes(cleanAlias)) {
                    namesToMatch.push(cleanAlias);
                  }
                });
              }

              const aliasCount = namesToMatch.length - 1;
              totalAliasesFound += aliasCount;

              // Hapus dari UnknownIngredient
              const unknownReports = await prisma.unknownIngredient.findMany({
                where: { isReviewed: false },
              });

              let cleanedCount = 0;
              for (const report of unknownReports) {
                if (namesToMatch.includes(normalizeString(report.name))) {
                  try {
                    await prisma.unknownIngredient.delete({ where: { id: report.id } });
                    cleanedCount++;
                  } catch (e) {
                    // Abaikan jika sudah terhapus
                  }
                }
              }
              totalReportsCleaned += cleanedCount;

              let correctionMsg = undefined;
              if (normalizeString(ingredientName) !== normalizeString(finalName)) {
                correctionMsg = `Nama dikoreksi AI menjadi: ${finalName}`;
              }

              results.push({
                name: ingredientName,
                success: true,
                aliasCount,
                model: research.modelUsed,
                usedExternalSource: research.usedExternalSource
              });

              sendEvent({
                type: "progress",
                current: i + 1,
                total: filteredNames.length,
                name: ingredientName,
                status: "done",
                aliasCount,
                reportsCleaned: cleanedCount,
                model: research.modelUsed,
                triedModels: research.triedModels,
                usedExternalSource: research.usedExternalSource,
                reason: correctionMsg
              });

            } catch (dbError: any) {
              console.error(`[Deep Research] DB Error untuk "${ingredientName}":`, dbError.message);

              // Cek apakah error duplikasi
              const errorMsg = dbError.code === 'P2002'
                ? "Bahan sudah ada di kamus (duplikasi nama)"
                : `Gagal menyimpan: ${dbError.message}`;

              results.push({ name: ingredientName, success: false, aliasCount: 0, error: errorMsg });
              sendEvent({
                type: "progress",
                current: i + 1,
                total: filteredNames.length,
                name: ingredientName,
                status: "error",
                error: errorMsg,
              });
            }

          } else {
            results.push({ name: ingredientName, success: false, aliasCount: 0, error: research.error });
            sendEvent({
              type: "progress",
              current: i + 1,
              total: filteredNames.length,
              name: ingredientName,
              status: "error",
              error: research.error,
              triedModels: research.triedModels,
            });
          }

          // ========================================================
          // DELAY: Hindari rate limit free tier Flash (~10 RPM)
          // ========================================================
          if (i < filteredNames.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 8000)); // 8 detik delay
          }
        }

        // ========================================================
        // LOG ADMIN ACTION
        // ========================================================
        try {
          const successCount = results.filter((r) => r.success).length;
          const failedCount = results.filter((r) => !r.success).length;

          if (successCount > 0) {
            await prisma.adminLog.create({
              data: {
                adminName: adminName || "Unknown",
                adminEmail: adminName || "Unknown",
                adminRole: adminRole || "ADMIN",
                action: "CREATE",
                entity: "INGREDIENT",
                details: `Deep Research: Menambahkan ${successCount} bahan baru secara otomatis (${failedCount} gagal). Total alias ditemukan: ${totalAliasesFound}. Laporan dibersihkan: ${totalReportsCleaned}. Bahan: ${results.filter(r => r.success).map(r => r.name).join(", ")}`,
              },
            });
          }
        } catch (logError) {
          console.error("[Deep Research] Gagal menyimpan log:", logError);
        }

        // ========================================================
        // KIRIM RINGKASAN AKHIR
        // ========================================================
        sendEvent({
          type: "complete",
          results,
          summary: {
            total: filteredNames.length,
            success: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            skipped: skippedNames.length,
            totalAliasesFound,
            totalReportsCleaned,
          },
        });

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("[Deep Research] Fatal Error:", error);
    return NextResponse.json(
      { message: `Terjadi kesalahan sistem: ${error.message}` },
      { status: 500 }
    );
  }
}
