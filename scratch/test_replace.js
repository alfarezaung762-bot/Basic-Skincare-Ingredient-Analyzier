Q// scratch/test_replace.js
const IMMUTABLE_PENALTY_KEYWORDS = [
  "terlarang/toksik", "toksik",
  "ibu hamil/menyusui", "Risiko Janin",
  "Alergi Mutlak", "alergi",
  "Tanpa Filter UV"
];

function cleanString(str) {
  if (!str) return "";
  return str
    .replace(/[\u200b\u200c\u200d\ufeff]/g, "") // remove zero-width spaces
    .replace(/\u00a0/g, " ")                  // normalize non-breaking spaces
    .replace(/\s+/g, " ")                     // normalize spaces
    .trim()
    .toLowerCase();
}

function sanitizeReasoning(text) {
  return text
    .replace(/\b\d{1,3}\s*%/g, '')
    .replace(/\bskor\b/gi, '')
    .replace(/\bscore\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function validateAdjustments(adjustments, engineResult, detectedNamesLower) {
  const seen = new Set();
  const INVALID_NEUTRALIZERS = ['aqua', 'water', 'air', 'polyacrylamide', 'carbomer', 'xanthan gum', 'phenoxyethanol', 'glycerin', 'butylene glycol'];

  return adjustments.filter(adj => {
    const triggerClean = cleanString(adj.triggerIngredient);
    
    // 1. Cek triggerIngredient ADA di detectedIngredients
    if (!detectedNamesLower.some(n => cleanString(n).includes(triggerClean) || triggerClean.includes(cleanString(n)))) {
      console.warn(`[AI-Hybrid] ❌ BUANG: triggerIngredient "${adj.triggerIngredient}" tidak ada di formulasi`);
      return false;
    }

    // 2. Filter neutralizerIngredients
    adj.neutralizerIngredients = adj.neutralizerIngredients || [];
    adj.neutralizerIngredients = adj.neutralizerIngredients.filter(n =>
      !INVALID_NEUTRALIZERS.includes(cleanString(n))
    );

    // 3. Cek neutralizerIngredients ADA di formulasi
    for (const neutralizer of adj.neutralizerIngredients) {
      const nClean = cleanString(neutralizer);
      if (!detectedNamesLower.some(n => cleanString(n).includes(nClean) || nClean.includes(cleanString(n)))) {
        adj.neutralizerIngredients = adj.neutralizerIngredients.filter(n => n !== neutralizer);
      }
    }

    // 4. Harus ada neutralizer valid
    if (adj.neutralizerIngredients.length === 0) {
      console.warn(`[AI-Hybrid] ❌ BUANG: Tidak ada neutralizer valid untuk "${adj.triggerIngredient}"`);
      return false;
    }

    // 5. PENCOCOKAN DENGAN GROUND TRUTH PENALTY FLAG (BUG FIX)
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
      console.warn(`[AI-Hybrid] ❌ BUANG: trigger "${adj.triggerIngredient}" tidak memicu penalti klinis aktif di engine`);
      return false;
    }

    // Koreksi originalPenalty agar sesuai dengan ground truth flag
    adj.originalPenalty = -matchingFlag.pointsDeducted;

    // Clamp adjustedPenalty
    if (adj.adjustedPenalty > 0) adj.adjustedPenalty = 0;
    if (Math.abs(adj.adjustedPenalty) > matchingFlag.pointsDeducted) {
      adj.adjustedPenalty = -matchingFlag.pointsDeducted;
    }

    // Recalculate pointsRestored
    adj.pointsRestored = matchingFlag.pointsDeducted - Math.abs(adj.adjustedPenalty);

    // 6. Tidak duplikat
    const key = `${triggerClean}_${adj.targetScore}`;
    if (seen.has(key)) return false;
    seen.add(key);

    return true;
  });
}

function replaceNeutralizedFlags(originalFlags, adjustments, targetScore) {
  return originalFlags.map(flag => {
    const isImmutable = IMMUTABLE_PENALTY_KEYWORDS.some(kw =>
      flag.message.toLowerCase().includes(kw.toLowerCase())
    );
    if (isImmutable) return flag;

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
      const newType = adj.adjustedPenalty === 0 ? "SUCCESS" : "WARNING";
      const colonIndex = flag.message.indexOf(':');
      const originalPrefix = colonIndex > 0 ? flag.message.substring(0, colonIndex + 1) : '';
      const newCulprits = Array.from(new Set([
        ...(flag.culprits || []),
        ...adj.neutralizerIngredients
      ]));

      return {
        type: newType,
        message: `${originalPrefix} ${sanitizeReasoning(adj.reasoning)}`.trim(),
        pointsDeducted: Math.abs(adj.adjustedPenalty),
        culprits: newCulprits
      };
    }

    return flag;
  });
}

// TEST CASES
const engineResult = {
  matchFlags: [
    {
      type: "CRITICAL",
      message: "Tekstur Cream / Terlalu Pekat: Kandungan oklusif (minyak pengunci) ini biasanya dihindari saat kulit sedang berjerawat aktif.",
      pointsDeducted: 25,
      culprits: ["dimethicone/vinyl dimethicone crosspolymer (dimethicone/​vinyl dimethicone crosspolymer)"]
    }
  ],
  safetyFlags: []
};

const detectedNamesLower = [
  "aqua",
  "niacinamide",
  "dimethicone",
  "dimethicone/vinyl dimethicone crosspolymer (dimethicone/​vinyl dimethicone crosspolymer)",
  "c13-14 isoparaffin"
];

const adjustmentsInput = [
  {
    targetScore: "MATCH",
    originalPenalty: -15,
    adjustedPenalty: 0,
    triggerIngredient: "C13-14 Isoparaffin",
    neutralizerIngredients: ["Dimethicone"],
    reasoning: "C13-14 Isoparaffin aman."
  },
  {
    targetScore: "MATCH",
    originalPenalty: -25,
    adjustedPenalty: 0,
    triggerIngredient: "Dimethicone/Vinyl Dimethicone Crosspolymer",
    neutralizerIngredients: ["Niacinamide"],
    reasoning: "Dimethicone/Vinyl Dimethicone Crosspolymer terbilas bersih."
  }
];

const validated = validateAdjustments(adjustmentsInput, engineResult, detectedNamesLower);
console.log("VALIDATED:", JSON.stringify(validated, null, 2));

const finalFlags = replaceNeutralizedFlags(engineResult.matchFlags, validated, "MATCH");
console.log("FINAL FLAGS:", JSON.stringify(finalFlags, null, 2));

