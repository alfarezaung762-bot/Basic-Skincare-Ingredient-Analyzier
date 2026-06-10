import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PARAMETER_RULES, COLUMN_TO_SOURCE_KEY } from "@/lib/deepResearchRules";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { statusFilter, typeFilter, columns, includePrompt, includeResponseFormat } = await req.json();

    // Build query based on selected filters
    const where: any = {};

    if (statusFilter === "VERIFIED") {
      where.isVerified = true;
    } else if (statusFilter === "UNVERIFIED") {
      where.isVerified = false;
    }

    if (typeFilter && typeFilter !== "ALL") {
      where.type = typeFilter;
    }

    // Retrieve ingredients from dictionary
    const ingredients = await prisma.ingredientDictionary.findMany({
      where,
      orderBy: { name: "asc" },
    });

    let textContent = "";

    // ============================================================
    // BAGIAN 1: PROMPT DEEP RESEARCH (jika diminta)
    // ============================================================
    if (includePrompt) {
      // Ambil config dari DB
      const aiConfig = await prisma.aIPromptConfig.findUnique({
        where: { id: "singleton_ai_config" },
      });

      // Tentukan parameter mana yang dipilih user
      const selectedParams = Object.keys(columns).filter(
        (key) => columns[key] && PARAMETER_RULES[key]
      );

      const allSelected = selectedParams.length >= Object.keys(PARAMETER_RULES).length - 1; // -1 karena aliases tidak selalu ada

      textContent += `##########################################################\n`;
      textContent += `# PROMPT DEEP RESEARCH — VALIDASI MANUAL VIA GEMINI\n`;
      textContent += `# Tanggal: ${new Date().toLocaleString("id-ID")}\n`;
      if (!allSelected) {
        textContent += `# MODE: KHUSUS (${selectedParams.map(k => PARAMETER_RULES[k]?.label || k).join(", ")})\n`;
      } else {
        textContent += `# MODE: LENGKAP (Semua Parameter)\n`;
      }
      textContent += `##########################################################\n\n`;

      // System prompt dari DB
      textContent += `[IDENTITAS AI]\n`;
      if (aiConfig?.systemPrompt) {
        // Hilangkan tag {{ATURAN_SISTEM}} dari prompt — kita akan menulisnya terpisah
        const cleanPrompt = aiConfig.systemPrompt.replace("{{ATURAN_SISTEM}}", "(Lihat aturan parameter di bawah)");
        textContent += `${cleanPrompt}\n\n`;
      } else {
        textContent += `Kamu adalah Senior Raw Material Chemist dan Principal Skincare Formulator. Keahlian mutlakmu adalah biokimia kosmetik tingkat seluler. Data yang kamu hasilkan adalah PARAMETER MATEMATIS untuk Scoring Engine.\n\n`;
      }

      // Aturan per parameter yang dipilih
      textContent += `==========================================================\n`;
      textContent += `ATURAN PARAMETER YANG HARUS DIVALIDASI\n`;
      textContent += `==========================================================\n\n`;

      for (const paramKey of selectedParams) {
        const rule = PARAMETER_RULES[paramKey];
        if (rule) {
          textContent += `${rule.rule}\n\n`;
        }
      }

      // Sumber prioritas dari DB
      textContent += `==========================================================\n`;
      textContent += `SUMBER REFERENSI WAJIB (DARI KONFIGURASI ADMIN)\n`;
      textContent += `==========================================================\n`;

      if (aiConfig?.prioritizedSources) {
        try {
          const parsedSources = JSON.parse(aiConfig.prioritizedSources);
          const addedSourceKeys = new Set<string>();

          for (const paramKey of selectedParams) {
            const sourceKey = COLUMN_TO_SOURCE_KEY[paramKey];
            if (sourceKey && !addedSourceKeys.has(sourceKey) && parsedSources[sourceKey]) {
              const src = parsedSources[sourceKey];
              const sumber = typeof src === "string" ? src : src.sumber || "Tidak dibatasi";
              const izinkanLuar = typeof src === "object" ? src.izinkanLuar : false;
              const rule = izinkanLuar
                ? "[BOLEH CARI DI SUMBER LUAR JIKA TIDAK ADA]"
                : "[HANYA SUMBER INI - DILARANG CARI DI TEMPAT LAIN]";
              textContent += `- ${PARAMETER_RULES[paramKey]?.label || paramKey}: ${sumber} ${rule}\n`;
              addedSourceKeys.add(sourceKey);
            }
          }
        } catch {
          textContent += `${aiConfig.prioritizedSources}\n`;
        }
      } else {
        textContent += `Sumber default: EWG, Paula's Choice, INCIDecoder, CIR, PubMed\n`;
      }

      textContent += `\n`;

      // Kill Switch
      textContent += `[ATURAN PENCARIAN SUMBER MUTLAK (KILL SWITCH!)]\n`;
      textContent += `Jika suatu parameter memiliki label [HANYA SUMBER INI], dan data TIDAK DITEMUKAN pada sumber mutlak (serta tidak ada bukti valid di Jurnal Sinta 1 / Scopus Q1), DILARANG MENGARANG BEBAS.\n`;
      textContent += `Jika parameter memiliki label [BOLEH CARI DI SUMBER LUAR], gunakan pengetahuan medis atau sumber luar yang valid.\n\n`;

      // Instruksi tugas
      textContent += `==========================================================\n`;
      textContent += `TUGAS: Validasi ${allSelected ? "SEMUA parameter" : "parameter berikut: " + selectedParams.map(k => PARAMETER_RULES[k]?.label || k).join(", ")}\n`;
      textContent += `untuk setiap bahan yang tercantum di bawah.\n`;
      textContent += `Bandingkan data saat ini dengan literatur ilmiah terbaru.\n`;
      textContent += `Jika ada yang SALAH, sebutkan secara spesifik apa yang perlu diperbaiki.\n`;
      textContent += `==========================================================\n\n`;

      // Format jawaban AI (jika diminta)
      if (includeResponseFormat) {
        textContent += `==========================================================\n`;
        textContent += `FORMAT JAWABAN YANG DIHARAPKAN\n`;
        textContent += `==========================================================\n`;
        textContent += `Periksa SETIAP bahan di bawah. HANYA laporkan bahan yang datanya SALAH atau PERLU DIPERBAIKI.\n`;
        textContent += `Jika data suatu bahan sudah BENAR, JANGAN sebutkan bahan itu — langsung lewati.\n`;
        textContent += `Untuk setiap KOREKSI, gunakan format berikut:\n\n`;

        textContent += `--- FORMAT KOREKSI PER BAHAN ---\n`;
        textContent += `## [NAMA INCI BAHAN]\n`;

        if (selectedParams.includes('comedogenicRating')) {
          textContent += `- comedogenicRating: [nilai saat ini] → SEHARUSNYA [nilai benar]\n`;
          textContent += `  Alasan: [penjelasan singkat kenapa salah]\n`;
          textContent += `  Sumber: [nama jurnal/database] (sertakan link jika ada)\n`;
        }
        if (selectedParams.includes('type')) {
          textContent += `- type: [BASIC/BUFFER/HARSH/TOXIC saat ini] → SEHARUSNYA [nilai benar]\n`;
          textContent += `  - strengthLevel: [nilai saat ini] → SEHARUSNYA [nilai benar]\n`;
          textContent += `  Alasan: [mekanisme kimia yang mendukung koreksi]\n`;
          textContent += `  Sumber: [CIR/SCCS/jurnal] (sertakan link)\n`;
        }
        if (selectedParams.includes('functionalCategory')) {
          textContent += `- functionalCategory: [nilai saat ini] → SEHARUSNYA [nilai benar]\n`;
          textContent += `  Alasan: [klasifikasi yang benar berdasarkan mekanisme kerja]\n`;
          textContent += `  Sumber: [PCPC wINCI / UL Prospector] (sertakan link)\n`;
        }
        if (selectedParams.includes('safeForPregnancy')) {
          textContent += `- safeForPregnancy: [true/false saat ini] → SEHARUSNYA [nilai benar]\n`;
          textContent += `  Alasan: [bukti klinis — FDA Category, studi ACOG]\n`;
          textContent += `  Sumber: [ACOG/FDA/PubMed] (sertakan link)\n`;
        }
        if (selectedParams.includes('safeForSensitive')) {
          textContent += `- safeForSensitive: [true/false saat ini] → SEHARUSNYA [nilai benar]\n`;
          textContent += `  Alasan: [data klinis iritasi/patch test]\n`;
          textContent += `  Sumber: [CIR/NEA/dermatologi] (sertakan link)\n`;
        }
        if (selectedParams.includes('targetFocus')) {
          textContent += `- targetFocus: "[nilai saat ini]" → SEHARUSNYA "[nilai benar]"\n`;
          textContent += `  Alasan: [bukti efek terapeutik — studi klinis]\n`;
          textContent += `  Sumber: [PubMed/JCAD] (sertakan link)\n`;
        }
        if (selectedParams.includes('blacklistedSkinTypes')) {
          textContent += `- blacklistedSkinTypes: "[nilai saat ini]" → SEHARUSNYA "[nilai benar / kosongkan]"\n`;
          textContent += `  Alasan: [bukti klinis bahaya/ketiadaan bahaya]\n`;
          textContent += `  Sumber: [dermatologi klinis] (sertakan link)\n`;
        }
        if (selectedParams.includes('isKeyActive')) {
          textContent += `- isKeyActive: [true/false saat ini] → SEHARUSNYA [nilai benar]\n`;
          textContent += `  Alasan: [apakah bahan ini memenuhi kriteria active ingredient]\n`;
          textContent += `  Sumber: [FDA OTC Monograph] (sertakan link)\n`;
        }
        if (selectedParams.includes('benefits')) {
          textContent += `- benefits: "[teks saat ini]" → SEHARUSNYA "[teks yang benar, maks 30 kata, bahasa awam]"\n`;
          textContent += `  Alasan: [apa yang salah/kurang akurat]\n`;
        }
        if (selectedParams.includes('aliases')) {
          textContent += `- aliases: TAMBAHKAN [alias yang kurang] / HAPUS [alias yang salah]\n`;
          textContent += `  Sumber: [PCPC/INCI/INCIDecoder] (sertakan link)\n`;
        }
        if (selectedParams.includes('aiContext')) {
          textContent += `- aiContext: [sebutkan section mana yang perlu diperbaiki, misal: AMBANG KONSENTRASI]\n`;
          textContent += `  Koreksi: [teks perbaikan untuk section tersebut]\n`;
          textContent += `  Sumber: [jurnal/studi klinis] (sertakan link)\n`;
        }

        textContent += `\n--- CONTOH JAWABAN YANG BENAR ---\n`;
        textContent += `## COCONUT OIL\n`;
        textContent += `- comedogenicRating: 5 → SEHARUSNYA 4\n`;
        textContent += `  Alasan: Berdasarkan studi komedogenisitas Fulton (1984) dan data INCIDecoder, Coconut Oil memiliki rating 4, bukan 5. Rating 5 hanya untuk bahan seperti Isopropyl Myristate.\n`;
        textContent += `  Sumber: INCIDecoder (https://incidecoder.com/ingredients/cocos-nucifera-oil), Journal of the Society of Cosmetic Chemists Vol.35 (Fulton 1984)\n`;
        textContent += `\n`;
        textContent += `## NIACINAMIDE\n`;
        textContent += `- safeForSensitive: false → SEHARUSNYA true\n`;
        textContent += `  Alasan: Niacinamide pada konsentrasi ≤5% justru terbukti memperbaiki skin barrier dan mengurangi TEWL. Studi Draelos (2006) menunjukkan perbaikan signifikan pada kulit sensitif.\n`;
        textContent += `  Sumber: Draelos ZD et al. "Niacinamide-containing facial moisturizer" Cutis. 2006 (https://pubmed.ncbi.nlm.nih.gov/16489838/)\n`;
        textContent += `\n`;
        textContent += `Jika SEMUA data sudah benar, cukup jawab:\n`;
        textContent += `"✅ Semua data sudah tervalidasi — tidak ditemukan kesalahan."\n\n`;
      }
    }

    // ============================================================
    // BAGIAN 2: DATA BAHAN (selalu ada)
    // ============================================================
    textContent += `==================================================\n`;
    textContent += `EKSPOR DATA KAMUS BAHAN KECANTIKAN\n`;
    textContent += `Tanggal Ekspor: ${new Date().toLocaleString("id-ID")}\n`;
    textContent += `Filter Status: ${statusFilter}\n`;
    textContent += `Filter Tipe Kimia: ${typeFilter}\n`;
    textContent += `Jumlah Bahan: ${ingredients.length}\n`;
    textContent += `==================================================\n\n`;

    ingredients.forEach((ing, index) => {
      textContent += `${index + 1}. [NAMA INCI: ${ing.name.toUpperCase()}]\n`;
      
      if (columns.aliases && ing.aliases) {
        textContent += `   - Sinonim/Alias: ${ing.aliases}\n`;
      }
      if (columns.type) {
        textContent += `   - Sifat Kimia: ${ing.type} (Level Kekuatan: ${ing.strengthLevel})\n`;
      }
      if (columns.functionalCategory) {
        textContent += `   - Fungsi Utama: ${ing.functionalCategory}\n`;
      }
      if (columns.isKeyActive) {
        textContent += `   - Bahan Aktif Utama: ${ing.isKeyActive ? "YA ⭐" : "TIDAK"}\n`;
      }
      if (columns.benefits) {
        textContent += `   - Manfaat Singkat: ${ing.benefits || "-"}\n`;
      }
      if (columns.comedogenicRating !== undefined) {
        textContent += `   - Rating Komedogenik (0-5): ${ing.comedogenicRating}\n`;
      }
      if (columns.safeForPregnancy) {
        textContent += `   - Aman untuk Bumil/Busui: ${ing.safeForPregnancy ? "YA ✅" : "TIDAK ❌"}\n`;
      }
      if (columns.safeForSensitive) {
        textContent += `   - Aman untuk Kulit Sensitif: ${ing.safeForSensitive ? "YA ✅" : "TIDAK ❌"}\n`;
      }
      if (columns.targetFocus && ing.targetFocus) {
        textContent += `   - Fokus Perawatan: ${ing.targetFocus}\n`;
      }
      if (columns.blacklistedSkinTypes && ing.blacklistedSkinTypes) {
        textContent += `   - Dilarang untuk Tipe Kulit: ${ing.blacklistedSkinTypes}\n`;
        if (ing.blacklistReason) {
          textContent += `     Alasan: ${ing.blacklistReason}\n`;
        }
      }
      if (columns.aiContext && ing.aiContext) {
        textContent += `   - Analisis Mendalam AI:\n${ing.aiContext.split('\n').map(line => `     ${line}`).join('\n')}\n`;
      }
      textContent += `\n`;
    });

    // Return plain text response
    return new Response(textContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="ingredients-export.txt"`,
      },
    });

  } catch (error: any) {
    console.error("Export Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan sistem saat mengekspor data." },
      { status: 500 }
    );
  }
}
