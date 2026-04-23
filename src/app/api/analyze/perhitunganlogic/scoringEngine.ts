// src/app/api/analyze/perhitunganlogic/scoringEngine.ts

// 1. DEFINISI TIPE DATA
export type UserProfile = {
  skinType: string;
  age: number;
  isPregnantOrNursing: boolean;
  severity: "BIASA" | "SEDANG" | "PARAH";
  primaryFocus: string; 
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
  type: string; 
  functionalCategory: string; 
  benefits: string;
  comedogenicRating: number;
  safeForPregnancy: boolean;
  safeForSensitive: boolean;
  goodForSkinTypes: string | null;
  targetFocus: string | null;
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
};

// 2. FUNGSI PEMBERSIH TEKS
function sanitizeIngredients(rawText: string): string[] {
  const cleanedText = rawText.replace(/[0-9]+%?/g, '').replace(/[\(\)\[\]\{\}\*]/g, '');
  return cleanedText.split(',').map(item => item.trim().toLowerCase()).filter(item => item.length > 0);
}

// ==============================================================
// FITUR BARU TAHAP 2: FUZZY MATCHING (PENCARIAN KEMIRIPAN & TYPO)
// ==============================================================

// Algoritma Levenshtein: Menghitung berapa banyak huruf yang salah ketik/berbeda
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

// Logika Pemfilteran Fleksibel
function isFuzzyMatch(input: string, target: string): boolean {
  // 1. Jika sama persis
  if (input === target) return true;
  
  // 2. Jika input adalah potongan kata dari target (misal: "niaci" ada di dalam "niacinamide")
  // Syarat: Minimal 5 huruf agar tidak terlalu sensitif (misal "air" masuk ke mana-mana)
  if (input.length >= 5 && target.includes(input)) return true;
  
  // 3. Toleransi Typo/Salah Ketik maksimal 2 huruf untuk kata yang cukup panjang
  if (input.length >= 4 && target.length >= 4 && levenshtein(input, target) <= 2) return true;
  
  return false;
}
// ==============================================================

// 3. FUNGSI PELABELAN THRESHOLD
function getMatchLabel(score: number): string {
  if (score >= 95) return "Sangat Cocok";
  if (score >= 75) return "Cocok";
  if (score >= 40) return "Kurang Cocok";
  return "Tidak Cocok";
}

function getSafetyLabel(score: number): string {
  if (score >= 90) return "Sangat Aman";
  if (score >= 70) return "Aman / Adaptasi";
  if (score >= 40) return "Hati-hati";
  return "Hindari Mutlak";
}

// 4. MESIN UTAMA MATEMATIKA
export function runScoringEngine(
  profile: UserProfile,
  product: ProductInput,
  dictionary: IngredientDb[]
): EngineResult {
  
  // A. IDENTIFIKASI BAHAN (DIPERBARUI DENGAN FUZZY MATCH)
  const inputList = sanitizeIngredients(product.ingredientsRaw);
  const detected: IngredientDb[] = [];
  const unknown: string[] = [];

  inputList.forEach(inputItem => {
    const matched = dictionary.find(dbItem => {
      // Cek kecocokan nama INCI menggunakan Fuzzy Match
      if (isFuzzyMatch(inputItem, dbItem.name)) return true;
      
      // Cek kecocokan sinonim/alias menggunakan Fuzzy Match
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

  // B. PERHITUNGAN SKOR
  let matchScore = 100;
  let safetyScore = 100;
  let matchFlags: string[] = [];
  let safetyFlags: string[] = [];

  const isSensitive = profile.skinType.toLowerCase().includes("sensitif");
  const baseSkinTypes = ["normal", "kering", "berminyak", "kombinasi"];
  const userBaseSkinType = baseSkinTypes.find(type => profile.skinType.toLowerCase().includes(type)) || "";
  const userAllergies = profile.allergies ? profile.allergies.toLowerCase().split(',').map(a => a.trim()) : [];

  let hasHarsh = false;
  let hasBuffer = false;
  let hasSurfaktan = false;
  let hasUvFilter = false;
  let hasPelembap = false;

  // C. LOOP EVALUASI BAHAN
  detected.forEach(ing => {
    if (ing.type === "HARSH") hasHarsh = true;
    if (ing.type === "BUFFER") hasBuffer = true;
    if (ing.functionalCategory === "SURFAKTAN") hasSurfaktan = true;
    if (ing.functionalCategory === "UV_FILTER") hasUvFilter = true;
    if (ing.functionalCategory === "PELEMBAP") hasPelembap = true;

    // Keamanan
    if (ing.type === "TOXIC") {
      safetyScore = 0;
      safetyFlags.push(`Bahan BERBAHAYA terdeteksi: ${ing.name} tidak boleh digunakan.`);
    }
    
    // Cek Alergi menggunakan Fuzzy Match (TYPO DIPERBAIKI DI SINI)
    const isAllergicToName = userAllergies.some(allergy => isFuzzyMatch(allergy, ing.name));
    const isAllergicToAlias = ing.aliases ? userAllergies.some(allergy => ing.aliases!.toLowerCase().includes(allergy)) : false;
    
    if (isAllergicToName || isAllergicToAlias) {
      safetyScore = 0;
      safetyFlags.push(`Memicu alergi pengguna secara mutlak: ${ing.name}.`);
    }

    if (profile.isPregnantOrNursing && !ing.safeForPregnancy) {
      safetyScore -= 100;
      safetyFlags.push(`Tidak aman untuk ibu hamil atau menyusui: ${ing.name}.`);
    }

    if (isSensitive && !ing.safeForSensitive) {
      if (ing.type === "HARSH") {
        safetyScore -= 30;
        safetyFlags.push(`Sangat keras untuk kulit sensitif: ${ing.name} (Bahan aktif kuat).`);
      } else {
        safetyScore -= 40;
        safetyFlags.push(`Sangat berisiko memicu kemerahan/iritasi pada kulit sensitif: ${ing.name}.`);
      }
    }

    // Kecocokan
    if (profile.severity === "PARAH" && ing.comedogenicRating >= 3) {
      matchScore -= 15;
      matchFlags.push(`Menyumbat pori untuk jerawat parah: ${ing.name} (Skala ${ing.comedogenicRating}).`);
    }
    if (profile.severity === "SEDANG" && ing.comedogenicRating >= 4) {
      matchScore -= 10;
      matchFlags.push(`Sangat menyumbat pori untuk jerawat sedang: ${ing.name} (Skala ${ing.comedogenicRating}).`);
    }

    if (userBaseSkinType && ing.goodForSkinTypes && !ing.goodForSkinTypes.toLowerCase().includes(userBaseSkinType)) {
      matchScore -= 10;
      matchFlags.push(`Kurang ideal untuk tipe kulit ${userBaseSkinType}: ${ing.name}.`);
    }

    if ((userBaseSkinType === "berminyak" || userBaseSkinType === "kombinasi") && 
        (product.productType === "MOISTURIZER" || product.productType === "SUNSCREEN") && 
        ing.comedogenicRating >= 3) {
      matchScore -= 50;
      matchFlags.push(`Sangat berisiko menyumbat pori (produk tidak dibilas): ${ing.name} (Skala ${ing.comedogenicRating}).`);
    }

    if (ing.type === "HERO" && ing.targetFocus === profile.primaryFocus) {
      matchScore += 10;
      matchFlags.push(`Bahan bintang sesuai fokus Anda: ${ing.name} (${profile.primaryFocus}).`);
    }
  });

  // D. EVALUASI PRODUK KESELURUHAN
  if (hasHarsh && !hasBuffer) {
    safetyScore -= 15;
    safetyFlags.push("Formulasi produk terlalu keras (bahan aktif tinggi tanpa penenang).");
  }

  if (product.productType === "FACEWASH" && !hasSurfaktan) {
    matchScore -= 50;
    matchFlags.push("Bukan sabun cuci muka standar (agen pembersih/surfaktan tidak terdeteksi).");
  }
  if (product.productType === "SUNSCREEN" && !hasUvFilter) {
    matchScore -= 50;
    matchFlags.push("Bukan tabir surya asli (filter pelindung matahari tidak terdeteksi).");
  }
  if (product.productType === "MOISTURIZER" && !hasPelembap) {
    matchScore -= 50;
    matchFlags.push("Bukan pelembap standar (agen penghidrasi tidak terdeteksi).");
  }

  // E. PENGUNCIAN SKOR
  matchScore = Math.max(0, Math.min(100, matchScore));
  safetyScore = Math.max(0, Math.min(100, safetyScore));

  return {
    matchScore,
    matchLabel: getMatchLabel(matchScore),
    matchFlags,
    safetyScore,
    safetyLabel: getSafetyLabel(safetyScore),
    safetyFlags,
    detectedIngredients: detected,
    unknownIngredients: unknown,
  };
}