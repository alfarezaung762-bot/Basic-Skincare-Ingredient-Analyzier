import { splitAliases } from "@/lib/splitAliases";
import { ekstrakDaftarBahan } from "@/lib/pemisahBahan";
import { MasterRuleset } from "@/lib/clinicalRules"; // Pastikan index.ts ini sudah ada

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
  isKeyActive: boolean;
  strengthLevel: number;
  blacklistedSkinTypes: string | null;
  blacklistReason: string | null;
};

export type FlagDetail = {
  type: "CRITICAL" | "WARNING" | "SUCCESS" | "INFO";
  message: string;
  pointsDeducted: number;
};

export type EngineResult = {
  matchScore: number;
  matchLabel: string;
  matchFlags: FlagDetail[];
  safetyScore: number;
  safetyLabel: string;
  safetyFlags: FlagDetail[];
  detectedIngredients: IngredientDb[];
  unknownIngredients: string[];
  primaryProductFocus?: string | null;
  secondaryProductFocuses?: string[];
};

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

export function runScoringEngine(
  profile: UserProfile,
  product: ProductInput,
  dictionary: IngredientDb[]
): EngineResult {
  
  // A. IDENTIFIKASI BAHAN
  const inputList = ekstrakDaftarBahan(product.ingredientsRaw);
  const detected: IngredientDb[] = [];
  const unknown: string[] = [];

  inputList.forEach(inputItem => {
    const matched = dictionary.find(dbItem => {
      if (isFuzzyMatch(inputItem, dbItem.name)) return true;
      if (dbItem.aliases) {
        const aliasList = splitAliases(dbItem.aliases);
        return aliasList.some(alias => isFuzzyMatch(inputItem, alias));
      }
      return false;
    });

    if (matched && !detected.some(d => d.name === matched.name)) {
      detected.push(matched);
    } else if (!matched && !unknown.includes(inputItem)) {
      unknown.push(inputItem);
    }
  });

  // B. SETUP VARIABEL PROFIL & RUMUS FISIKA (BILAS VS MENEMPEL)
  let matchScore = 100;
  let safetyScore = 100;
  let matchFlags: FlagDetail[] = [];
  let safetyFlags: FlagDetail[] = [];

  const baseSkinTypes = ["normal", "kering", "berminyak", "kombinasi"];
  const userBaseSkinType = baseSkinTypes.find(type => profile.skinType.toLowerCase().includes(type)) || "normal";
  const isSensitive = profile.skinType.toLowerCase().includes("sensitif");
  const userAllergies = profile.allergies ? profile.allergies.toLowerCase().split(',').map(a => a.trim()) : [];

  const isWashOff = product.productType === "FACEWASH";
  const harshMultiplier = isWashOff ? 0.5 : 1; 
  const comedoMultiplier = isWashOff ? 0.1 : 1; 

  const ruleKey = `${userBaseSkinType.toUpperCase()}_${isSensitive ? "TRUE" : "FALSE"}_${profile.severity.toUpperCase()}`;
  const productRules = MasterRuleset[product.productType];
  const activeRule = productRules ? productRules[ruleKey] : null;

  // C. HITUNG BEBAN PRODUK & CULPRIT TRACKING
  let rawHarshLoad = 0;
  let rawBufferLoad = 0;
  let rawComedoLoad = 0;
  let maxSingleComedoFound = 0;
  
  let countSurfactant = 0; let countUvFilter = 0; 
  let countMoistLight = 0; let countMoistMedium = 0; let countMoistHeavy = 0;
  
  const harshCulprits: string[] = [];
  const comedoCulprits: string[] = [];
  const heavyMoistCulprits: string[] = [];
  const uvCulprits: string[] = [];
  
  const focusTally: Record<string, number> = {};

  detected.forEach(ing => {
    // Toxic / Hamil / Alergi
    if (ing.type === "TOXIC") {
      safetyScore = 0;
      safetyFlags.push({ type: "CRITICAL", message: `Berbahaya: Mengandung ${ing.name} yang dilarang keras penggunaannya!`, pointsDeducted: 100 });
    }
    if (profile.isPregnantOrNursing && !ing.safeForPregnancy) {
      safetyScore -= 100;
      safetyFlags.push({ type: "CRITICAL", message: `Risiko Janin: ${ing.name} tidak direkomendasikan untuk ibu hamil/menyusui.`, pointsDeducted: 100 });
    }
    if (userAllergies.some(allergy => isFuzzyMatch(allergy, ing.name) || (ing.aliases && ing.aliases.toLowerCase().includes(allergy)))) {
      safetyScore -= 100;
      safetyFlags.push({ type: "CRITICAL", message: `Alergi Mutlak: Mengandung ${ing.name} yang memicu alergi Anda.`, pointsDeducted: 100 });
    }

    // Blacklist Klinis Mutlak
    if (ing.blacklistedSkinTypes && ing.blacklistedSkinTypes.toLowerCase().includes(userBaseSkinType)) {
      matchScore -= 50;
      matchFlags.push({ type: "CRITICAL", message: `DILARANG KERAS: ${ing.blacklistReason || `Bahan ${ing.name} sangat merusak kulit ${userBaseSkinType}.`}`, pointsDeducted: 50 });
    }

    // Kalkulasi Beban (Burden)
    if (ing.type === "HARSH") {
      rawHarshLoad += (ing.strengthLevel === 3 ? 6 : ing.strengthLevel === 2 ? 3 : 1);
      harshCulprits.push(ing.name);
    }
    if (ing.type === "BUFFER") {
      rawBufferLoad += (ing.strengthLevel === 3 ? 6 : ing.strengthLevel === 2 ? 3 : 1);
    }
    if (ing.comedogenicRating > 0) {
      rawComedoLoad += ing.comedogenicRating;
      if (ing.comedogenicRating > maxSingleComedoFound) maxSingleComedoFound = ing.comedogenicRating;
      if (ing.comedogenicRating >= 3) comedoCulprits.push(ing.name);
    }

    // Kalkulasi Fungsi
    if (ing.functionalCategory === "SURFAKTAN") countSurfactant++;
    if (ing.functionalCategory === "UV_FILTER") { countUvFilter++; uvCulprits.push(ing.name); }
    if (ing.functionalCategory === "PELEMBAP_HUMEKTAN") countMoistLight++;
    if (ing.functionalCategory === "PELEMBAP_EMOLIEN") countMoistMedium++;
    if (ing.functionalCategory === "PELEMBAP_OKLUSIF") { countMoistHeavy++; heavyMoistCulprits.push(ing.name); }

    if (ing.targetFocus) {
      ing.targetFocus.split(',').forEach(f => {
        const cleanFocus = f.trim();
        focusTally[cleanFocus] = (focusTally[cleanFocus] || 0) + (ing.isKeyActive ? 3 : 1);
      });
    }
  });

  // Terapkan Multiplier Realitas Fisika
  const loadHarsh = Math.round(rawHarshLoad * harshMultiplier);
  const loadComedoMulti = Math.round(rawComedoLoad * comedoMultiplier);

  // D. RULESET VALIDATION (THE JUDGE)
  if (activeRule) {
    // 1. Validasi Keamanan (Harsh & Buffer)
    if (activeRule.harsh.status === "DILARANG" && loadHarsh > 0) {
      safetyScore -= 40;
      safetyFlags.push({ type: "CRITICAL", message: `Dilarang Keras: Sifat eksfoliasi sangat berbahaya untuk kondisi kulit Anda saat ini. Pemicu: ${harshCulprits.join(', ')}.`, pointsDeducted: 40 });
    } else if (activeRule.harsh.status !== "DILARANG" && loadHarsh > activeRule.harsh.maxLoad) {
      const excess = loadHarsh - activeRule.harsh.maxLoad;
      const penalty = Math.min(40, excess * 10);
      safetyScore -= penalty;
      safetyFlags.push({ type: "WARNING", message: `Terlalu Keras/Asam: Beban eksfoliasi melebihi toleransi kulit Anda. Pemicu: ${harshCulprits.join(', ')}.`, pointsDeducted: penalty });
    } else if (activeRule.harsh.status !== "DILARANG" && rawHarshLoad > 0 && loadHarsh <= activeRule.harsh.maxLoad) {
      // APRESIASI EKSFOLIASI LEMBUT (Contoh: Lactic Acid yg aman)
      safetyFlags.push({ type: "SUCCESS", message: `Eksfoliasi Terukur: Mengandung bahan aktif (${harshCulprits.join(', ')}) dengan persentase/beban yang masih sangat aman dan bermanfaat untuk kulit Anda.`, pointsDeducted: 0 });
    }

    if (activeRule.buffer.status === "WAJIB" && rawBufferLoad < activeRule.buffer.minLoad) {
      const defisit = activeRule.buffer.minLoad - rawBufferLoad;
      const penalty = Math.min(20, defisit * 5);
      safetyScore -= penalty;
      safetyFlags.push({ type: "WARNING", message: `Kurang Penenang: Formulasi ini minim bahan penenang/pelindung untuk mencegah iritasi.`, pointsDeducted: penalty });
    } else if (isSensitive && rawBufferLoad >= 6) {
      safetyScore += 10;
      safetyFlags.push({ type: "SUCCESS", message: `Perlindungan Ekstra: Memiliki lapisan penenang yang sangat kuat untuk meredam kemerahan kulit sensitif Anda.`, pointsDeducted: 0 });
    }

    if (product.productType === "SUNSCREEN") {
      if (countUvFilter === 0) {
        safetyScore = 0;
        safetyFlags.push({ type: "CRITICAL", message: `Tabir Surya Palsu: Tidak ditemukan sama sekali agen UV Filter pada komposisinya! Sangat berbahaya.`, pointsDeducted: 100 });
      } else if (countUvFilter < activeRule.uvFilter.minCount) {
        safetyScore -= 20;
        safetyFlags.push({ type: "WARNING", message: `Proteksi Lemah: Jumlah spektrum perlindungan UV di bawah standar klinis untuk tipe kulit Anda. Pemicu: ${uvCulprits.join(', ')}.`, pointsDeducted: 20 });
      }
    }

    // 2. Validasi Tekstur (Komedo & Pelembap)
    if (maxSingleComedoFound > activeRule.maxSingleComedo) {
      matchScore -= 20;
      matchFlags.push({ type: "CRITICAL", message: `Sumbatan Tinggi: Ditemukan bahan oklusif berat (${comedoCulprits.join(', ')}) yang berisiko memperparah komedo/jerawat Anda.`, pointsDeducted: 20 });
    } else if (loadComedoMulti > activeRule.maxMultiComedoLoad) {
      const excess = loadComedoMulti - activeRule.maxMultiComedoLoad;
      const penalty = Math.min(30, excess * 7);
      matchScore -= penalty;
      matchFlags.push({ type: "WARNING", message: `Akumulasi Komedogenik: Banyak bahan ringan yang ditumpuk sehingga totalnya melebihi batas aman pori-pori Anda. Pemicu: ${comedoCulprits.join(', ')}.`, pointsDeducted: penalty });
    }

    if (activeRule.surfactant.status === "WAJIB" && countSurfactant < activeRule.surfactant.minCount) {
      matchScore -= 30;
      matchFlags.push({ type: "CRITICAL", message: `Kinerja Inkomplit: Tidak ditemukan agen pembersih/busa (Surfaktan) yang memadai.`, pointsDeducted: 30 });
    }

    if (activeRule.moistHeavy.status === "DILARANG" && countMoistHeavy > 0) {
      matchScore -= 25;
      matchFlags.push({ type: "CRITICAL", message: `Tekstur Terlalu Berat: Pelembap minyak/oklusif dilarang untuk tingkat jerawat Anda. Pemicu: ${heavyMoistCulprits.join(', ')}.`, pointsDeducted: 25 });
    }

  } else {
    matchFlags.push({ type: "INFO", message: "Menggunakan parameter evaluasi standar. Aturan klinis spesifik belum dipetakan.", pointsDeducted: 0 });
  }

  // E. EVALUASI FOKUS (EXPECTATION MATCHING)
  const userFocusList = profile.primaryFocus.split(',').map(f => f.trim());
  const sortedFocuses = Object.entries(focusTally).sort((a, b) => b[1] - a[1]);
  const primaryProductFocus = sortedFocuses.length > 0 ? sortedFocuses[0][0] : null;
  const secondaryProductFocuses = sortedFocuses.slice(1).map(f => f[0]);

  if (primaryProductFocus) {
    if (userFocusList.includes(primaryProductFocus)) {
      matchScore += 10;
      matchFlags.push({ type: "SUCCESS", message: `Target Sempurna: Fokus utama produk ini selaras dengan tujuan perawatan Anda (${primaryProductFocus}).`, pointsDeducted: 0 });
    } else if (userFocusList.some(f => secondaryProductFocuses.includes(f))) {
      matchScore -= 10;
      matchFlags.push({ type: "WARNING", message: `Kecocokan Sebagian: Fokus kulit Anda hanya menjadi manfaat pelengkap di produk ini, bukan prioritas utama.`, pointsDeducted: 10 });
    } else {
      matchScore -= 20;
      matchFlags.push({ type: "CRITICAL", message: `Meleset: Formulasi produk ini didesain untuk (${primaryProductFocus}), yang tidak sejalan dengan tujuan Anda.`, pointsDeducted: 20 });
    }
  }

  if (userBaseSkinType === "kering" && (countMoistLight > 0 || countMoistMedium > 0)) {
    matchScore += 10;
  } else if (userBaseSkinType === "kombinasi" && countMoistLight > 0) {
    matchScore += 5;
  }

  // F. KUNCI SKOR
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
    primaryProductFocus, 
    secondaryProductFocuses, 
  };
}