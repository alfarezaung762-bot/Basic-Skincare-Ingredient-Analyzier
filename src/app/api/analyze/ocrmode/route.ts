// src/app/api/analyze/ocrmode/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { openRouterWithKeyRotation } from "@/lib/openRouterKeyManager";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface OcrModelConfig {
  provider: "gemini" | "byteplus" | "openrouter";
  model: string;
  label?: string;
  useReasoning?: boolean;
}

const DEFAULT_OCR_MODELS: OcrModelConfig[] = [
  { provider: "gemini", model: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Vision)" },
  { provider: "gemini", model: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Vision)" }
];

function base64ToGenerativePart(base64Str: string) {
  let mimeType = "image/jpeg";
  let data = base64Str;
  
  if (base64Str.startsWith("data:")) {
    const parts = base64Str.split(";base64,");
    mimeType = parts[0].split(":")[1] || "image/jpeg";
    data = parts[1];
  }
  
  return {
    inlineData: {
      data,
      mimeType
    },
  };
}

function ensureBase64DataUrl(base64Str: string) {
  if (base64Str.startsWith("data:")) return base64Str;
  return `data:image/jpeg;base64,${base64Str}`;
}

export async function GET(req: Request) {
  try {
    const config = await prisma.aIPromptConfig.findUnique({
      where: { id: "singleton_ai_config" }
    });
    return NextResponse.json({
      ocrPrompt: config?.ocrPrompt || `Kamu adalah mesin OCR yang mengekstrak daftar bahan (ingredients list) dari foto label produk skincare/kosmetik.

ATURAN:
1. Ekstrak HANYA bagian "Ingredients:" atau "Komposisi:" dari gambar
2. Abaikan nama produk, brand, klaim marketing, barcode, dll
3. Output berupa satu baris teks, setiap bahan dipisahkan koma (,)
4. Pertahankan ejaan INCI asli (jangan terjemahkan ke bahasa Indonesia)
5. Jika ada teks yang terpotong/blur, beri tanda [?] di depan bahan tersebut
6. Jika gambar bukan label bahan kosmetik, kembalikan "ERROR: Gambar bukan label bahan kosmetik"
7. Jika menerima 2 gambar (mode dual/botol melengkung), gabungkan kedua sisi menjadi SATU daftar lengkap tanpa duplikasi

Kembalikan HANYA teks daftar bahan, tanpa penjelasan tambahan.`,
      ocrModelPriority: config?.ocrModelPriority || JSON.stringify(DEFAULT_OCR_MODELS)
    });
  } catch (error: any) {
    console.error("[OCR-API] GET Error:", error);
    return NextResponse.json({ error: "Failed to fetch OCR configuration" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Harap login terlebih dahulu." }, { status: 401 });
    }

    const body = await req.json();

    // Check if it is a Save Settings request
    if (body.ocrPrompt !== undefined || body.ocrModelPriority !== undefined) {
      const updateData: any = {};
      if (body.ocrPrompt !== undefined) updateData.ocrPrompt = body.ocrPrompt;
      if (body.ocrModelPriority !== undefined) updateData.ocrModelPriority = body.ocrModelPriority;

      const config = await prisma.aIPromptConfig.upsert({
        where: { id: "singleton_ai_config" },
        update: updateData,
        create: {
          id: "singleton_ai_config",
          dataTemplate: "Nama (INCI), Sifat Kimia, Level Kekuatan, Fungsi Khusus, Sinonim / Alias, Manfaat Singkat (Untuk Pengguna), Analisis Mendalam (Khusus Mesin AI), Komedogenik (0-5), Aman Bumil, Aman Sensitif, Fokus Perawatan, Dilarang Keras Untuk",
          prioritizedSources: "EWG, Paula's Choice, INCIDecoder, CIR (Cosmetic Ingredient Review), PubMed",
          allowExternalSources: false,
          systemPrompt: "Kamu adalah Senior Raw Material Chemist dan Principal Skincare Formulator. Keahlian mutlakmu adalah biokimia kosmetik tingkat celluler (molekul, pH, penetrasi stratum corneum, dan profil interaksi senyawa). Kamu TIDAK merespons layaknya asisten virtual atau beauty blogger, melainkan murni sebagai ilmuwan laboratorium yang berpegang tehuh pada Evidence-Based Medicine (EBM) dan literatur dermatologi terverifikasi serta memiliki pengalaman lebih dari 25 tahun.\n\nData JSON yang kamu hasilkan BUKAN sekadar teks bacaan, melainkan PARAMETER MATEMATIS yang akan dieksekusi langsung oleh Scoring Engine TypeScript kami.\n\nATURAN SISTEM SAAT INI:\n{{ATURAN_SISTEM}}\n\n[PROTOKOL KODE MERAH: ANTI-HALUSINASI & KEAMANAN SISTEM]\n1. ZERO HALLUCINATION: Jika data klinis tidak ditemukan, tetapkan type sebagai BASIC, functionalCategory sebagai UMUM.\n2. VALIDASI TOKSIKOLOGI KETAT: Parameter safeForPregnancy, safeForSensitive, dan blacklistedSkinTypes memicu penalti skor keselamatan secara mutlak. Gunakan murni referensi medis nyata.\n3. KEPATUHAN JSON MURNI: Output HARUS berupa satu objek JSON mentah.",
          autoReportUnknowns: true,
          ocrPrompt: body.ocrPrompt || null,
          ocrModelPriority: body.ocrModelPriority || null,
        }
      });
      return NextResponse.json(config);
    }

    // Otherwise it is an OCR scan request
    const { images, mode } = body;

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ message: "Foto label tidak boleh kosong." }, { status: 400 });
    }

    // 1. Ambil config dari DB
    const config = await prisma.aIPromptConfig.findUnique({
      where: { id: "singleton_ai_config" }
    });

    const ocrPrompt = config?.ocrPrompt || `Kamu adalah mesin OCR yang mengekstrak daftar bahan (ingredients list) dari foto label produk skincare/kosmetik.

ATURAN:
1. Ekstrak HANYA bagian "Ingredients:" atau "Komposisi:" dari gambar
2. Abaikan nama produk, brand, klaim marketing, barcode, dll
3. Output berupa satu baris teks, setiap bahan dipisahkan koma (,)
4. Pertahankan ejaan INCI asli (jangan terjemahkan ke bahasa Indonesia)
5. Jika ada teks yang terpotong/blur, beri tanda [?] di depan bahan tersebut
6. Jika gambar bukan label bahan kosmetik, kembalikan "ERROR: Gambar bukan label bahan kosmetik"
7. Jika menerima 2 gambar (mode dual/botol melengkung), gabungkan kedua sisi menjadi SATU daftar lengkap tanpa duplikasi

Kembalikan HANYA teks daftar bahan, tanpa penjelasan tambahan.`;

    let modelList: OcrModelConfig[] = DEFAULT_OCR_MODELS;
    if (config?.ocrModelPriority) {
      try {
        const parsed = JSON.parse(config.ocrModelPriority);
        if (Array.isArray(parsed) && parsed.length > 0) {
          modelList = parsed;
        }
      } catch (e) {
        console.warn("[OCR-API] Gagal parse model list, menggunakan default.");
      }
    }

    let extractedText = "";
    let usedModel = "";

    // 2. Cascade fallback model loop
    for (const modelConfig of modelList) {
      const currentModel = modelConfig.model;
      const provider = modelConfig.provider;

      try {
        console.log(`[OCR-API] Mencoba model: ${currentModel} (${provider})...`);

        if (provider === "gemini") {
          const model = genAI.getGenerativeModel({ model: currentModel });
          const promptParts = [
            ocrPrompt,
            ...images.map(img => base64ToGenerativePart(img))
          ];
          const result = await model.generateContent(promptParts);
          extractedText = result.response.text();
        } else if (provider === "openrouter") {
          const contentArray: any[] = [{ type: "text", text: ocrPrompt }];
          
          images.forEach(img => {
            contentArray.push({
              type: "image_url",
              image_url: {
                url: ensureBase64DataUrl(img)
              }
            });
          });

          const payload = {
            model: currentModel,
            messages: [{ role: "user", content: contentArray }],
            temperature: 0.1
          };

          const useReasoning = modelConfig.useReasoning || false;
          const { responseText } = await openRouterWithKeyRotation(payload, useReasoning, "[OCR-API]");
          extractedText = responseText;
        } else if (provider === "byteplus") {
          let byteplusUrl = process.env.BYTEPLUS_BASE_URL || "https://ark.ap-southeast.bytepluses.com/api/v3";
          if (byteplusUrl.includes("ark.byteplus.com")) {
            byteplusUrl = "https://ark.ap-southeast.bytepluses.com/api/v3";
          }
          const client = new OpenAI({
            apiKey: process.env.BYTEPLUS_API_KEY || "",
            baseURL: byteplusUrl,
          });

          const contentArray: any[] = [{ type: "text", text: ocrPrompt }];
          images.forEach(img => {
            contentArray.push({
              type: "image_url",
              image_url: {
                url: ensureBase64DataUrl(img)
              }
            });
          });

          const response = await client.chat.completions.create({
            model: currentModel,
            messages: [{ role: "user", content: contentArray }],
            temperature: 0.1
          });
          extractedText = response.choices[0].message.content || "";
        }

        // Pembersihan output
        if (extractedText) {
          extractedText = extractedText.replace(/```(?:markdown|json|text)?\s*([\s\S]*?)\s*```/g, "$1").trim();
          usedModel = currentModel;
          break; // Berhasil! Keluar dari loop cascade
        }
      } catch (err: any) {
        console.error(`[OCR-API] Gagal dengan model ${currentModel}:`, err.message || err);
      }
    }

    if (!extractedText) {
      return NextResponse.json({ message: "Semua model AI gagal memproses gambar label skincare. Silakan coba unggah foto yang lebih jelas." }, { status: 500 });
    }

    return NextResponse.json({
      extractedText,
      modelUsed: usedModel
    });

  } catch (error: any) {
    console.error("[OCR-API] Critical Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan internal sistem." }, { status: 500 });
  }
}


