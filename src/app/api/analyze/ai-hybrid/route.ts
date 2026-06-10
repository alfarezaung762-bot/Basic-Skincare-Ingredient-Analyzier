// src/app/api/analyze/ai-hybrid/route.ts
// AI HYBRID ANALYZER — Konsultan Dermatologi Formulasi
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { runScoringEngine, UserProfile, ProductInput, EngineResult, FlagDetail } from "../perhitunganlogic/scoringEngine";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// OpenRouter Multi-Key Rotation (dari shared utility)
import { openRouterWithKeyRotation } from "@/lib/openRouterKeyManager";


// ========================
// TYPES
// ========================
export type ModelProvider = "gemini" | "byteplus" | "openrouter";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  label?: string;
}

interface PenaltyAdjustment {
  targetScore: "MATCH" | "SAFETY";
  originalPenalty: number;
  adjustedPenalty: number;
  pointsRestored: number;
  triggerIngredient: string;
  neutralizerIngredients: string[];
  reasoning: string;
  scientificBasis: string;
  adjustmentType: string;
}

interface AiHybridResult {
  overallVerdict?: string;
  formulationFocus: {
    primary: string;
    secondary: string[];
    agreesWithEngine: boolean;
    reasoning: string;
  };
  penaltyAdjustments: PenaltyAdjustment[];
  synergyAnalysis: {
    pair: string;
    effect: string;
    verdict: "POSITIVE" | "NEUTRAL";
  }[];
  warningsAndAdvice: {
    clashes: {
      pair: string;
      risk: string;
      severity: "LOW" | "MEDIUM" | "HIGH";
      contextualAdvice: string;
    }[];
    generalAdvice: string[];
  };
  aiUnknownAnalysis: string;
  toxicClarifications?: {
    ingredient: string;
    clarification: string;
    isTypoSuspected: boolean;
  }[];
}

// Default fallback model list
const DEFAULT_MODELS: ModelConfig[] = [
  { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { provider: "gemini", model: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { provider: "gemini", model: "gemini-1.5-flash-latest", label: "Gemini 1.5 Flash" }
];

const DEFAULT_REFERENCE_SOURCES = "CIR (Cosmetic Ingredient Review), PubChem, JCAD (Journal of Cosmetic & Aesthetic Dermatology), Paula's Choice Ingredient Dictionary, SkinSort, SCCS (Scientific Committee on Consumer Safety)";

// 6 Kategori Fokus Profil
const FOCUS_CATEGORIES = [
  "Mencerahkan & Bekas Jerawat",
  "Merawat Jerawat & Sebum",
  "Anti-Aging & Garis Halus",
  "Memperbaiki Skin Barrier & Hidrasi",
  "Menenangkan Kemerahan (Soothing)",
  "Eksfoliasi & Tekstur Pori-pori",
];

// Flag IDs yang MUTLAK tidak boleh disesuaikan AI
const IMMUTABLE_PENALTY_KEYWORDS = [
  "terlarang/toksik", "toksik",
  "ibu hamil/menyusui", "Risiko Janin",
  "Alergi Mutlak", "alergi",
  "Tanpa Filter UV"
];

// ========================
// VALIDATION FUNCTIONS
// ========================

// Helper untuk mengekstrak JSON secara aman (tahan terhadap tag <think> model reasoning)
const extractJson = (text: string) => {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    try {
      return JSON.parse(match[1]);
    } catch (e) { }
  }

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonStr);
    } catch (e) { }
  }

  return JSON.parse(text);
};

const INVALID_NEUTRALIZERS = ['aqua', 'water', 'air', 'polyacrylamide', 'carbomer', 'xanthan gum', 'phenoxyethanol', 'glycerin', 'butylene glycol'];

function cleanString(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "") // remove zero-width spaces
    .replace(/\u00a0/g, " ")                  // normalize non-breaking spaces
    .replace(/\s+/g, " ")                     // normalize spaces
    .trim()
    .toLowerCase();
}

function validateAdjustments(
  adjustments: PenaltyAdjustment[],
  engineResult: EngineResult,
  detectedNamesLower: string[],
  detectedDbMap: Map<string, any>
): PenaltyAdjustment[] {
  const seen = new Set<string>();

  return adjustments.filter(adj => {
    const triggerClean = cleanString(adj.triggerIngredient);

    // 1. Cek triggerIngredient ADA di detectedIngredients
    if (!detectedNamesLower.some(n => cleanString(n).includes(triggerClean) || triggerClean.includes(cleanString(n)))) {
      console.warn(`[AI-Hybrid] ❌ BUANG adjustment: triggerIngredient "${adj.triggerIngredient}" tidak ditemukan di formulasi`);
      return false;
    }

    // 2. Filter neutralizerIngredients dari bahan dasar yang dilarang (BUG-2)
    adj.neutralizerIngredients = adj.neutralizerIngredients || [];
    adj.neutralizerIngredients = adj.neutralizerIngredients.filter(n =>
      !INVALID_NEUTRALIZERS.includes(cleanString(n))
    );

    // 3. Cek neutralizerIngredients ADA di formulasi
    for (const neutralizer of adj.neutralizerIngredients) {
      const nClean = cleanString(neutralizer);
      if (!detectedNamesLower.some(n => cleanString(n).includes(nClean) || nClean.includes(cleanString(n)))) {
        console.warn(`[AI-Hybrid] ❌ BUANG neutralizer "${neutralizer}" tidak ditemukan di formulasi`);
        adj.neutralizerIngredients = adj.neutralizerIngredients.filter(n => n !== neutralizer);
      }
    }

    // 4. [PENUTUPAN CELAH / LOOPHOLE FIX]
    if (adj.neutralizerIngredients.length === 0) {
      console.warn(`[AI-Hybrid] ❌ BUANG adjustment: Tidak ada neutralizer valid tersisa untuk trigger "${adj.triggerIngredient}"`);
      return false;
    }

    // 5. VALIDASI SILANG TERHADAP GROUND TRUTH PENALTY FLAG (BUG-3)
    const targetFlags = adj.targetScore === "MATCH" ? engineResult.matchFlags : engineResult.safetyFlags;
    const matchingFlag = targetFlags.find(flag => {
      if (flag.pointsDeducted <= 0) return false;
      if (flag.culprits && flag.culprits.length > 0) {
        return flag.culprits.some(c => {
          const cClean = cleanString(c);
          return cClean.includes(triggerClean) || triggerClean.includes(cClean);
        });
      }
      return false;
    });

    if (!matchingFlag) {
      console.warn(`[AI-Hybrid] ❌ BUANG adjustment: Trigger "${adj.triggerIngredient}" tidak memicu penalti klinis aktif di engine`);
      return false;
    }

    // Koreksi originalPenalty agar sesuai dengan ground truth flag
    adj.originalPenalty = -matchingFlag.pointsDeducted;

    // Clamp adjustedPenalty agar tidak melebihi penalti asli
    if (adj.adjustedPenalty > 0) adj.adjustedPenalty = 0;
    if (Math.abs(adj.adjustedPenalty) > matchingFlag.pointsDeducted) {
      adj.adjustedPenalty = -matchingFlag.pointsDeducted;
    }

    // Recalculate pointsRestored berdasarkan adjustedPenalty riil
    adj.pointsRestored = matchingFlag.pointsDeducted - Math.abs(adj.adjustedPenalty);
    adj.pointsRestored = Math.min(50, Math.max(0, adj.pointsRestored));

    // 6. Tidak duplikat (1 trigger = 1 adjustment)
    const key = `${triggerClean}_${adj.targetScore}`;
    if (seen.has(key)) {
      console.warn(`[AI-Hybrid] ❌ BUANG adjustment duplikat: ${key}`);
      return false;
    }
    seen.add(key);

    return true;
  });
}

function sanitizeReasoning(text: string): string {
  if (!text) return '';
  return text
    // Hapus pola angka penalti seperti -15%, -15 poin, -15, 15 poin, 15 %, minus 15, dll
    .replace(/\b-?\d{1,3}\s*(?:%|poin|point|skor|score)?\b/gi, '')
    .replace(/\bpengurangan\s+-?\d{1,3}\s*(?:%|poin|point|skor|score)?\b/gi, '')
    .replace(/\bpenalti\s+-?\d{1,3}\s*(?:%|poin|point|skor|score)?\b/gi, '')
    .replace(/\bskor\b/gi, '')
    .replace(/\bscore\b/gi, '')
    .replace(/\bpoin\b/gi, '')
    .replace(/\bpoint\b/gi, '')
    .replace(/\bdeduct\w*\b/gi, '')
    .replace(/\bpenal\w*\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function replaceNeutralizedFlags(
  originalFlags: FlagDetail[],
  adjustments: PenaltyAdjustment[],
  targetScore: "MATCH" | "SAFETY"
): FlagDetail[] {
  return originalFlags.map(flag => {
    // Cek apakah flag ini termasuk IMMUTABLE
    const isImmutable = IMMUTABLE_PENALTY_KEYWORDS.some(kw =>
      flag.message.toLowerCase().includes(kw.toLowerCase())
    );
    if (isImmutable) return flag;

    // Cari adjustment yang cocok menggunakan cleanString
    const adj = adjustments.find(a => {
      if (a.targetScore !== targetScore) return false;
      if (flag.culprits && flag.culprits.length > 0) {
        return flag.culprits.some(c => {
          const cClean = cleanString(c);
          const aClean = cleanString(a.triggerIngredient);
          return cClean.includes(aClean) || aClean.includes(cClean);
        });
      }
      return false;
    });

    if (adj && adj.pointsRestored > 0) {
      const newType: FlagDetail["type"] = adj.adjustedPenalty === 0 ? "SUCCESS" : "WARNING";

      // BUG-1 Fix: Ekstrak prefix dari flag asli (sebelum titik dua pertama)
      const colonIndex = flag.message.indexOf(':');
      const originalPrefix = colonIndex > 0 ? flag.message.substring(0, colonIndex + 1) : '';

      // Keep culprits (triggers) and neutralizers separate
      return {
        type: newType,
        message: `${originalPrefix} ${sanitizeReasoning(adj.reasoning)}`.trim(),
        pointsDeducted: Math.abs(adj.adjustedPenalty),
        culprits: flag.culprits || [],
        neutralizers: adj.neutralizerIngredients || []
      };
    }

    return flag;
  });
}

// ========================
// MAIN HANDLER
// ========================
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Harap login terlebih dahulu." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { productName, productType, ingredients } = await req.json();

    if (!ingredients) {
      return NextResponse.json({ message: "Komposisi (ingredients) tidak boleh kosong." }, { status: 400 });
    }

    // 1. Ambil profil user
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) {
      return NextResponse.json({ message: "Harap isi profil kulit Anda terlebih dahulu." }, { status: 400 });
    }

    // 2. Ambil dictionary (termasuk aiContext untuk grounding)
    const dictionary = await prisma.ingredientDictionary.findMany();

    // 3. Jalankan Engine V5 (SUMBER KEBENARAN AWAL)
    const userProfileInput: UserProfile = {
      skinType: profile.skinType,
      age: profile.age,
      isPregnantOrNursing: profile.isPregnantOrNursing,
      severity: profile.severity,
      primaryFocus: profile.primaryFocus,
      allergies: profile.allergies || "",
    };

    const productInput: ProductInput = {
      productName: productName || "Produk Tanpa Nama",
      productType,
      ingredientsRaw: ingredients,
    };

    const engineResult = runScoringEngine(userProfileInput, productInput, dictionary);

    // 4. Ambil konfigurasi AI Hybrid dari database
    const aiConfig = await prisma.aIPromptConfig.findUnique({
      where: { id: "singleton_ai_config" }
    });

    const customPrompt = aiConfig?.aihybridPromptingredient || "";
    const useExternal = aiConfig?.aihybridUseExternalSources ?? false;
    const referenceSources = aiConfig?.aihybridReferenceSources || DEFAULT_REFERENCE_SOURCES;

    let modelList: ModelConfig[] = DEFAULT_MODELS;
    if (aiConfig?.aihybridModelPriority) {
      try {
        const parsed = JSON.parse(aiConfig.aihybridModelPriority);
        // Dukung backward compatibility jika array of string
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === "string") {
            modelList = parsed.map((m: string) => ({ provider: "gemini", model: m }));
          } else {
            modelList = parsed;
          }
        }
      } catch { /* use default */ }
    }

    // 5. Build Context Grounding
    const detectedNamesLower = engineResult.detectedIngredients.map(i => i.name.toLowerCase());
    const detectedDbMap = new Map(dictionary.map(d => [d.name.toLowerCase(), d]));

    // Build rich context per ingredient (termasuk aiContext)
    const ingredientContextLines = engineResult.detectedIngredients.map((ing, idx) => {
      const dbEntry = dictionary.find(d => d.name.toLowerCase() === ing.name.toLowerCase());
      const aiCtx = (dbEntry as any)?.aiContext || "";
      const positionInfo = `Posisi urutan: #${idx + 1}`;

      let line = `- [${positionInfo}] ${ing.name} (Tipe: ${ing.type}, Fungsi: ${ing.functionalCategory}, Komedogenik: ${ing.comedogenicRating}/5, Key Active: ${ing.isKeyActive})`;
      line += `\n  Benefits: ${ing.benefits}`;
      if (aiCtx) {
        // Kirim ringkasan aiContext (maks 2000 kata per bahan agar tidak overload prompt)
        const aiCtxWords = aiCtx.split(/\s+/);
        const truncated = aiCtxWords.length > 2000 ? aiCtxWords.slice(0, 2000).join(' ') + '...' : aiCtx;
        line += `\n  Analisis Mendalam: ${truncated}`;
      }
      return line;
    }).join("\n\n");

    // Build penalty context
    const matchPenaltyCtx = engineResult.matchFlags
      .filter(f => f.pointsDeducted > 0)
      .map(f => `[${f.type}] ${f.message} (Penalti: -${f.pointsDeducted}) Bahan: ${f.culprits?.join(', ') || 'N/A'}`)
      .join("\n") || "Tidak ada penalti.";

    const safetyPenaltyCtx = engineResult.safetyFlags
      .filter(f => f.pointsDeducted > 0)
      .map(f => `[${f.type}] ${f.message} (Penalti: -${f.pointsDeducted}) Bahan: ${f.culprits?.join(', ') || 'N/A'}`)
      .join("\n") || "Tidak ada penalti.";

    // Build product type context for AI advice
    const productTypeContext: Record<string, string> = {
      FACEWASH: "Produk bilas — waktu kontak singkat (~60 detik). Efek negatif bahan keras BERKURANG karena tidak menempel lama. Surfaktan keras tetap bisa merusak barrier. Saran: batasi pemakaian 1x sehari jika mengandung harsh, gunakan sebagai sabun kedua.",
      MOISTURIZER: "Produk menempel — bahan meresap ke kulit berjam-jam. Efek komedogenik dan iritasi PENUH. Saran: gunakan tipis-tipis di area berminyak, hindari area T-zone jika berminyak.",
      SUNSCREEN: "Produk menempel + terpapar sinar UV. Saran: reapply tiap 2-3 jam, lakukan patch test, perhatikan stabilitas filter UV."
    };

    const focusTallyCtx = engineResult.primaryProductFocus
      ? `Engine mendeteksi fokus utama: "${engineResult.primaryProductFocus}". Fokus sekunder: ${engineResult.secondaryProductFocuses?.join(', ') || 'Tidak ada'}.`
      : "Engine tidak mendeteksi fokus spesifik (mungkin banyak bahan asing).";

    // ========================
    // 6. BUILD SYSTEM PROMPT
    // ========================
    // Hitung zona posisi INCI secara dinamis berdasarkan total bahan
    const totalIngredientsCount = engineResult.detectedIngredients.length + engineResult.unknownIngredients.length;
    const topThird = Math.max(1, Math.round(totalIngredientsCount / 3));
    const midThird = Math.max(topThird + 1, Math.round(totalIngredientsCount * 2 / 3));
    const systemPrompt = `
${customPrompt || "Anda adalah seorang Konsultan Dermatologi Kosmetik kelas dunia dan Ahli Formulasi (Cosmetic Chemist)."}

=== ATURAN PERILAKU SISTEM (DIKUNCI — TIDAK BISA DIUBAH) ===

ATURAN 1 — SUMBER KEBENARAN:
Semua data parameter bahan berikut adalah FAKTA dari database terverifikasi. DILARANG mengarang parameter yang tidak ada.
${!useExternal ? "MODE DATABASE SAJA: Anda HANYA boleh menganalisis berdasarkan data di bawah ini. DILARANG menambahkan klaim dari sumber luar." : `MODE SUMBER DIPERLUAS: Anda boleh merujuk sumber terpercaya berikut untuk memperkuat analisis: ${referenceSources}`}

ATURAN 2 — BATASAN PENYESUAIAN PENALTI & KONTEKS KOSONG:
- Anda HANYA bisa MENGURANGI/MENETRALISIR penalti (maks 50 poin per item).
- Anda TIDAK BISA menambah skor melebihi batas atau memberikan bonus positif.
- adjustedPenalty HARUS ≤ 0 (negatif atau nol). Nol artinya penalti dinetralisir sepenuhnya.
- PENALTI MUTLAK yang TIDAK BOLEH disentuh: Bahan Toksik, Risiko Janin/Hamil, Alergi Mutlak, Tanpa Filter UV.
- Untuk bahan dengan aiContext KOSONG: Anda boleh menganalisis berdasarkan pengetahuan umum Anda (khususnya untuk mencari neutralizer/buffering), tetapi Anda WAJIB menyebutkan bahwa bahan ini 'belum dianalisis mendalam secara internal' dalam reasoning.

ATURAN 3 — PERTIMBANGAN URUTAN BAHAN (BERDASARKAN REGULASI):
Menurut EU Regulation 1223/2009 Annex VI dan FDA, bahan wajib diurutkan dari konsentrasi tertinggi ke terendah, KECUALI bahan <1% yang boleh diacak di akhir.
TOTAL BAHAN DALAM PRODUK INI: ${totalIngredientsCount} bahan.
PANDUAN POSISI ADAPTIF (berdasarkan total ${totalIngredientsCount} bahan):
- ZONA DOMINAN (Posisi #1 – #${topThird}): Konsentrasi tinggi (>5%). Bahan-bahan dasar/utama. Efek komedogenik, iritan, dan terapeutik PENUH.
- ZONA MENENGAH (Posisi #${topThird + 1} – #${midThird}): Konsentrasi menengah (1-5%). Efek bahan signifikan tapi tidak dominan.
- ZONA RENDAH (Posisi #${midThird + 1} – #${totalIngredientsCount}): Kemungkinan konsentrasi <1%. Efek negatif bahan (komedogenik, iritan) SANGAT BERKURANG di zona ini.
GARIS BATAS 1% MUTLAK (THE 1% LINE):
Pewarna (CI...), Pengawet (Phenoxyethanol, Parabens), Pengental (Carbomer, Xanthan Gum), dan Pewangi (Fragrance/Parfum) HAMPIR PASTI berada di konsentrasi ≤1% secara global. Posisi mereka (dan SEMUA BAHAN setelahnya) adalah penanda mutlak konsentrasi rendah, meskipun daftarnya sangat pendek (misal hanya 5 bahan).

ATURAN 3B — EVALUASI PENALTI BERBASIS DOSE-RESPONSE (WAJIB):
Jika bahan memiliki section [AMBANG KONSENTRASI & DOSE-RESPONSE] di Analisis Mendalam-nya, GUNAKAN data tersebut untuk mengevaluasi apakah penalti engine masih relevan berdasarkan estimasi konsentrasi dari posisi INCI.
Contoh penerapan: "Coconut Oil (komedogenik 4/5) berada di posisi #${totalIngredientsCount > 15 ? '22' : '8'} dari ${totalIngredientsCount} bahan → estimasi konsentrasi rendah. Data dose-response menunjukkan risiko komedogenik tidak signifikan di bawah 1%. Penalti bisa dikurangi."
Jika TIDAK ADA data dose-response untuk bahan tersebut, gunakan estimasi umum: bahan di Zona Rendah dengan komedogenik ≥3 TETAP mendapat peringatan namun dengan catatan bahwa "risiko berkurang signifikan karena konsentrasi rendah".
KAMU DILARANG menyebutkan angka persentase spesifik ke pengguna (seperti ">5%", "3%"). Gunakan narasi deskriptif seperti "berada di posisi atas/dominan" atau "sebagai pelengkap di akhir daftar".

ATURAN 4 — BAHASA OUTPUT & NADA KONSULTASI (TONE):
Gunakan bahasa Indonesia baku yang edukatif, berempati, dan objektif. DILARANG menakut-nakuti (fear-mongering) atau menjanjikan kesembuhan instan.
- Peringatan CRITICAL (Merah): Jangan sekadar melarang. Jelaskan risiko spesifiknya lalu beri solusi. (Contoh: "Bahan ini berisiko merusak skin barrier kulit kering Anda. Sebaiknya hindari, atau pastikan Anda melapisi wajah dengan pelembap yang sangat tebal sebelumnya.")
- Peringatan WARNING (Kuning): Gunakan nada membimbing. (Contoh: "Produk ini cukup aktif. Mulailah dengan penggunaan 2x seminggu di malam hari agar kulit dapat beradaptasi.")
- SUCCESS (Hijau): Beri apresiasi rasional. (Contoh: "Formulasi ini sangat bersahabat untuk menjaga skin barrier Anda. Aman untuk rutinitas harian.")

ATURAN 5 — FOKUS FORMULASI:
Pilih fokus utama dari HANYA 6 kategori ini:
${FOCUS_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

ATURAN 6 — SARAN KONTEKSTUAL BERDASARKAN TIPE PRODUK (SANGAT PENTING):
Tipe produk saat ini: ${productType}

PANDUAN SEVERITY PER TIPE PRODUK:

${productType === "FACEWASH" ? `FACEWASH (Produk bilas — waktu kontak ~60 detik):
- EKSFOLIASI: Efek berkurang karena kontak singkat. Sarankan "gunakan 1x sehari di malam hari" atau "jadikan sabun pembersih kedua setelah micellar water". Untuk kulit sensitif: "batasi 2-3x seminggu".
- IRITASI: Efek berkurang karena kontak singkat. Sarankan "lakukan patch test, gunakan 1x sehari". Jika ada bahan penenang di formulasi, sebutkan bahwa hal itu membantu.
- KOMEDO: Efek SANGAT berkurang karena langsung dibilas. Jelaskan bahwa durasi kontak singkat membuat risiko penyumbatan pori jauh lebih kecil dibanding produk yang menempel. Namun tetap perhatikan posisi urutan bahan — jika bahan komedogenik di posisi awal (konsentrasi tinggi), tetap beri peringatan.
- BATASAN PENGGUNAAN (Blacklist Kulit): Durasi singkat bisa meringankan efek. Jelaskan alasannya kenapa berbahaya TAPI sampaikan juga bahwa kontak singkat mengurangi risiko. Beri saran konkret seperti "batasi 1x sehari" atau "gunakan hanya jika tidak ada alternatif lain".` : ""}

${productType === "MOISTURIZER" ? `MOISTURIZER (Produk leave-on — menempel di kulit berjam-jam):
- EKSFOLIASI: Efek PENUH karena menempel lama. Sarankan "HANYA gunakan di malam hari, 2-3x seminggu. WAJIB pakai sunscreen di pagi hari karena kulit jadi lebih sensitif terhadap UV."
- IRITASI: Efek PENUH. Sarankan "lakukan patch test selama 3 hari di belakang telinga atau rahang. Jika muncul kemerahan, STOP penggunaan." Beri saran oleskan tipis-tipis.
- KOMEDO: Efek PENUH karena bahan meresap penuh. Sarankan "patch test 3 hari, hindari area T-zone jika berminyak, oleskan tipis-tipis." Posisi urutan bahan sangat penting di sini.
- BATASAN PENGGUNAAN (Blacklist Kulit): TIDAK ADA keringanan dari durasi kontak. Sampaikan dengan tegas bahwa bahan ini berbahaya untuk tipe kulit tersebut. Sarankan "HINDARI produk ini" atau "ganti ke produk yang lebih aman".` : ""}

${productType === "SUNSCREEN" ? `SUNSCREEN (Produk leave-on + terpapar sinar UV):
- EKSFOLIASI: Sangat jarang terjadi di sunscreen. Jika ada: "JANGAN gunakan tanpa lapisan pelindung tambahan."
- IRITASI: Efek PENUH + risiko bertambah saat reapply. Sarankan "lakukan patch test sebelum pemakaian seharian. Perhatikan apakah iritasi bertambah saat reapply."
- KOMEDO: Efek PENUH. Sarankan "pilih formula non-comedogenic jika kulit berminyak. Bersihkan dengan double cleansing di malam hari."
- BATASAN PENGGUNAAN (Blacklist Kulit): TIDAK ADA keringanan. Jika bahan berbahaya untuk kulit tertentu, sarankan "GANTI produk sunscreen". Ingatkan pentingnya perlindungan UV tapi bukan dengan produk yang merusak kulit.` : ""}

ATURAN 7 — HUKUM SINERGI ANTAGONIS (SYARAT MUTLAK NETRALISASI):
Kamu HANYA boleh menetralkan penalti (mengisi neutralizerIngredients) jika ada BUKTI FISIK sinergi antagonis di dalam formulasi. Gunakan panduan presisi ini:
A. PENAWAR KOMEDOGENIK (Penyumbat Pori):
   - HANYA bisa dinetralkan oleh agen keratolitik (memecah keratin) seperti Salicylic Acid (BHA), Glycolic Acid (AHA), LHA, atau PHA.
   - HANYA bisa dinetralkan oleh agen sebum-regulator terbukti seperti Niacinamide (>2%), Zinc PCA, atau Retinoid.
   - DILARANG menetralkan komedo menggunakan bahan pelembap (Ceramide/Hyaluronic Acid) karena pelembap TIDAK melarutkan sumbatan pori.

B. PENAWAR IRITASI ASAM/HARSH (Kerusakan Barrier):
   - HANYA bisa dinetralkan oleh agen penyokong lipid barrier (Ceramide NP/AP/EOP, Cholesterol, Fatty Acids).
   - HANYA bisa dinetralkan oleh agen anti-inflamasi seluler tingkat tinggi (Madecassoside, Asiaticoside, Panthenol, Bisabolol, Allantoin).
   - DILARANG menetralkan iritasi eksfoliator kuat (seperti Glycolic Acid 10%) hanya dengan pelarut dasar atau humektan biasa (Glycerin).

C. BAHAN TERLARANG SEBAGAI PENETRAL:
   - Pelarut (Aqua/Water/Air), pH Adjuster (Citric Acid/Sodium Hydroxide), Pengental (Carbomer/Xanthan Gum), dan Pengawet (Phenoxyethanol/Parabens) ADALAH BAHAN DASAR. Mereka TIDAK PERNAH bisa menjadi neutralizer.

ATURAN 8 — REASONING EDUKATIF & TO THE POINT (SANGAT PENTING):
Setiap penjelasan reasoning dalam penaltyAdjustments HARUS padat, edukatif, berbasis ilmiah, dan langsung ke intinya tanpa basa-basi (DILARANG menggunakan kata penenang yang tidak perlu seperti "jangan khawatir", "tidak perlu cemas", "maka dari itu", dll.):
1. DIAGNOSIS PENALTI: Jelaskan secara singkat mengapa bahan tersebut memicu risiko bagi kondisi kulit pengguna (contoh: "Dimethicone/Vinyl Dimethicone Crosspolymer bersifat oklusif yang berpotensi memerangkap sebum pada kulit berjerawat aktif.").
2. MEKANISME NETRALISASI (EDUKATIF): Jelaskan secara ilmiah mengapa risiko tersebut hilang atau berkurang secara drastis dalam formulasi ini (contoh: "Namun, produk ini adalah pembersih bilas (wash-off) dengan durasi kontak singkat (~60 detik) sehingga tidak sempat membentuk lapisan film oklusif. Ditambah lagi, keberadaan Niacinamide membantu menyeimbangkan sekresi sebum.").
3. REKOMENDASI KLINIS: Berikan kesimpulan konkret dan instruksi pemakaian yang to-the-point (contoh: "Risiko penyumbatan pori teratasi sepenuhnya. Aman digunakan sebagai sabun wajah harian.").
JIKA TIDAK ADA PENETRAL: Jangan buat penyesuaian sama sekali (hapus dari array JSON).

ATURAN 9 — KLARIFIKASI TOKSIK & ANOMALI LABEL (KHUSUS BAHAN TOXIC):
Bahan dengan penalti TOXIC (-100) TIDAK BISA dinetralkan atau dikembalikan poinnya (skor otomatis 0 demi keselamatan).
NAMUN, jika Anda mencurigai bahan TOXIC tersebut sebenarnya adalah KESALAHAN KETIK (Typo) dari pabrik di kemasan (misal: ada kata "Acrylamide" yang berdiri sendiri, namun di sebelahnya/di dekatnya ada kata "Copolymer", yang seharusnya adalah "Polyacrylamide"), Anda WAJIB memberikan klarifikasi yang menenangkan pengguna.
Masukkan klarifikasi tersebut ke dalam array "toxicClarifications". Jangan ubah "penaltyAdjustments" untuk bahan TOXIC ini.

=== DATA PROFIL PENGGUNA ===
- Tipe Kulit: ${profile.skinType}
- Umur: ${profile.age} tahun
- Tingkat Keparahan Jerawat: ${profile.severity}
- Fokus Perawatan: ${profile.primaryFocus}
- Alergi: ${profile.allergies || "Tidak ada"}
- Hamil/Menyusui: ${profile.isPregnantOrNursing ? "Ya" : "Tidak"}

=== DAFTAR BAHAN MENTAH (URUTAN ASLI — DARI KONSENTRASI TERTINGGI KE TERENDAH) ===
${ingredients}

=== DATA BAHAN TERDETEKSI DARI DATABASE ===
${ingredientContextLines || "Tidak ada bahan yang terverifikasi."}

=== BAHAN ASING (TIDAK ADA DI DATABASE) ===
${engineResult.unknownIngredients.join(", ") || "Tidak ada bahan asing."}

=== PENALTI MATCH SCORE DARI ENGINE ===
${matchPenaltyCtx}

=== PENALTI SAFETY SCORE DARI ENGINE ===
${safetyPenaltyCtx}

=== FOKUS FORMULASI DARI ENGINE ===
${focusTallyCtx}

=== FORMAT OUTPUT (JSON KETAT) ===
Kembalikan HANYA JSON valid tanpa markdown code block:
{
  "overallVerdict": "Rangkuman 2-3 kalimat: apakah produk ini cocok untuk user, apa kelebihannya, dan apa yang perlu diwaspadai. Gunakan bahasa awam yang mudah dipahami. Contoh: 'Produk ini cocok untuk kulit berminyak sensitif Anda. Formulasi didominasi bahan pembersih lembut dengan perlindungan barrier yang baik. Perhatikan kandungan Citric Acid yang bisa mengiritasi jika digunakan berlebihan.'",
  "formulationFocus": {
    "primary": "salah satu dari 6 kategori di atas",
    "secondary": ["kategori lain jika relevan"],
    "agreesWithEngine": true/false,
    "reasoning": "alasan singkat"
  },
  "penaltyAdjustments": [
    {
      "targetScore": "MATCH atau SAFETY",
      "originalPenalty": -20,
      "adjustedPenalty": -5,
      "pointsRestored": 15,
      "triggerIngredient": "Nama Bahan Pemicu",
      "neutralizerIngredients": ["Bahan Penetralisir 1"],
      "reasoning": "Penjelasan bahasa awam: mulai dari masalah bahan, lalu kenapa bisa ternetralisir, akhiri dengan saran pemakaian konkret (frekuensi, patch test, dll). Ikuti ATURAN 8.",
      "scientificBasis": "Referensi ilmiah",
      "adjustmentType": "COMEDO_DILUTION"
    }
  ],
  "synergyAnalysis": [
    {"pair": "Bahan A + Bahan B", "effect": "efek sinergi", "verdict": "POSITIVE"}
  ],
  "warningsAndAdvice": {
    "clashes": [
      {"pair": "Bahan X + Bahan Y", "risk": "risiko", "severity": "LOW/MEDIUM/HIGH", "contextualAdvice": "saran berdasarkan tipe produk dan profil kulit"}
    ],
    "generalAdvice": ["saran umum berdasarkan profil"]
  },
  "toxicClarifications": [
    {
      "ingredient": "Nama Bahan TOXIC",
      "clarification": "Penjelasan bahwa ini mungkin typo (misal Acrylamide yang seharusnya Polyacrylamide). Edukasi secara halus tanpa merendahkan brand. Akhiri dengan saran: Mohon konfirmasi ke pihak brand.",
      "isTypoSuspected": true
    }
  ],
  "aiUnknownAnalysis": "analisis bahan asing atau 'Semua bahan terverifikasi'"
}
`;

    // ========================
    // 7. CALL AI (CASCADE PER-MODEL WITH CACHING)
    // ========================
    let aiResult: AiHybridResult | null = null;
    let usedModel = "";

    for (const modelConfig of modelList) {
      const currentModel = modelConfig.model;
      const provider = modelConfig.provider;

      // Hitung SHA-256 cacheKey
      const cacheKey = crypto.createHash("sha256").update(systemPrompt + currentModel).digest("hex");

      // Cek apakah data sudah ada di cache
      try {
        const cached = await prisma.aiHybridCache.findUnique({
          where: { cacheKey }
        });
        if (cached) {
          console.log(`[AI-Hybrid] ⚡ CACHE HIT: Menggunakan cache untuk model ${currentModel}`);
          aiResult = cached.aiResponse as any;
          usedModel = currentModel;
          break; // Keluar dari loop cascade, proses selesai!
        }
      } catch (cacheErr) {
        console.error("[AI-Hybrid] Gagal membaca cache:", cacheErr);
      }

      // Cache Miss: Jalankan API Model
      try {
        console.log(`[AI-Hybrid] 🤖 CACHE MISS: Mencoba model API: ${currentModel} (${provider})...`);

        let responseText = "";

        if (provider === "gemini") {
          const model = genAI.getGenerativeModel({
            model: currentModel,
            generationConfig: {
              responseMimeType: "application/json",
            }
          });
          const result = await model.generateContent(systemPrompt);
          responseText = result.response.text();
        } else if (provider === "openrouter") {
          // Check if reasoning is enabled for this model in the config
          const useReasoning = (modelConfig as any).useReasoning || false;

          const payload: any = {
            model: currentModel,
            messages: [{ role: "user", content: systemPrompt }],
            temperature: 0.2
          };

          const { responseText: orText } = await openRouterWithKeyRotation(payload, useReasoning, "[AI-Hybrid]");
          responseText = orText;
        } else {
          // OpenAI Compatible (BytePlus)
          let byteplusUrl = process.env.BYTEPLUS_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3";
          if (byteplusUrl.includes("ark.byteplus.com")) {
            byteplusUrl = "https://ark.ap-southeast.bytepluses.com/api/v3";
          }
          const client = new OpenAI({
            apiKey: process.env.BYTEPLUS_API_KEY || "",
            baseURL: byteplusUrl,
          });

          const response = await client.chat.completions.create({
            model: currentModel,
            messages: [{ role: "user", content: systemPrompt }],
            temperature: 0.2
          });
          responseText = response.choices[0].message.content || "{}";
        }

        // Ekstraksi JSON Tahan Banting (Aman dari <think> tags)
        try {
          aiResult = extractJson(responseText);
        } catch (parseError) {
          console.warn(`[AI-Hybrid] ⚠️ Gagal parse JSON dari respons.`);
          throw new Error(`Tidak dapat mengekstrak JSON valid dari respons.`);
        }

        usedModel = currentModel;
        console.log(`[AI-Hybrid] ✅ Berhasil memanggil API model: ${currentModel}`);

        // Simpan hasil ke cache database secara aman
        try {
          await prisma.aiHybridCache.create({
            data: {
              cacheKey,
              ingredientsInput: ingredients,
              modelUsed: currentModel,
              aiResponse: aiResult as any
            }
          });
          console.log(`[AI-Hybrid] 💾 Hasil analisis berhasil disimpan ke cache untuk model ${currentModel}`);
        } catch (saveCacheErr: any) {
          if (saveCacheErr.code === "P2002") {
            console.log(`[AI-Hybrid] Cache key sudah disimpan oleh request paralel lain.`);
          } else {
            console.warn(`[AI-Hybrid] Gagal menyimpan cache:`, saveCacheErr.message);
          }
        }

        break; // Berhasil, keluar dari cascade!
      } catch (err: any) {
        console.warn(`[AI-Hybrid] ⚠️ Model ${modelConfig.model} gagal: ${err.message}. Lanjut model berikutnya...`);
        continue; // Pindah ke model berikutnya
      }
    }

    // ========================
    // 8. PROCESS AI RESULT ATAU FALLBACK
    // ========================
    let finalMatchScore = engineResult.matchScore;
    let finalSafetyScore = engineResult.safetyScore;
    let finalMatchFlags = [...engineResult.matchFlags];
    let finalSafetyFlags = [...engineResult.safetyFlags];
    let aiHybridData: any = null;

    if (aiResult) {
      // VALIDASI ADJUSTMENTS (7 LAPIS)
      const validatedAdjustments = validateAdjustments(
        aiResult.penaltyAdjustments || [],
        engineResult,
        detectedNamesLower,
        detectedDbMap
      );

      console.log(`[AI-Hybrid] 📊 Adjustment valid: ${validatedAdjustments.length}/${(aiResult.penaltyAdjustments || []).length}`);

      // Terapkan adjustments ke skor
      validatedAdjustments.forEach(adj => {
        if (adj.targetScore === "MATCH") {
          finalMatchScore += adj.pointsRestored;
        } else {
          finalSafetyScore += adj.pointsRestored;
        }
      });

      // Clamp 0-100
      finalMatchScore = Math.max(0, Math.min(100, Math.round(finalMatchScore)));
      finalSafetyScore = Math.max(0, Math.min(100, Math.round(finalSafetyScore)));

      // Logging Audit Penyesuaian AI (FITUR-3)
      if (validatedAdjustments.length > 0) {
        try {
          await prisma.aiAdjustmentLog.createMany({
            data: validatedAdjustments.map(adj => ({
              userId: userId,
              productName: productName || "Produk Tanpa Nama",
              triggerIngredient: adj.triggerIngredient,
              originalPenalty: adj.originalPenalty,
              adjustedPenalty: adj.adjustedPenalty,
              pointsRestored: adj.pointsRestored,
              reasoning: adj.reasoning,
              adjustmentType: adj.adjustmentType || "UNKNOWN",
              modelUsed: usedModel,
              targetScore: adj.targetScore,
            }))
          });
        } catch (logErr) {
          console.error(`[AI-Hybrid] ❌ Gagal menyimpan AiAdjustmentLog:`, logErr);
        }
      }

      // Ganti flag yang ter-netralisir
      finalMatchFlags = replaceNeutralizedFlags(finalMatchFlags, validatedAdjustments, "MATCH");
      finalSafetyFlags = replaceNeutralizedFlags(finalSafetyFlags, validatedAdjustments, "SAFETY");

      // Rebuild match/safety labels
      const getMatchLabel = (s: number) => s === 100 ? "Sempurna" : s >= 90 ? "Sangat Cocok" : s >= 75 ? "Cocok" : s >= 50 ? "Kurang Optimal" : "Tidak Cocok";
      const getSafetyLabel = (s: number) => s === 100 ? "Sangat Aman" : s >= 80 ? "Aman" : s >= 60 ? "Butuh Adaptasi / Hati-hati" : s >= 40 ? "Berisiko / Batasi Penggunaan" : "Hindari Mutlak";

      // AI Hybrid data for frontend consultation card
      aiHybridData = {
        formulationFocus: aiResult.formulationFocus || null,
        synergyAnalysis: aiResult.synergyAnalysis || [],
        warningsAndAdvice: aiResult.warningsAndAdvice || { clashes: [], generalAdvice: [] },
        aiUnknownAnalysis: aiResult.aiUnknownAnalysis || "",
        adjustmentsSummary: validatedAdjustments.map(a => ({
          trigger: a.triggerIngredient,
          neutralizers: a.neutralizerIngredients,
          restored: a.pointsRestored,
          type: a.adjustmentType,
        })),
        modelUsed: usedModel,
      };

      // Override engineResult scores and flags
      engineResult.matchScore = finalMatchScore;
      engineResult.matchLabel = getMatchLabel(finalMatchScore);
      engineResult.matchFlags = finalMatchFlags;

      // Inject Toxic Clarifications to the Safety Flags Message
      if (aiResult.toxicClarifications && aiResult.toxicClarifications.length > 0) {
        finalSafetyFlags = finalSafetyFlags.map(flag => {
          if (flag.pointsDeducted === 100 && flag.type === "CRITICAL") {
            const clarif = aiResult.toxicClarifications?.find(c => flag.culprits?.includes(c.ingredient));
            if (clarif) {
              return {
                ...flag,
                message: `[Klarifikasi AI] ${clarif.clarification} (Sistem tetap mengunci peringatan ini demi keamanan mutlak).`
              };
            }
          }
          return flag;
        });
      }

      engineResult.safetyScore = finalSafetyScore;
      engineResult.safetyLabel = getSafetyLabel(finalSafetyScore);
      engineResult.safetyFlags = finalSafetyFlags;

      // Override focus if AI disagrees and has reasoning
      if (aiResult.formulationFocus && !aiResult.formulationFocus.agreesWithEngine) {
        engineResult.primaryProductFocus = aiResult.formulationFocus.primary;
        engineResult.secondaryProductFocuses = aiResult.formulationFocus.secondary;
      }
    }

    // Build analysis data (compatible with existing frontend)
    const analysisData = {
      matchExplanation: finalMatchFlags.length > 0
        ? finalMatchFlags.map(f => `${f.type === "CRITICAL" ? "🚨" : f.type === "WARNING" ? "⚠️" : f.type === "SUCCESS" ? "✅" : "ℹ️"} ${f.message}`).join('\n')
        : "✅ Produk ini ideal untuk profil kulit Anda.",

      safetyExplanation: finalSafetyFlags.length > 0
        ? finalSafetyFlags.map(f => `${f.type === "CRITICAL" ? "🚨" : f.type === "WARNING" ? "⚠️" : f.type === "SUCCESS" ? "✅" : "ℹ️"} ${f.message}`).join('\n')
        : "✅ Tidak ditemukan risiko keamanan signifikan.",

      aiUnknownAnalysis: aiResult?.aiUnknownAnalysis
        || (engineResult.unknownIngredients.length > 0
          ? "⚠️ Ada bahan asing yang tidak bisa dianalisis AI saat ini."
          : "✅ Seluruh bahan terverifikasi."),

      recommendations: aiResult?.warningsAndAdvice?.generalAdvice
        || ["Lakukan patch test sebelum pemakaian rutin."]
    };

    // Simpan ke History
    const savedHistory = await prisma.analysisHistory.create({
      data: {
        userId,
        productName: productName || "Produk Analisis",
        productType,
        ingredientsInput: ingredients,
        matchScore: finalMatchScore,
        safetyScore: finalSafetyScore,
        aiResponse: { ...analysisData, aiHybridData },
      }
    });

    // FITUR-2: FIFO 10 Slot History per user (hanya hitung yang belum di-save)
    const unsavedHistories = await prisma.analysisHistory.findMany({
      where: { userId, isSaved: false },
      orderBy: { createdAt: "desc" },
      select: { id: true }
    });

    if (unsavedHistories.length > 10) {
      const idsToDelete = unsavedHistories.slice(10).map(h => h.id);
      await prisma.analysisHistory.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    }

    // FITUR-3: Auto-Report Unknown Ingredients
    if (aiConfig?.autoReportUnknowns && engineResult.unknownIngredients.length > 0) {
      for (const name of engineResult.unknownIngredients) {
        try {
          await prisma.unknownIngredient.upsert({
            where: { name: name.toLowerCase().trim() },
            update: { reportCount: { increment: 1 }, isReviewed: false },
            create: { name: name.toLowerCase().trim(), reportCount: 1 },
          });
        } catch (e) {
          console.warn(`[Auto-Report] Gagal melaporkan bahan asing: ${name}`, e);
        }
      }
    }

    return NextResponse.json({
      engineResult,
      analysis: analysisData,
      aiHybridData,
      historyId: savedHistory.id
    }, { status: 200 });

  } catch (error: any) {
    console.error("[AI-Hybrid] ❌ Fatal Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada sistem AI Hybrid." },
      { status: 500 }
    );
  }
}
