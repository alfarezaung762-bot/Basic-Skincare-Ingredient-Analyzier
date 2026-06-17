// scratch/audit_catalog.js
// Audit produk katalog: cek yang belum punya targetSkinTypes atau fokusProduk
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const products = await prisma.productCatalog.findMany({
    select: {
      id: true,
      namaProduk: true,
      tipeProduk: true,
      fokusProduk: true,
      targetSkinTypes: true,
      komposisiAsli: true,
    },
    orderBy: { namaProduk: "asc" },
  });

  console.log(`\n=== TOTAL PRODUK: ${products.length} ===\n`);

  const missing = [];

  products.forEach((p) => {
    const hasFocus = p.fokusProduk && p.fokusProduk.trim() !== "";
    const hasSkinType = p.targetSkinTypes && p.targetSkinTypes.trim() !== "";
    
    const issues = [];
    if (!hasFocus) issues.push("FOKUS KOSONG");
    if (!hasSkinType) issues.push("SKIN TYPE KOSONG");

    if (issues.length > 0) {
      missing.push({ ...p, issues });
    }

    // Print semua produk dengan status
    const statusFocus = hasFocus ? `✅ ${p.fokusProduk}` : "❌ KOSONG";
    const statusSkin = hasSkinType ? `✅ ${p.targetSkinTypes}` : "❌ KOSONG";
    console.log(`[${p.tipeProduk}] ${p.namaProduk}`);
    console.log(`   Fokus: ${statusFocus}`);
    console.log(`   Skin:  ${statusSkin}`);
    console.log("");
  });

  console.log(`\n=== PRODUK BERMASALAH: ${missing.length} dari ${products.length} ===\n`);
  missing.forEach((m) => {
    console.log(`❌ ${m.namaProduk} (${m.tipeProduk}) -> ${m.issues.join(", ")}`);
    // tampilkan 5 bahan pertama sebagai clue
    const ingredients = m.komposisiAsli.split(",").slice(0, 5).map(i => i.trim()).join(", ");
    console.log(`   Bahan awal: ${ingredients}`);
    console.log("");
  });

  await prisma.$disconnect();
}

main().catch(console.error);
