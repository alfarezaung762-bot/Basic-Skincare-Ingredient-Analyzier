// src/app/api/analyze/ai-hybrid/route.ts
// AI HYBRID ANALYZER — Konsultan Dermatologi Formulasi
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { runScoringEngine, UserProfile, ProductInput, EngineResult, FlagDetail } from "../perhitunganlogic/scoringEngine";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// ========================
// TYPES
// ========================
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
}

// Default fallback model list
const DEFAULT_MODELS = [
  "gemma-4-31b-it",
  "gemma-4-26b-a4b-it",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-flash-preview",
  "gemini-3-flash-preview",
  "gemini-3-flash",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-1.5-flash-latest"
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
function validateAdjustments(
  adjustments: PenaltyAdjustment[],
  engineResult: EngineResult,
  detectedNamesLower: string[],
  detectedDbMap: Map<string, any>
): PenaltyAdjustment[] {
  const seen = new Set<string>();

  return adjustments.filter(adj => {
    // 1. Cek triggerIngredient ADA di detectedIngredients
    const triggerLower = adj.triggerIngredient.toLowerCase();
    if (!detectedNamesLower.some(n => n.includes(triggerLower) || triggerLower.includes(n))) {
      console.warn(`[AI-Hybrid] ❌ BUANG adjustment: triggerIngredient "${adj.triggerIngredient}" tidak ditemukan di formulasi`);
      return false;
    }

    // 2. Cek neutralizerIngredients ADA di formulasi
    for (const neutralizer of adj.neutralizerIngredients) {
      const nLower = neutralizer.toLowerCase();
      if (!detectedNamesLower.some(n => n.includes(nLower) || nLower.includes(n))) {
        console.warn(`[AI-Hybrid] ❌ BUANG adjustment: neutralizer "${neutralizer}" tidak ditemukan di formulasi`);
        return false;
      }
    }

    // 3. Clamp pointsRestored: maks 50
    adj.pointsRestored = Math.min(50, Math.max(0, adj.pointsRestored));

    // 4. adjustedPenalty tidak boleh LEBIH BESAR dari originalPenalty (AI hanya KURANGI)
    if (Math.abs(adj.adjustedPenalty) > Math.abs(adj.originalPenalty)) {
      console.warn(`[AI-Hybrid] ❌ BUANG adjustment: adjustedPenalty (${adj.adjustedPenalty}) > originalPenalty (${adj.originalPenalty})`);
      return false;
    }

    // 5. adjustedPenalty tidak boleh POSITIF (tidak bisa jadi buff)
    if (adj.adjustedPenalty > 0) {
      adj.adjustedPenalty = 0; // Clamp ke netral
    }

    // 6. Tidak duplikat (1 trigger = 1 adjustment)
    const key = `${adj.triggerIngredient.toLowerCase()}_${adj.targetScore}`;
    if (seen.has(key)) {
      console.warn(`[AI-Hybrid] ❌ BUANG adjustment duplikat: ${key}`);
      return false;
    }
    seen.add(key);

    // 7. Recalculate pointsRestored
    adj.pointsRestored = Math.abs(adj.originalPenalty) - Math.abs(adj.adjustedPenalty);
    adj.pointsRestored = Math.min(50, Math.max(0, adj.pointsRestored));

    return true;
  });
}

function sanitizeReasoning(text: string): string {
  // Strip angka skor/persen dari reasoning (Lapis 7)
  return text
    .replace(/\b\d{1,3}\s*%/g, '')
    .replace(/\bskor\b/gi, '')
    .replace(/\bscore\b/gi, '')
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

    // Cari adjustment yang cocok
    const adj = adjustments.find(a => {
      if (a.targetScore !== targetScore) return false;
      // Match berdasarkan culprits
      if (flag.culprits && flag.culprits.length > 0) {
        return flag.culprits.some(c =>
          c.toLowerCase().includes(a.triggerIngredient.toLowerCase()) ||
          a.triggerIngredient.toLowerCase().includes(c.toLowerCase())
        );
      }
      return false;
    });

    if (adj && adj.pointsRestored > 0) {
      const newType: FlagDetail["type"] = adj.adjustedPenalty === 0 ? "SUCCESS" : "WARNING";
      return {
        type: newType,
        message: sanitizeReasoning(adj.reasoning),
        pointsDeducted: Math.abs(adj.adjustedPenalty),
        culprits: [adj.triggerIngredient, ...adj.neutralizerIngredients]
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

    let modelList: string[] = DEFAULT_MODELS;
    if (aiConfig?.aihybridModelPriority) {
      try {
        const parsed = JSON.parse(aiConfig.aihybridModelPriority);
        if (Array.isArray(parsed) && parsed.length > 0) modelList = parsed;
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
        // Kirim ringkasan aiContext (maks 300 kata per bahan agar tidak overload prompt)
        const aiCtxWords = aiCtx.split(/\s+/);
        const truncated = aiCtxWords.length > 300 ? aiCtxWords.slice(0, 300).join(' ') + '...' : aiCtx;
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
    const systemPrompt = `
${customPrompt || "Anda adalah seorang Konsultan Dermatologi Kosmetik kelas dunia dan Ahli Formulasi (Cosmetic Chemist)."}

=== ATURAN PERILAKU SISTEM (DIKUNCI — TIDAK BISA DIUBAH) ===

ATURAN 1 — SUMBER KEBENARAN:
Semua data parameter bahan berikut adalah FAKTA dari database terverifikasi. DILARANG mengarang parameter yang tidak ada.
${!useExternal ? "MODE DATABASE SAJA: Anda HANYA boleh menganalisis berdasarkan data di bawah ini. DILARANG menambahkan klaim dari sumber luar." : `MODE SUMBER DIPERLUAS: Anda boleh merujuk sumber terpercaya berikut untuk memperkuat analisis: ${referenceSources}`}

ATURAN 2 — BATASAN PENYESUAIAN PENALTI:
- Anda HANYA bisa MENGURANGI/MENETRALISIR penalti (maks 50 poin per item).
- Anda TIDAK BISA menambah skor melebihi batas atau memberikan bonus positif.
- adjustedPenalty HARUS ≤ 0 (negatif atau nol). Nol artinya penalti dinetralisir sepenuhnya.
- PENALTI MUTLAK yang TIDAK BOLEH disentuh: Bahan Toksik, Risiko Janin/Hamil, Alergi Mutlak, Tanpa Filter UV.
- Untuk bahan dengan aiContext KOSONG dan mode DATABASE SAJA: DILARANG menyesuaikan penalti bahan tersebut.

ATURAN 3 — PERTIMBANGAN URUTAN BAHAN:
Daftar bahan skincare disusun dari konsentrasi TERTINGGI ke TERENDAH (regulasi kosmetik internasional).
Bahan di posisi 1-5 = konsentrasi tinggi (>5%). Posisi 6-15 = sedang (1-5%). Posisi 16+ = rendah (<1%).
Gunakan informasi posisi ini untuk menilai apakah efek negatif bahan diminimalkan oleh konsentrasi rendah.

ATURAN 4 — BAHASA OUTPUT:
Gunakan bahasa Indonesia yang mudah dipahami orang awam. DILARANG menyebutkan angka skor atau persentase.

ATURAN 5 — FOKUS FORMULASI:
Pilih fokus utama dari HANYA 6 kategori ini:
${FOCUS_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n")}

ATURAN 6 — SARAN KONTEKSTUAL:
Tipe produk: ${productType} — ${productTypeContext[productType] || ""}
Berikan saran yang spesifik untuk tipe produk ini. Untuk HARSH pada FACEWASH: pertimbangkan bahwa waktu kontak singkat mengurangi risiko. Untuk KOMEDOGENIK: pertimbangkan posisi urutan bahan sebagai indikator konsentrasi.

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
      "reasoning": "Penjelasan bahasa awam untuk catatan lab pengguna",
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
  "aiUnknownAnalysis": "analisis bahan asing atau 'Semua bahan terverifikasi'"
}
`;

    // ========================
    // 7. CALL AI (CASCADE PER-MODEL)
    // ========================
    let aiResult: AiHybridResult | null = null;
    let usedModel = "";

    for (const modelName of modelList) {
      try {
        console.log(`[AI-Hybrid] 🤖 Mencoba model: ${modelName}...`);
        const model = genAI.getGenerativeModel({ model: modelName });

        // Per-model timeout: 15 detik
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const result = await model.generateContent(systemPrompt);
        clearTimeout(timeoutId);

        const responseText = await result.response.text();
        const cleaned = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
        aiResult = JSON.parse(cleaned);
        usedModel = modelName;

        console.log(`[AI-Hybrid] ✅ Berhasil dengan model: ${modelName}`);
        break;
      } catch (err: any) {
        console.warn(`[AI-Hybrid] ⚠️ Model ${modelName} gagal: ${err.message}`);
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

      // Ganti flag yang ter-netralisir
      finalMatchFlags = replaceNeutralizedFlags(finalMatchFlags, validatedAdjustments, "MATCH");
      finalSafetyFlags = replaceNeutralizedFlags(finalSafetyFlags, validatedAdjustments, "SAFETY");

      // Rebuild match/safety labels
      const getMatchLabel = (s: number) => s === 100 ? "Sempurna" : s >= 90 ? "Sangat Cocok" : s >= 75 ? "Cocok" : s >= 50 ? "Kurang Optimal" : "Tidak Cocok";
      const getSafetyLabel = (s: number) => s === 100 ? "Sangat Aman" : s >= 80 ? "Aman" : s >= 60 ? "Butuh Adaptasi / Hati-hati" : s >= 40 ? "Berisiko / Tidak Disarankan" : "Hindari Mutlak";

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
