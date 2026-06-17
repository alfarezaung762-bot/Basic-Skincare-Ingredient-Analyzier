// scratch/fix_catalog.js
// Migrasi: Isi targetSkinTypes yang kosong + perbaiki nama fokus lama di DB
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// === 1. MAPPING targetSkinTypes untuk 12 produk yang kosong ===
// Basis: analisis komposisi bahan (surfaktan, pH, buffer, soothing agents)
const SKIN_TYPE_FIXES = [
  {
    namaProduk: "LABORE AcnePro Biome Sebum Mousse",
    targetSkinTypes: "Berminyak,Kombinasi,Sensitif",
    // Alasan: Disodium Cocoyl Glutamate (surfaktan lembut), Niacinamide (sebum control), Bifida Ferment Lysate (soothing)
  },
  {
    namaProduk: "NIVEA Sparkling Bright Facial Foam",
    targetSkinTypes: "Berminyak,Kombinasi,Normal",
    // Alasan: Myristic Acid + Palmitic Acid (surfaktan cukup kuat), Propylene Glycol → tidak cocok sensitif/kering
  },
  {
    namaProduk: "Skintific Niacinamide Brightening",
    targetSkinTypes: "Berminyak,Kombinasi,Normal,Sensitif",
    // Alasan: Sodium Cocoyl Glycinate (surfaktan ultra lembut), Tranexamic Acid, Amino Acid → aman sensitif
  },
  {
    namaProduk: "Cetaphil",
    targetSkinTypes: "Berminyak,Kering,Kombinasi,Normal,Sensitif",
    // Alasan: Cetaphil Gentle Cleanser dikenal semua jenis kulit, Panthenol + Niacinamide, pH balanced
  },
  {
    namaProduk: "Clean & Clear Foaming Face Wash",
    targetSkinTypes: "Berminyak,Kombinasi",
    // Alasan: Triethanolamine + Myristic Acid + Lauric Acid (surfaktan kuat) → tidak cocok sensitif/kering
  },
  {
    namaProduk: "COSRX Low pH Good Morning Gel",
    targetSkinTypes: "Berminyak,Kombinasi,Normal,Sensitif",
    // Alasan: pH rendah (5.0-6.0), Cocamidopropyl Betaine (surfaktan lembut), Tea Tree Oil → gentle acne control
  },
  {
    namaProduk: "Glow & Lovely DermaGlow Facial Foam",
    targetSkinTypes: "Berminyak,Kombinasi,Normal",
    // Alasan: Myristic Acid + Potassium Hydroxide (foam kuat), Glycerin pelembap → tidak cocok sensitif/kering
  },
  {
    namaProduk: "Hada Labo Gokujyun Ultimate Face Wash",
    targetSkinTypes: "Berminyak,Kering,Kombinasi,Normal,Sensitif",
    // Alasan: Sodium Cocoyl Glycinate (ultra gentle), Hyaluronic Acid, pH balanced → all skin types
  },
  {
    namaProduk: "Hada Labo Tamagohada Mild Peeling",
    targetSkinTypes: "Berminyak,Kombinasi,Normal",
    // Alasan: AHA peeling → eksfoliasi aktif, tidak cocok sensitif/kering
  },
  {
    namaProduk: "LABORE GentleBiome Mild Cleanser",
    targetSkinTypes: "Berminyak,Kering,Kombinasi,Normal,Sensitif",
    // Alasan: Bifida Ferment Lysate, Allantoin (soothing), formulasi sangat gentle → semua jenis kulit
  },
  {
    namaProduk: "Somethinc Low pH Gentle Jelly Cleanser",
    targetSkinTypes: "Berminyak,Kombinasi,Normal,Sensitif",
    // Alasan: Low pH, Potassium Cocoyl Glutamate (surfaktan lembut), Acrylates Copolymer → gentle
  },
  {
    namaProduk: "True to Skin Matcha Oat Gentle Cleanser",
    targetSkinTypes: "Berminyak,Kering,Kombinasi,Normal,Sensitif",
    // Alasan: Potassium Cocoyl Hydrolyzed Collagen (ultra gentle), Matcha + Oat (soothing) → all skin types
  },
];

// === 2. MAPPING nama fokus lama → baru ===
const FOCUS_RENAME_MAP = {
  "Merawat Jerawat & Sebum": "Mengatasi Jerawat & Mengontrol Sebum",
  "Anti-Aging & Garis Halus": "Mengencangkan & Menyamarkan Garis Halus",
  "Eksfoliasi & Tekstur Pori-pori": "Eksfoliasi & Mengurangi Tampilan Pori-pori",
  "Eksfoliasi & Mengurangi Penampakan Pori-pori": "Eksfoliasi & Mengurangi Tampilan Pori-pori",
};

async function main() {
  console.log("\n=== MIGRASI DATABASE KATALOG PRODUK ===\n");

  // Step 1: Fix targetSkinTypes yang kosong
  console.log("--- STEP 1: Isi targetSkinTypes yang kosong ---\n");
  for (const fix of SKIN_TYPE_FIXES) {
    const product = await prisma.productCatalog.findFirst({
      where: { namaProduk: fix.namaProduk },
    });

    if (!product) {
      console.log(`⚠️  SKIP: Produk "${fix.namaProduk}" tidak ditemukan di DB`);
      continue;
    }

    if (product.targetSkinTypes && product.targetSkinTypes.trim() !== "") {
      console.log(`⏭️  SKIP: "${fix.namaProduk}" sudah ada targetSkinTypes: ${product.targetSkinTypes}`);
      continue;
    }

    await prisma.productCatalog.update({
      where: { id: product.id },
      data: { targetSkinTypes: fix.targetSkinTypes },
    });
    console.log(`✅ UPDATED: "${fix.namaProduk}" → targetSkinTypes: ${fix.targetSkinTypes}`);
  }

  // Step 2: Fix nama fokus lama di fokusProduk
  console.log("\n--- STEP 2: Perbaiki nama fokus lama ---\n");
  const allProducts = await prisma.productCatalog.findMany({
    select: { id: true, namaProduk: true, fokusProduk: true },
  });

  for (const product of allProducts) {
    if (!product.fokusProduk) continue;

    let updatedFocus = product.fokusProduk;
    let changed = false;

    for (const [oldName, newName] of Object.entries(FOCUS_RENAME_MAP)) {
      if (updatedFocus.includes(oldName)) {
        updatedFocus = updatedFocus.replace(new RegExp(oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g"), newName);
        changed = true;
      }
    }

    if (changed) {
      await prisma.productCatalog.update({
        where: { id: product.id },
        data: { fokusProduk: updatedFocus },
      });
      console.log(`✅ RENAMED: "${product.namaProduk}"`);
      console.log(`   LAMA: ${product.fokusProduk}`);
      console.log(`   BARU: ${updatedFocus}\n`);
    }
  }

  console.log("\n=== MIGRASI SELESAI ===\n");
  await prisma.$disconnect();
}

main().catch(console.error);
