// scratch/fix_remaining.js
// Fix 3 produk yang namanya punya leading space di DB
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const REMAINING_FIXES = [
  {
    search: "LABORE AcnePro Biome Sebum Mousse",
    targetSkinTypes: "Berminyak,Kombinasi,Sensitif",
  },
  {
    search: "NIVEA Sparkling Bright Facial Foam",
    targetSkinTypes: "Berminyak,Kombinasi,Normal",
  },
  {
    search: "Skintific Niacinamide Brightening",
    targetSkinTypes: "Berminyak,Kombinasi,Normal,Sensitif",
  },
];

async function main() {
  for (const fix of REMAINING_FIXES) {
    // Cari dengan contains (menangani leading space)
    const product = await prisma.productCatalog.findFirst({
      where: { namaProduk: { contains: fix.search } },
    });

    if (!product) {
      console.log(`⚠️  SKIP: "${fix.search}" tidak ditemukan`);
      continue;
    }

    if (product.targetSkinTypes && product.targetSkinTypes.trim() !== "") {
      console.log(`⏭️  SKIP: "${product.namaProduk}" sudah ada targetSkinTypes: ${product.targetSkinTypes}`);
      continue;
    }

    await prisma.productCatalog.update({
      where: { id: product.id },
      data: { targetSkinTypes: fix.targetSkinTypes },
    });
    console.log(`✅ UPDATED: "${product.namaProduk}" → ${fix.targetSkinTypes}`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
