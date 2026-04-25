// src/app/api/seed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Daftar bahan mentah yang sudah dikalibrasi ke Arsitektur V3
    const ingredientsToSeed = [
      { 
        name: "aqua", aliases: "water, air", type: "BASIC", functionalCategory: "UMUM", 
        benefits: "Pelarut utama dalam sebagian besar produk kosmetik.", 
        comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, 
        isKeyActive: false, strengthLevel: 1 
      },
      { 
        name: "gliserin", aliases: "glycerin, glycerol", type: "BASIC", functionalCategory: "PELEMBAP_HUMEKTAN", 
        benefits: "Menarik air dari udara ke dalam kulit untuk hidrasi mendalam.", 
        comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, 
        isKeyActive: true, strengthLevel: 1, targetFocus: "Memperbaiki Skin Barrier & Hidrasi" 
      },
      { 
        name: "niacinamide", aliases: "vitamin b3", type: "BASIC", functionalCategory: "UMUM", 
        benefits: "Mencerahkan kulit, mengontrol sebum, dan memperkuat barrier.", 
        comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, 
        isKeyActive: true, strengthLevel: 1, targetFocus: "Mencerahkan & Bekas Jerawat,Merawat Jerawat & Sebum" 
      },
      { 
        name: "allantoin", aliases: "", type: "BUFFER", functionalCategory: "UMUM", 
        benefits: "Menenangkan kulit kemerahan dan mempercepat penyembuhan luka.", 
        comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, 
        isKeyActive: false, strengthLevel: 2, targetFocus: "Menenangkan Kemerahan (Soothing)" 
      },
      { 
        name: "lisat fermentasi bifida", aliases: "bifida ferment lysate", type: "BUFFER", functionalCategory: "UMUM", 
        benefits: "Probiotik untuk menyeimbangkan mikrobioma kulit dan mengurangi sensitivitas.", 
        comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, 
        isKeyActive: true, strengthLevel: 2, targetFocus: "Memperbaiki Skin Barrier & Hidrasi,Anti-Aging & Garis Halus" 
      },
      { 
        name: "natrium hialuronat", aliases: "sodium hyaluronate, hyaluronic acid", type: "BASIC", functionalCategory: "PELEMBAP_HUMEKTAN", 
        benefits: "Bentuk garam dari asam hialuronat yang mampu menahan air.", 
        comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, 
        isKeyActive: true, strengthLevel: 1, targetFocus: "Memperbaiki Skin Barrier & Hidrasi" 
      },
      { 
        name: "butyrospermum parkii butter", aliases: "shea butter", type: "BASIC", functionalCategory: "PELEMBAP_OKLUSIF", 
        benefits: "Emolien pekat yang sangat bagus untuk mengunci kelembapan pada kulit kering.", 
        comedogenicRating: 4, safeForPregnancy: true, safeForSensitive: true, 
        isKeyActive: false, strengthLevel: 1, 
        blacklistedSkinTypes: "Berminyak", blacklistReason: "Sangat tebal dan berisiko tinggi menyumbat pori-pori pada kulit yang memproduksi banyak sebum." 
      },
      { 
        name: "asam sitrat", aliases: "citric acid, aha", type: "HARSH", functionalCategory: "UMUM", 
        benefits: "Mengeksfoliasi sel kulit mati di lapisan teratas kulit.", 
        comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: false, 
        isKeyActive: false, strengthLevel: 2, targetFocus: "Eksfoliasi & Tekstur Pori-pori" 
      },
      { name: "bisabolol", aliases: "alpha-bisabolol", type: "BUFFER", functionalCategory: "UMUM", benefits: "Komponen aktif chamomile yang meredakan inflamasi.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 2 },
      { name: "butilena glikol", aliases: "butylene glycol", type: "BASIC", functionalCategory: "PELEMBAP_HUMEKTAN", benefits: "Pelarut yang menarik kelembapan.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "fenoksietanol", aliases: "phenoxyethanol", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengawet spektrum luas.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "1,2-heksanediol", aliases: "1,2-hexanediol", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengawet dan pelarut ringan.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "amodimetikon", aliases: "amodimethicone", type: "BASIC", functionalCategory: "PELEMBAP_OKLUSIF", benefits: "Silikon pelindung.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "biosaccharide gum-1", aliases: "", type: "BUFFER", functionalCategory: "PELEMBAP_HUMEKTAN", benefits: "Menenangkan dan menghidrasi kulit secara instan.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "c13-14 isoparafin", aliases: "c13-14 isoparaffin", type: "BASIC", functionalCategory: "UMUM", benefits: "Agen pembentuk tekstur.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "asam kaprilhidroksamat", aliases: "caprylhydroxamic acid", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengawet alternatif.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "karbomer", aliases: "carbomer", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengental gel transparan.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "setearil olivat", aliases: "cetearyl olivate", type: "BASIC", functionalCategory: "UMUM", benefits: "Emulsifier turunan zaitun.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "klorfenesin", aliases: "chlorphenesin", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengawet untuk mencegah bakteri.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "dimetikon", aliases: "dimethicone", type: "BASIC", functionalCategory: "PELEMBAP_OKLUSIF", benefits: "Membentuk lapisan pelindung anti air.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "dimethicone/vinyl dimethicone crosspolymer", aliases: "", type: "BASIC", functionalCategory: "PELEMBAP_OKLUSIF", benefits: "Memberikan rasa halus dan matte.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "dinatrium edta", aliases: "disodium edta", type: "BASIC", functionalCategory: "UMUM", benefits: "Menjaga kestabilan produk.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "laureth-7", aliases: "", type: "BASIC", functionalCategory: "SURFAKTAN", benefits: "Emulsifier dan pembersih.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "ekstrak mirabilis jalapa", aliases: "mirabilis jalapa extract", type: "BUFFER", functionalCategory: "UMUM", benefits: "Meredakan kemerahan dan sensitivitas kulit.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 2 },
      { name: "pentilen glikol", aliases: "pentylene glycol", type: "BASIC", functionalCategory: "PELEMBAP_HUMEKTAN", benefits: "Pelarut pengikat air.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "poliakrilamida", aliases: "polyacrylamide", type: "BASIC", functionalCategory: "UMUM", benefits: "Pembentuk selaput tekstur.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "propanediol", aliases: "", type: "BASIC", functionalCategory: "UMUM", benefits: "Pelarut alternatif yang ramah kulit.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "sakarida isomerat", aliases: "saccharide isomerate", type: "BUFFER", functionalCategory: "PELEMBAP_HUMEKTAN", benefits: "Pengikat kelembapan seperti magnet.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "natrium sitrat", aliases: "sodium citrate", type: "BASIC", functionalCategory: "UMUM", benefits: "Penyeimbang pH produk.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "natrium hidroksida", aliases: "sodium hydroxide", type: "BASIC", functionalCategory: "UMUM", benefits: "Penyeimbang kadar keasaman (pH).", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "sorbitan olivate", aliases: "sorbitan oleate", type: "BASIC", functionalCategory: "UMUM", benefits: "Emulsifier alami.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "akrilamida", aliases: "acrylamide", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengental produk.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "isoheksadekana", aliases: "isohexadecane", type: "BASIC", functionalCategory: "PELEMBAP_EMOLIEN", benefits: "Pelarut dengan tekstur ringan dan kaya.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "peg-8", aliases: "", type: "BASIC", functionalCategory: "PELEMBAP_HUMEKTAN", benefits: "Bahan pengikat air.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "peg-6", aliases: "", type: "BASIC", functionalCategory: "PELEMBAP_HUMEKTAN", benefits: "Bahan pengemulsi ringan.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "trigliserida kaprilik/kaprik", aliases: "caprylic/capric triglyceride", type: "BASIC", functionalCategory: "PELEMBAP_EMOLIEN", benefits: "Emolien turunan minyak kelapa.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "polisorbat 80", aliases: "polysorbate 80", type: "BASIC", functionalCategory: "SURFAKTAN", benefits: "Pembersih dan pengemulsi.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "xylitol", aliases: "", type: "BASIC", functionalCategory: "PELEMBAP_HUMEKTAN", benefits: "Gula alkohol penarik air.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "dicaprylyl carbonate", aliases: "", type: "BASIC", functionalCategory: "PELEMBAP_EMOLIEN", benefits: "Meninggalkan lapisan lembut tak lengket.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "alkohol setearil", aliases: "cetearyl alcohol", type: "BASIC", functionalCategory: "PELEMBAP_EMOLIEN", benefits: "Fatty alcohol penstabil emulsi.", comedogenicRating: 2, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "squalane", aliases: "", type: "BASIC", functionalCategory: "PELEMBAP_EMOLIEN", benefits: "Emolien pelembap yang menyerupai sebum kulit.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "kopolimer hidroksietil akrilat/natrium akriloildimetil taurat", aliases: "hydroxyethyl acrylate/sodium acryloyldimethyl taurate copolymer", type: "BASIC", functionalCategory: "UMUM", benefits: "Pembentuk gel.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "setearil glukosida", aliases: "cetearyl glucoside", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengemulsi alami.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "gliseril stearat", aliases: "glyceryl stearate", type: "BASIC", functionalCategory: "PELEMBAP_EMOLIEN", benefits: "Mengunci kadar air.", comedogenicRating: 1, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "xanthan gum", aliases: "", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengental alami.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "polisilicon-11", aliases: "polysilicone-11", type: "BASIC", functionalCategory: "UMUM", benefits: "Meningkatkan tekstur formula.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "peg-100 stearat", aliases: "peg-100 stearate", type: "BASIC", functionalCategory: "SURFAKTAN", benefits: "Bahan pencuci dan pengemulsi.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "tokoferil asetat", aliases: "tocopheryl acetate", type: "BUFFER", functionalCategory: "UMUM", benefits: "Vitamin E antioksidan.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "ekstrak phragmites karka", aliases: "phragmites karka extract", type: "BUFFER", functionalCategory: "UMUM", benefits: "Penenang lapisan kulit.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "ekstrak poria cocos", aliases: "poria cocos extract", type: "BUFFER", functionalCategory: "UMUM", benefits: "Kaya antioksidan pelindung.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "natrium benzoat", aliases: "sodium benzoate", type: "BASIC", functionalCategory: "UMUM", benefits: "Pengawet ramah kulit.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 },
      { name: "glukosa", aliases: "glucose", type: "BASIC", functionalCategory: "PELEMBAP_HUMEKTAN", benefits: "Gula pengikat hidrasi.", comedogenicRating: 0, safeForPregnancy: true, safeForSensitive: true, isKeyActive: false, strengthLevel: 1 }
    ];

    // Eksekusi penambahan ke database (Akan mengabaikan duplikat)
    const result = await prisma.ingredientDictionary.createMany({
      // @ts-ignore
      data: ingredientsToSeed,
      skipDuplicates: true, 
    });

    return NextResponse.json({ message: `Berhasil menambahkan ${result.count} bahan ke database menggunakan standar V3!` });
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal:", error: error.message }, { status: 500 });
  }
}