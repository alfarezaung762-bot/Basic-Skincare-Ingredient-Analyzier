// src/app/api/seed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Daftar bahan mentah dari contohmu, sudah dipetakan ke logika medis kita
    const ingredientsToSeed = [
      { name: "aqua", type: "BASIC", functionalCategory: "UMUM", benefits: "Pelarut utama.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "water, air" },
      { name: "butylene glycol", type: "BASIC", functionalCategory: "UMUM", benefits: "Pelarut dan agen pengkondisi kulit.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "dicaprylyl carbonate", type: "BASIC", functionalCategory: "UMUM", benefits: "Emolien yang melembutkan kulit.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "butyrospermum parkii butter", type: "BUFFER", functionalCategory: "PELEMBAP", benefits: "Shea butter, sangat melembapkan.", comedogenicRating: 2, safeForPregnancy: true, safeForSensitive: true, aliases: "shea butter" },
      { name: "cetearyl alcohol", type: "BASIC", functionalCategory: "UMUM", benefits: "Fatty alcohol (baik) penstabil emulsi.", comedogenicRating: 2, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "glycerin", type: "BASIC", functionalCategory: "PELEMBAP", benefits: "Menarik air ke dalam kulit (Humektan).", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "gliserin" },
      { name: "dimethicone", type: "BASIC", functionalCategory: "UMUM", benefits: "Silikon pembentuk lapisan pelindung halus.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "squalane", type: "BUFFER", functionalCategory: "PELEMBAP", benefits: "Emolien identik dengan sebum kulit.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "propanediol", type: "BASIC", functionalCategory: "UMUM", benefits: "Pelarut alternatif yang lebih aman.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "bifida ferment lysate", type: "HERO", functionalCategory: "UMUM", benefits: "Probiotik untuk skin barrier dan anti-aging.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "hydroxyethyl acrylate/sodium acryloyldimethyl taurate copolymer", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengental dan penstabil tekstur.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "saccharide isomerate", type: "BUFFER", functionalCategory: "PELEMBAP", benefits: "Pengikat kelembapan tahan lama.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "allantoin", type: "BUFFER", functionalCategory: "UMUM", benefits: "Menenangkan dan mencegah iritasi.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "bisabolol", type: "BUFFER", functionalCategory: "UMUM", benefits: "Ekstrak chamomile, anti-inflamasi kuat.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "1,2-hexanediol", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengawet dan pelarut ringan.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "cetearyl glucoside", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengemulsi alami turunan gula.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "glyceryl stearate", type: "BASIC", functionalCategory: "UMUM", benefits: "Emolien dan penstabil emulsi.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "xanthan gum", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengental tekstur alami.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "polysilicone-11", type: "BASIC", functionalCategory: "UMUM", benefits: "Peningkat tekstur silikon.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "chlorphenesin", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengawet kosmetik.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "peg-100 stearate", type: "BASIC", functionalCategory: "UMUM", benefits: "Agen pembersih dan pengemulsi.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "tocopheryl acetate", type: "BUFFER", functionalCategory: "UMUM", benefits: "Vitamin E, antioksidan murni.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "disodium edta", type: "BASIC", functionalCategory: "UMUM", benefits: "Agen pengkelat untuk menjaga kestabilan produk.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "caprylhydroxamic acid", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengawet alternatif pengganti paraben.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "sodium hyaluronate", type: "BUFFER", functionalCategory: "PELEMBAP", benefits: "Turunan Hyaluronic Acid, menghidrasi kulit dalam.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "sodium citrate", type: "BASIC", functionalCategory: "UMUM", benefits: "Penyeimbang pH produk.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "citric acid", type: "HARSH", functionalCategory: "UMUM", benefits: "AHA alami (Eksfoliasi), bisa sedikit mengiritasi kulit sensitif jika kadarnya tinggi.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: false, aliases: "" },
      { name: "phragmites karka extract", type: "BUFFER", functionalCategory: "UMUM", benefits: "Ekstrak tumbuhan penenang kulit.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "poria cocos extract", type: "BUFFER", functionalCategory: "UMUM", benefits: "Ekstrak jamur antioksidan.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "mirabilis jalapa extract", type: "BUFFER", functionalCategory: "UMUM", benefits: "Ekstrak bunga meredakan kemerahan.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "sodium benzoate", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengawet yang aman.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" },
      { name: "glucose", type: "BASIC", functionalCategory: "PELEMBAP", benefits: "Gula pengikat air.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, aliases: "" }
    ];

    // Eksekusi penambahan ke database (Skip yang sudah ada)
    const result = await prisma.ingredientDictionary.createMany({
      data: ingredientsToSeed as any,
      skipDuplicates: true, 
    });

    return NextResponse.json({ message: `Berhasil menambahkan ${result.count} bahan ke database!` });
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal:", error: error.message }, { status: 500 });
  }
}