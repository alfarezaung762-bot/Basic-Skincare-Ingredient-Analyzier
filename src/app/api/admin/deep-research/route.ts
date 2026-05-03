// src/app/api/admin/deep-research/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

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
// MODEL FALLBACK CHAIN
// Catatan: gemini-3.1-pro dan gemini-2.5-pro = PAID ONLY (limit: 0 di free tier)
// gemini-3-flash = TIDAK ADA (404)
// Hanya model Flash yang tersedia di free tier
// ========================================================
const FALLBACK_MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash-latest",
];

// ========================================================
// JSON SCHEMA UNTUK STRUCTURED OUTPUT
// ========================================================
const INGREDIENT_SCHEMA = {
  type: "object" as const,
  properties: {
    name: { type: "string" as const, description: "Nama INCI resmi bahan, gunakan tanda kurung jika ada angka dengan koma contoh: (1,3)-propanediol" },
    aliases: { type: "string" as const, description: "Daftar sinonim/alias dipisahkan koma, termasuk nama Indonesia, Inggris, dan nama umum dalam skincare. Gunakan tanda kurung jika ada koma dalam 1 bahan." },
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

// ========================================================
// FUNGSI UTAMA: Riset satu bahan via Gemini
// ========================================================
async function researchIngredient(ingredientName: string): Promise<{ success: boolean; data?: any; error?: string; modelUsed?: string }> {
  const prompt = `Kamu adalah ahli dermatologi, kosmesi, dan kimia farmasi internasional dengan pengalaman 20+ tahun.

Analisis bahan skincare "${ingredientName}" berdasarkan penelitian resmi dermatologi, jurnal SINTA 1, PubMed, dan referensi terpercaya.

Kembalikan TEPAT dalam format JSON berikut (SEMUA field WAJIB diisi, SEMUA value HARUS berupa STRING kecuali yang ditandai angka/boolean):

{
  "name": "nama inci resmi (lowercase)",
  "aliases": "sinonim1, sinonim2, nama indonesia, nama inggris",
  "type": "BASIC atau BUFFER atau HARSH atau TOXIC",
  "strengthLevel": 1,
  "functionalCategory": "UMUM atau SURFAKTAN atau UV_FILTER atau PELEMBAP_HUMEKTAN atau PELEMBAP_EMOLIEN atau PELEMBAP_OKLUSIF",
  "isKeyActive": true,
  "benefits": "manfaat singkat maks 30 kata untuk orang awam",
  "aiContext": "analisis mendalam MINIMAL 500 KATA...",
  "comedogenicRating": 0,
  "safeForPregnancy": true,
  "safeForSensitive": true,
  "targetFocus": "Mencerahkan & Bekas Jerawat, Memperbaiki Skin Barrier & Hidrasi",
  "blacklistedSkinTypes": "",
  "blacklistReason": "",
  "warnings": "peringatan penggunaan"
}

ATURAN KETAT:
1. "aliases" = STRING, bukan array. Pisahkan dengan koma. Sertakan nama Indonesia dan Inggris.
2. "type": BASIC=umum/standar, BUFFER=penenang/calming, HARSH=keras/asam kuat, TOXIC=berbahaya.
3. "strengthLevel": angka 1-3. Gunakan 2 atau 3 HANYA jika type=HARSH atau BUFFER. Untuk BASIC/TOXIC selalu 1.
4. "functionalCategory": Pilih yang PALING tepat. Ceramide/lipid = PELEMBAP_OKLUSIF. Hyaluronic/glycerin = PELEMBAP_HUMEKTAN. Minyak/ester = PELEMBAP_EMOLIEN. SLS/SLES = SURFAKTAN. Zinc oxide/titanium = UV_FILTER. Lainnya = UMUM.
5. "isKeyActive": true jika ini bahan aktif utama (niacinamide, retinol, vitamin C, ceramide, AHA/BHA, peptide, dll). false jika hanya pengawet/pelarut/emulsifier.
6. "benefits": STRING, maks 30 kata, bahasa yang mudah dipahami.
7. "aiContext": STRING, WAJIB MINIMAL 500 KATA. Tulis analisis mendalam meliputi: mekanisme kerja kimia, pH optimal, konsentrasi efektif, pantangan campuran, data klinis/jurnal, efek samping, sejarah dermatologi, rekomendasi formulasi, perbandingan bahan serupa. JANGAN kurang dari 500 kata.
8. "targetFocus": STRING, pilih yang relevan dipisah koma dari daftar ini SAJA: "Mencerahkan & Bekas Jerawat", "Merawat Jerawat & Sebum", "Anti-Aging & Garis Halus", "Memperbaiki Skin Barrier & Hidrasi", "Menenangkan Kemerahan (Soothing)", "Eksfoliasi & Tekstur Pori-pori". WAJIB isi minimal 1 jika bahan punya manfaat perawatan.
9. "blacklistedSkinTypes": STRING. Pilih dari: "Normal", "Kering", "Berminyak", "Kombinasi". Kosongkan ("") jika aman untuk semua.
10. "warnings": STRING berisi peringatan penggunaan. Kosongkan ("") jika tidak ada.
11. "comedogenicRating": angka 0-5 berdasarkan data publikasi.
12. Jika TOXIC: safeForPregnancy=false, safeForSensitive=false.

Kembalikan HANYA JSON tanpa markdown, tanpa penjelasan tambahan.`;

  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`[Deep Research] Mencoba model: ${modelName} untuk "${ingredientName}"...`);
      
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2, // Rendah agar lebih faktual
        } as any,
      });

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      // Validasi: aiContext harus >= 400 kata
      const wordCount = (parsed.aiContext || "").split(/\s+/).filter((w: string) => w.length > 0).length;
      if (wordCount < 400) {
        console.warn(`[Deep Research] ⚠️ aiContext hanya ${wordCount} kata untuk "${ingredientName}" (model: ${modelName}). Mencoba ulang...`);
        
        // Retry dengan prompt yang lebih tegas
        const retryPrompt = `${prompt}\n\nPERINGATAN KERAS: Respons sebelumnya hanya menghasilkan ${wordCount} kata untuk aiContext. Kali ini WAJIB menghasilkan MINIMAL 500 KATA untuk field aiContext. Tuliskan analisis yang sangat detail dan komprehensif. Jangan buat kurang dari 500 kata.`;
        
        const retryResult = await model.generateContent(retryPrompt);
        const retryText = retryResult.response.text();
        const retryParsed = JSON.parse(retryText);
        
        const retryWordCount = (retryParsed.aiContext || "").split(/\s+/).filter((w: string) => w.length > 0).length;
        
        if (retryWordCount >= 400) {
          console.log(`[Deep Research] ✅ Retry berhasil: ${retryWordCount} kata (model: ${modelName})`);
          return { success: true, data: retryParsed, modelUsed: modelName };
        }
        
        // Jika masih kurang, tetap terima tapi log warning
        console.warn(`[Deep Research] ⚠️ Retry masih ${retryWordCount} kata. Tetap diterima.`);
        return { success: true, data: retryParsed, modelUsed: modelName };
      }

      console.log(`[Deep Research] ✅ Berhasil: "${ingredientName}" (${wordCount} kata, model: ${modelName})`);
      return { success: true, data: parsed, modelUsed: modelName };

    } catch (err: any) {
      console.warn(`[Deep Research] ⚠️ Model ${modelName} gagal untuk "${ingredientName}": ${err.message}`);
      continue;
    }
  }

  return { success: false, error: "Semua model AI gagal. Coba lagi nanti." };
}

// ========================================================
// POST: Endpoint utama Deep Research (SSE Streaming)
// ========================================================
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { names, adminName, adminRole } = body;

    if (!names || !Array.isArray(names) || names.length === 0) {
      return NextResponse.json({ message: "Daftar bahan kosong." }, { status: 400 });
    }

    if (names.length > 15) {
      return NextResponse.json({ message: "Maksimal 15 bahan per sesi." }, { status: 400 });
    }

    // ========================================================
    // AMBIL DATA EXISTING UNTUK FILTER DUPLIKASI
    // ========================================================
    const existingIngredients = await prisma.ingredientDictionary.findMany({
      select: { name: true, aliases: true },
    });

    let allExistingNames: string[] = [];
    existingIngredients.forEach((item) => {
      allExistingNames.push(normalizeString(item.name));
      if (item.aliases) {
        item.aliases.split(/,(?![^()]*\))/g).forEach((a) => {
          const clean = normalizeString(a.replace(/[\(\)]/g, ""));
          if (clean) allExistingNames.push(clean);
        });
      }
    });
    allExistingNames = Array.from(new Set(allExistingNames));

    // Filter bahan yang sudah ada
    const filteredNames = names.filter((n: string) => !allExistingNames.includes(normalizeString(n)));
    const skippedNames = names.filter((n: string) => allExistingNames.includes(normalizeString(n)));

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
          skippedCount: skippedNames.length,
        });

        const results: { name: string; success: boolean; aliasCount: number; model?: string; error?: string }[] = [];
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

          const research = await researchIngredient(ingredientName);

          if (research.success && research.data) {
            const data = research.data;

            try {
              // ========================================================
              // SIMPAN KE DATABASE
              // ========================================================
              const finalName = (data.name || ingredientName).toLowerCase().trim();
              
              // Cek apakah nama sudah ada (race condition guard)
              const existing = await prisma.ingredientDictionary.findFirst({
                where: { name: finalName },
              });

              if (existing) {
                results.push({ name: ingredientName, success: false, aliasCount: 0, error: "Bahan sudah ada di kamus" });
                sendEvent({
                  type: "progress",
                  current: i + 1,
                  total: filteredNames.length,
                  name: ingredientName,
                  status: "skipped",
                  reason: "Sudah ada di kamus",
                });
                continue;
              }

              // ========================================================
              // NORMALISASI SEMUA FIELD (AI bisa return array atau string)
              // ========================================================
              const toStr = (val: any): string | null => {
                if (!val) return null;
                if (Array.isArray(val)) return val.join(", ").trim() || null;
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
              const aliasesString = toStr(data.aliases)?.toLowerCase() || null;
              const benefitsStr = toStr(data.benefits) || "";
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
              // AUTO-CLEANUP: Hapus laporan yang cocok (nama + alias)
              // ========================================================
              const namesToMatch = [normalizeString(finalName)];
              if (aliasesString) {
                aliasesString.split(/,(?![^()]*\))/g).forEach((a: string) => {
                  const clean = normalizeString(a.replace(/[\(\)]/g, ""));
                  if (clean) namesToMatch.push(clean);
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

              results.push({ 
                name: ingredientName, 
                success: true, 
                aliasCount, 
                model: research.modelUsed 
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
