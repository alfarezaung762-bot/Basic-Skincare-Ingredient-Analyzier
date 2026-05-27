import { splitAliases } from "@/lib/splitAliases";
import { ekstrakDaftarBahan } from "@/lib/pemisahBahan";
import { MasterRuleset } from "@/lib/clinicalRules";

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
  blacklistPenalty: number | null;
};

export type FlagDetail = {
  type: "CRITICAL" | "WARNING" | "SUCCESS" | "INFO";
  message: string;
  pointsDeducted: number;
  culprits?: string[];
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

  // 1. Cek Levenshtein Distance (Toleransi Typo)
  // Syarat: Panjang kata harus mirip agar terhindar dari singkatan yang mencocokkan kata panjang
  if (input.length >= 4 && target.length >= 4) {
    const lengthDiff = Math.abs(input.length - target.length);
    if (lengthDiff <= 3 && levenshtein(input, target) <= 2) {
      return true;
    }
  }

  // 2. Cek Substring (Includes) dengan Word Boundary
  // Mencegah kata generik pendek (seperti 'water') meng-hijack bahan yang tidak relevan
  if (input.length >= 6) {
    // Escape karakter regex dari input
    const escapedInput = input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedInput}\\b`, 'i');
    if (regex.test(target)) return true;
  }

  return false;
}

function getMatchLabel(score: number): string {
  if (score === 100) return "Sempurna";
  if (score >= 90) return "Sangat Cocok";
  if (score >= 75) return "Cocok";
  if (score >= 50) return "Kurang Optimal";
  return "Tidak Cocok";
}

function getSafetyLabel(score: number): string {
  if (score === 100) return "Sangat Aman";
  if (score >= 80) return "Aman";
  if (score >= 60) return "Butuh Adaptasi / Hati-hati";
  if (score >= 40) return "Berisiko / Tidak Disarankan";
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
    const cleanInput = inputItem.trim().toLowerCase();

    // Generate variasi pencarian untuk menangani nama yang memiliki kurung
    // Misal: "Mentha Piperita (Peppermint) Oil" -> ["mentha piperita (peppermint) oil", "mentha piperita oil", "peppermint"]
    const searchTerms = [cleanInput];
    
    if (cleanInput.includes('(') && cleanInput.includes(')')) {
      const withoutParens = cleanInput.replace(/\([^)]+\)/g, '').replace(/\s+/g, ' ').trim();
      if (withoutParens && !searchTerms.includes(withoutParens)) searchTerms.push(withoutParens);

      const inParensMatch = cleanInput.match(/\(([^)]+)\)/);
      if (inParensMatch && inParensMatch[1]) {
        const insideParens = inParensMatch[1].trim();
        if (insideParens && !searchTerms.includes(insideParens)) searchTerms.push(insideParens);
      }
    }

    let matched: IngredientDb | undefined = undefined;

    // 1. Pencarian Tepat (Exact Match)
    for (const term of searchTerms) {
      matched = dictionary.find(dbItem => {
        if (term === dbItem.name.toLowerCase()) return true;
        if (dbItem.aliases) {
          const aliasList = splitAliases(dbItem.aliases).map(a => a.toLowerCase());
          return aliasList.includes(term);
        }
        return false;
      });
      if (matched) break;
    }

    // 2. Pencarian Samar (Fuzzy Match) jika exact match gagal
    if (!matched) {
      for (const term of searchTerms) {
        matched = dictionary.find(dbItem => {
          if (isFuzzyMatch(term, dbItem.name.toLowerCase())) return true;
          if (dbItem.aliases) {
            const aliasList = splitAliases(dbItem.aliases).map(a => a.toLowerCase());
            return aliasList.some(alias => isFuzzyMatch(term, alias));
          }
          return false;
        });
        if (matched) break;
      }
    }

    if (matched && !detected.some(d => d.name === matched!.name)) {
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
    // Toxic / Hamil / Alergi (Safety Score Penalties)
    if (ing.type === "TOXIC") {
      safetyScore = 0;
      safetyFlags.push({ type: "CRITICAL", message: `Berbahaya: Mengandung bahan terlarang/toksik!`, pointsDeducted: 100, culprits: [ing.name] });
    }
    if (profile.isPregnantOrNursing && !ing.safeForPregnancy) {
      safetyScore -= 100;
      safetyFlags.push({ type: "CRITICAL", message: `Risiko Janin: Tidak direkomendasikan untuk ibu hamil/menyusui.`, pointsDeducted: 100, culprits: [ing.name] });
    }
    if (userAllergies.some(allergy => isFuzzyMatch(allergy, ing.name) || (ing.aliases && ing.aliases.toLowerCase().includes(allergy)))) {
      safetyScore -= 100;
      safetyFlags.push({ type: "CRITICAL", message: `Alergi Mutlak: Memicu alergi Anda.`, pointsDeducted: 100, culprits: [ing.name] });
    }

    // Blacklist Klinis Mutlak (Safety Score Penalty)
    if (ing.blacklistedSkinTypes && ing.blacklistedSkinTypes.toLowerCase().includes(userBaseSkinType)) {
      const penalty = ing.blacklistPenalty ?? 50;
      safetyScore -= penalty;
      const sensitiveText = (isSensitive && !ing.safeForSensitive) ? ' dan sensitif' : '';
      const flagType = penalty <= 25 ? "WARNING" : "CRITICAL";
      safetyFlags.push({ type: flagType, message: `Batasan Penggunaan: Sangat disarankan menghindari bahan ini pada kulit ${userBaseSkinType}${sensitiveText}. (Catatan Lab: ${ing.blacklistReason || 'Berisiko untuk kulitmu'}).`, pointsDeducted: penalty, culprits: [ing.name] });
    }

    // Kalkulasi Beban (Burden) & Culprits Tracking
    if (ing.type === "HARSH") {
      rawHarshLoad += (ing.strengthLevel === 3 ? 6 : ing.strengthLevel === 2 ? 3 : 1);
      harshCulprits.push(ing.name);
    }
    if (ing.type === "BUFFER") {
      rawBufferLoad += (ing.strengthLevel === 3 ? 6 : ing.strengthLevel === 2 ? 3 : 1);
    }
    if (ing.comedogenicRating >= 3) {
      rawComedoLoad += ing.comedogenicRating;
      if (ing.comedogenicRating > maxSingleComedoFound) maxSingleComedoFound = ing.comedogenicRating;
      comedoCulprits.push(ing.name); // Tangkap semua bahan komedogenik agar muncul di lencana
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
      safetyFlags.push({ type: "CRITICAL", message: `Eksfoliasi Kuat: Produk ini mengandung bahan aktif yang cukup kuat. Hindari atau batasi penggunaan produk ini 2–3 hari sekali.`, pointsDeducted: 40, culprits: harshCulprits });
    } else if (activeRule.harsh.status !== "DILARANG" && loadHarsh > activeRule.harsh.maxLoad) {
      const excess = loadHarsh - activeRule.harsh.maxLoad;
      const penalty = Math.min(40, excess * 5);
      safetyScore -= penalty;
      safetyFlags.push({ type: "WARNING", message: `Potensi Iritasi: Tumpukan bahan aktifnya cukup tinggi untuk toleransi kulit Anda saat ini. Sangat disarankan patch test!`, pointsDeducted: penalty, culprits: harshCulprits });
    } else if (activeRule.harsh.status !== "DILARANG" && rawHarshLoad > 0 && loadHarsh <= activeRule.harsh.maxLoad) {
      safetyFlags.push({ type: "SUCCESS", message: `Eksfoliasi Terukur: Takaran bahan aktif di formulasi ini tergolong lembut dan aman untuk profil Anda.`, pointsDeducted: 0, culprits: harshCulprits });
    }

    if (activeRule.buffer.status === "WAJIB" && rawBufferLoad < activeRule.buffer.minLoad) {
      const defisit = activeRule.buffer.minLoad - rawBufferLoad;
      const penalty = Math.min(20, defisit * 5);
      safetyScore -= penalty;
      safetyFlags.push({ type: "WARNING", message: `Minim Penenang: Formulasi ini minim agen soothing untuk menyeimbangkan efek bahan aktifnya.`, pointsDeducted: penalty });
    } else if (isSensitive && rawBufferLoad >= 6) {
      safetyScore += 10;
      safetyFlags.push({ type: "SUCCESS", message: `Ramah Sensitif: Memiliki lapisan penenang yang sangat baik untuk meredam kemerahan.`, pointsDeducted: 0 });
    }

    if (product.productType === "SUNSCREEN") {
      if (countUvFilter === 0) {
        safetyScore = 0;
        safetyFlags.push({ type: "CRITICAL", message: `Tanpa Filter UV: Tidak ditemukan agen pelindung matahari utama pada komposisinya.`, pointsDeducted: 100 });
      } else if (countUvFilter < activeRule.uvFilter.minCount) {
        safetyScore -= 20;
        safetyFlags.push({ type: "WARNING", message: `Proteksi Ringan: Spektrum perlindungan UV-nya mungkin kurang maksimal jika dipakai beraktivitas berat di luar ruangan.`, pointsDeducted: 20, culprits: uvCulprits });
      }
    }

    // 2. Validasi Tekstur (Komedo & Pelembap)
    if (maxSingleComedoFound > activeRule.maxSingleComedo) {
      matchScore -= 20;
      matchFlags.push({ type: "CRITICAL", message: `Potensi Komedo: Mengandung bahan komedogenik tinggi yang berisiko menyumbat pori-pori. Pemilik kulit rentan berjerawat disarankan untuk menghindari bahan ini.`, pointsDeducted: 20, culprits: comedoCulprits });
    } else if (loadComedoMulti > activeRule.maxMultiComedoLoad) {
      const excess = loadComedoMulti - activeRule.maxMultiComedoLoad;
      const penalty = Math.min(30, excess * 7);
      matchScore -= penalty;
      matchFlags.push({ type: "WARNING", message: `Rawan Beruntusan: Campuran beberapa bahan ringannya cukup banyak, berisiko menyumbat pori jika tidak dibersihkan dengan baik.`, pointsDeducted: penalty, culprits: comedoCulprits });
    }

    if (activeRule.surfactant.status === "WAJIB" && countSurfactant < activeRule.surfactant.minCount) {
      matchScore -= 30;
      matchFlags.push({ type: "CRITICAL", message: `Daya Bersih Lemah: Tidak ditemukan agen pembersih (surfaktan) yang memadai.`, pointsDeducted: 30 });
    }

    // 3. Pelembap Berat Dilarang
    if (activeRule.moistHeavy.status === "DILARANG" && countMoistHeavy > 0) {
      matchScore -= 25;
      matchFlags.push({ type: "CRITICAL", message: `Tekstur Cream / Terlalu Pekat: Kandungan oklusif (minyak pengunci) ini biasanya dihindari saat kulit sedang berjerawat aktif.`, pointsDeducted: 25, culprits: heavyMoistCulprits });
    }

    // 4. Moisturizer Logic Khusus
    const totalMoist = countMoistLight + countMoistMedium + countMoistHeavy;
    if (product.productType === "MOISTURIZER") {
      if (totalMoist === 0) {
        matchScore -= 30;
        matchFlags.push({ type: "CRITICAL", message: `Minim Penghidrasi: Sebagai pelembap, formulasi ini kekurangan agen pengikat air utama.`, pointsDeducted: 30 });
      } else {
        const isMoistLightKurang = activeRule.moistLight.status === "WAJIB" && countMoistLight < activeRule.moistLight.minCount;
        const isMoistMediumKurang = activeRule.moistMedium.status === "WAJIB" && countMoistMedium < activeRule.moistMedium.minCount;
        if (isMoistLightKurang || isMoistMediumKurang) {
          matchScore -= 10;
          matchFlags.push({ type: "WARNING", message: `Daya Lembap Ringan: Teksturnya mungkin terasa kurang 'mengunci' hidrasi untuk kebutuhan tipe kulit Anda.`, pointsDeducted: 10 });
        }
      }
    } else if (product.productType === "SUNSCREEN") {
      if (totalMoist === 0) {
        matchFlags.push({ type: "INFO", message: `Hasil Akhir Matte/Kering: Tabir surya ini sangat ringan. Direkomendasikan menggunakan pelembap sebelumnya.`, pointsDeducted: 0 });
      }
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

  // F. CEK BAHAN ASING
  if (unknown.length > 3) {
    safetyFlags.push({ type: "WARNING", message: `Deteksi Buta: Terdapat ${unknown.length} bahan yang belum dikenali sistem. Pastikan kamu tidak alergi terhadap bahan-bahan tersebut.`, pointsDeducted: 0 });
  }

  // G. KUNCI SKOR
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