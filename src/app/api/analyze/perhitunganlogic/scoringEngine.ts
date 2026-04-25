// src/app/api/analyze/perhitunganlogic/scoringEngine.ts

// ==============================================================
// 1. DEFINISI TIPE DATA (UPDATE V3)
// ==============================================================
export type UserProfile = {
  skinType: string;
  age: number;
  isPregnantOrNursing: boolean;
  severity: "BIASA" | "SEDANG" | "PARAH";
  primaryFocus: string; // Sekarang bisa berisi banyak fokus dipisah koma
  allergies: string;
};

export type ProductInput = {
  productName: string;
  productType: "FACEWASH" | "MOISTURIZER" | "SUNSCREEN";
  ingredientsRaw: string;
};

export type IngredientDb = {
  name: string;
  aliases: string | null;
  type: string; // BASIC, BUFFER, HARSH, TOXIC
  functionalCategory: string; // SURFAKTAN, UV_FILTER, PELEMBAP_HUMEKTAN, dll
  benefits: string;
  comedogenicRating: number;
  safeForPregnancy: boolean;
  safeForSensitive: boolean;
  goodForSkinTypes: string | null;
  targetFocus: string | null;
  
  // ARSITEKTUR V3 BARU
  isKeyActive: boolean;
  strengthLevel: number;
  blacklistedSkinTypes: string | null;
  blacklistReason: string | null;
};

export type EngineResult = {
  matchScore: number;
  matchLabel: string;
  matchFlags: string[];
  safetyScore: number;
  safetyLabel: string;
  safetyFlags: string[];
  detectedIngredients: IngredientDb[];
  unknownIngredients: string[];
  
  // TAMBAHAN BARU UNTUK UI TAHAP 4:
  primaryProductFocus?: string | null;
  secondaryProductFocuses?: string[];
};

// ==============================================================
// 2. FUNGSI PEMBERSIH & FUZZY MATCH (TETAP SAMA)
// ==============================================================
function sanitizeIngredients(rawText: string): string[] {
  const cleanedText = rawText.replace(/[0-9]+%?/g, '').replace(/[\(\)\[\]\{\}\*]/g, '');
  return cleanedText.split(',').map(item => item.trim().toLowerCase()).filter(item => item.length > 0);
}

function levenshtein(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

function isFuzzyMatch(input: string, target: string): boolean {
  if (input === target) return true;
  if (input.length >= 5 && target.includes(input)) return true;
  if (input.length >= 4 && target.length >= 4 && levenshtein(input, target) <= 2) return true;
  return false;
}

// ==============================================================
// 3. FUNGSI PELABELAN THRESHOLD
// ==============================================================
function getMatchLabel(score: number): string {
  if (score >= 90) return "Sangat Cocok";
  if (score >= 70) return "Cocok";
  if (score >= 40) return "Kurang Cocok";
  return "Tidak Cocok";
}

function getSafetyLabel(score: number): string {
  if (score >= 90) return "Sangat Aman";
  if (score >= 70) return "Aman / Adaptasi";
  if (score >= 40) return "Hati-hati";
  return "Hindari Mutlak";
}

// ==============================================================
// 4. MESIN UTAMA MATEMATIKA V3
// ==============================================================
export function runScoringEngine(
  profile: UserProfile,
  product: ProductInput,
  dictionary: IngredientDb[]
): EngineResult {
  
  // A. IDENTIFIKASI BAHAN
  const inputList = sanitizeIngredients(product.ingredientsRaw);
  const detected: IngredientDb[] = [];
  const unknown: string[] = [];

  inputList.forEach(inputItem => {
    const matched = dictionary.find(dbItem => {
      if (isFuzzyMatch(inputItem, dbItem.name)) return true;
      if (dbItem.aliases) {
        const aliasList = dbItem.aliases.split(',').map(a => a.trim().toLowerCase());
        return aliasList.some(alias => isFuzzyMatch(inputItem, alias));
      }
      return false;
    });

    if (matched) {
      if (!detected.some(d => d.name === matched.name)) detected.push(matched);
    } else {
      if (!unknown.includes(inputItem)) unknown.push(inputItem);
    }
  });

  // B. PERSIAPAN VARIABEL HITUNG
  let matchScore = 100;
  let safetyScore = 100;
  let matchFlags: string[] = [];
  let safetyFlags: string[] = [];

  // Variabel Tipe Kulit
  const isSensitive = profile.skinType.toLowerCase().includes("sensitif");
  const baseSkinTypes = ["normal", "kering", "berminyak", "kombinasi"];
  const userBaseSkinType = baseSkinTypes.find(type => profile.skinType.toLowerCase().includes(type)) || "normal";
  const userAllergies = profile.allergies ? profile.allergies.toLowerCase().split(',').map(a => a.trim()) : [];

  // Diskon Waktu Kontak (Wash-off vs Leave-on)
  const isWashOff = product.productType === "FACEWASH";
  const harshMultiplier = isWashOff ? 0.5 : 1; // Iritasi didiskon 50% jika cuci muka
  const comedoMultiplier = isWashOff ? 0 : 1;  // Penyumbatan diabaikan 100% jika cuci muka

  // Tracker Bahan
  let harshCount = 0;
  let bufferLevelMax = 0;
  let hasSurfaktan = false;
  let hasUvFilter = false;
  let hasPelembap = false;
  
  // Tally Papan Skor Fokus (Berapa banyak poin untuk setiap fokus?)
  const focusTally: Record<string, number> = {};

  // C. LOOP EVALUASI BAHAN (PER INGREDIENT)
  detected.forEach(ing => {
    
    // --- 1. TRACKER FUNGSI DASAR ---
    if (ing.functionalCategory === "SURFAKTAN") hasSurfaktan = true;
    if (ing.functionalCategory === "UV_FILTER") hasUvFilter = true;
    if (ing.functionalCategory.includes("PELEMBAP")) hasPelembap = true;
    if (ing.type === "HARSH") harshCount += 1;
    if (ing.type === "BUFFER" && ing.strengthLevel > bufferLevelMax) bufferLevelMax = ing.strengthLevel;

    // --- 2. TALLY POIN FOKUS (Bagian D Cetak Biru) ---
    if (ing.targetFocus) {
      const foci = ing.targetFocus.split(',');
      foci.forEach(f => {
        const cleanFocus = f.trim();
        const points = ing.isKeyActive ? 3 : 1;
        focusTally[cleanFocus] = (focusTally[cleanFocus] || 0) + points;
      });
    }

    // --- 3. LOGIKA TOXIC & KEHAMILAN ---
    if (ing.type === "TOXIC") {
      safetyScore = 0;
      safetyFlags.push(`Bahan BERBAHAYA terdeteksi: ${ing.name} tidak boleh digunakan.`);
    }
    if (profile.isPregnantOrNursing && !ing.safeForPregnancy) {
      safetyScore -= 100;
      safetyFlags.push(`Tidak aman untuk ibu hamil atau menyusui: ${ing.name}.`);
    }

    // --- 4. CEK ALERGI FUZZY ---
    const isAllergicToName = userAllergies.some(allergy => isFuzzyMatch(allergy, ing.name));
    const isAllergicToAlias = ing.aliases ? userAllergies.some(allergy => ing.aliases!.toLowerCase().includes(allergy)) : false;
    if (isAllergicToName || isAllergicToAlias) {
      safetyScore -= 100;
      safetyFlags.push(`Memicu alergi mutlak: ${ing.name}.`);
    }

    // --- 5. SISTEM BLACKLIST MUTLAK (Bagian C Cetak Biru) ---
    if (ing.blacklistedSkinTypes && ing.blacklistedSkinTypes.toLowerCase().includes(userBaseSkinType)) {
      matchScore -= 50; // Penalti Ekstrem -50%
      matchFlags.push(`🚫 DILARANG KERAS: ${ing.blacklistReason || `Bahan ${ing.name} sangat merusak untuk kulit ${userBaseSkinType}.`}`);
    }

    // --- 6. LOGIKA HARSH VS KEKUATAN & TIPE KULIT (Bagian A Cetak Biru) ---
    if (ing.type === "HARSH") {
      let penalty = 0;
      let reason = "";

      if (isSensitive) {
        if (ing.strengthLevel === 1) penalty = 10;
        else if (ing.strengthLevel === 2) penalty = 25;
        else if (ing.strengthLevel === 3) { penalty = 45; reason = "PERINGATAN KERAS: "; }
        safetyFlags.push(`${reason}Sangat keras untuk kulit sensitif: ${ing.name} (Level ${ing.strengthLevel}).`);
      } 
      else if (userBaseSkinType === "kering") {
        if (ing.strengthLevel === 1) penalty = 5;
        else if (ing.strengthLevel === 2) penalty = 15;
        else if (ing.strengthLevel === 3) penalty = 20;
        safetyFlags.push(`Dapat mengikis lipid kulit kering: ${ing.name} (Level ${ing.strengthLevel}).`);
      }
      else if (userBaseSkinType === "kombinasi") {
        if (ing.strengthLevel === 1) penalty = 2.5;
        else if (ing.strengthLevel === 2) penalty = 7.5;
        else if (ing.strengthLevel === 3) penalty = 10;
        safetyFlags.push(`Berisiko membuat U-Zone (pipi) kering: ${ing.name} (Level ${ing.strengthLevel}).`);
      }
      // Berminyak tidak kena penalti per individu (0%)

      // Terapkan diskon jika ini facewash
      safetyScore -= (penalty * harshMultiplier);
    }

    // --- 7. LOGIKA TEKSTUR & KOMEDOGENIK (Bagian B Cetak Biru) ---
    // Diabaikan otomatis jika ini Face Wash (karena comedoMultiplier = 0)
    const isHeavyOcclusive = ing.functionalCategory === "PELEMBAP_OKLUSIF";
    const isPoreClogging = ing.comedogenicRating >= 3;

    let matchPenalty = 0;
    if (profile.severity === "PARAH" && (isPoreClogging || isHeavyOcclusive)) {
      matchPenalty = 30;
      matchFlags.push(`Sangat berbahaya untuk jerawat parah: ${ing.name} (Komedogenik: ${ing.comedogenicRating} / Oklusif tebal).`);
    } else if (profile.severity === "SEDANG" && (ing.comedogenicRating >= 4 || isHeavyOcclusive)) {
      matchPenalty = 20;
      matchFlags.push(`Terlalu berat untuk jerawat sedang: ${ing.name} (Komedogenik: ${ing.comedogenicRating} / Oklusif tebal).`);
    }

    if (userBaseSkinType === "berminyak" && isPoreClogging) {
      matchPenalty += 40;
      matchFlags.push(`Menyumbat pori kulit berminyak: ${ing.name} (Komedogenik: ${ing.comedogenicRating}).`);
    } else if (userBaseSkinType === "kombinasi" && isPoreClogging) {
      matchPenalty += 20; // Jalan tengah
      matchFlags.push(`Berisiko menyumbat T-Zone kulit kombinasi: ${ing.name} (Komedogenik: ${ing.comedogenicRating}).`);
    }

    matchScore -= (matchPenalty * comedoMultiplier);
  }); // END OF LOOP

  // D. EVALUASI AKUMULASI (POST-LOOP)
  
  // 1. Akumulasi Penumpukan HARSH (Semua Tipe Kulit)
  if (harshCount >= 3) {
    const extraHarshPenalty = 15 + ((harshCount - 3) * 5); 
    safetyScore -= (extraHarshPenalty * harshMultiplier);
    safetyFlags.push(`Penumpukan Ekstrem: Terdapat ${harshCount} bahan asam/keras sekaligus. Sangat berisiko merusak Skin Barrier!`);
  }

  // 2. Bonus Penawar BUFFER untuk Kulit Sensitif
  if (isSensitive && bufferLevelMax >= 2) {
    safetyScore += 15;
    safetyFlags.push(`✅ Memiliki agen penenang kuat (Level ${bufferLevelMax}) untuk meredam iritasi. Namun, karena kulitmu sensitif, tetap lakukan Patch Test.`);
  }

  // 3. Bonus Hidrasi (Pelembap)
  if (userBaseSkinType === "kering" && hasPelembap) {
    matchScore += 10;
  } else if (userBaseSkinType === "kombinasi" && hasPelembap) {
    matchScore += 5;
  }

  // 4. Validasi Standar Produk
  if (product.productType === "FACEWASH" && !hasSurfaktan) {
    matchScore -= 50;
    matchFlags.push("Produk ini tidak memiliki agen pembersih/busa (Surfaktan). Bukan pencuci muka standar.");
  }
  if (product.productType === "SUNSCREEN" && !hasUvFilter) {
    matchScore -= 50;
    matchFlags.push("Sangat Berbahaya: Tidak ada filter UV yang terdeteksi pada tabir surya ini!");
  }
  if (product.productType === "MOISTURIZER" && !hasPelembap) {
    matchScore -= 30;
    matchFlags.push("Produk ini minim agen penghidrasi (Pelembap).");
  }

  // E. PENENTUAN FOKUS PRODUK (Bagian E Cetak Biru)
  // Ubah fokus user (string) menjadi array
  const userFocusList = profile.primaryFocus.split(',').map(f => f.trim());
  
  // Sortir papan skor fokus
  const sortedFocuses = Object.entries(focusTally).sort((a, b) => b[1] - a[1]);
  
  // Ambil Fokus Utama (Index 0) dan Sekunder
  const primaryProductFocus = sortedFocuses.length > 0 ? sortedFocuses[0][0] : null;
  const secondaryProductFocuses = sortedFocuses.slice(1).map(f => f[0]);

  // Evaluasi Pencocokan Ekspektasi (Jika produk punya fokus/bahan aktif)
  if (primaryProductFocus) {
    let focusStatus = "MISS"; // Default: Meleset
    
    // Cek apakah ada fokus user yang Sempurna (di Primary)
    if (userFocusList.includes(primaryProductFocus)) {
      focusStatus = "PERFECT";
    } 
    // Cek apakah ada fokus user yang Sebagian (di Secondary)
    else if (userFocusList.some(userFocus => secondaryProductFocuses.includes(userFocus))) {
      focusStatus = "PARTIAL";
    }

    if (focusStatus === "PERFECT") {
      matchScore += 10;
      matchFlags.push(`🎯 Target Sempurna: Target utama formulasi ini selaras dengan fokusmu (${primaryProductFocus}).`);
    } else if (focusStatus === "PARTIAL") {
      matchScore -= 10;
      matchFlags.push(`⚠️ Kecocokan Sebagian: Fokusmu ada di bahan pelengkap, bukan prioritas utama racikan ini.`);
    } else {
      matchScore -= 30;
      matchFlags.push(`❌ Meleset: Formulasi produk ini (${primaryProductFocus}) tidak sejalan dengan tujuan skincare-mu.`);
    }
  }

  // F. PENGUNCIAN SKOR (Jangan sampai minus atau lebih dari 100)
  matchScore = Math.max(0, Math.min(100, Math.round(matchScore)));
  safetyScore = Math.max(0, Math.min(100, Math.round(safetyScore)));

  return {
    matchScore,
    matchLabel: getMatchLabel(matchScore),
    matchFlags,
    safetyScore,
    safetyLabel: getSafetyLabel(safetyScore),
    safetyFlags,
    detectedIngredients: detected,
    unknownIngredients: unknown,
    
    // TAMBAHAN BARU UNTUK UI TAHAP 4:
    primaryProductFocus, 
    secondaryProductFocuses, 
  };
}