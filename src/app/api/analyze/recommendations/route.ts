import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runScoringEngine } from "../perhitunganlogic/scoringEngine";

export const dynamic = "force-dynamic";

function sanitize(text: string) {
  const parts = text.replace(/[0-9]+%?/g, '').split(/[,;\n](?![^()]*\))/g);
  return parts.map(i => i.replace(/[\(\)\[\]\{\}\*]/g, '').replace(/[\u200b\u200c\u200d\ufeff]/g, '').replace(/\u00a0/g, ' ').trim().toLowerCase()).filter(i => i.length > 2);
}

function levenshtein(a: string, b: string): number {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
  for (let j = 0; j <= a.length; j++) { matrix[0][j] = j; }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
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
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ingredientsRaw, productType, userProfile } = body;

    const [dictionary, catalogProductsData] = await Promise.all([
      prisma.ingredientDictionary.findMany(),
      prisma.productCatalog.findMany({
        include: { 
          reviews: { 
            where: { isDeleted: false },
            include: { user: true } 
          } 
        }
      })
    ]);

    const catalogProducts = catalogProductsData.filter(p => 
      p.tipeProduk.toUpperCase() === productType.toUpperCase()
    );

    const userRawList = sanitize(ingredientsRaw);
    const userStandardizedNames = new Set<string>();

    userRawList.forEach(raw => {
      const match = dictionary.find(d => 
        isFuzzyMatch(raw, d.name) || (d.aliases && d.aliases.split(',').some(a => isFuzzyMatch(raw, a.trim().toLowerCase())))
      );
      if (match) userStandardizedNames.add(match.name);
    });

    const userListArray = Array.from(userStandardizedNames);
    const userBahanCount = userListArray.length;

    if (userBahanCount === 0) return NextResponse.json([], { status: 200 });

    const recommendations = catalogProducts.map((product) => {
      const productRawList = sanitize(product.komposisiAsli);
      const productStandardizedNames = new Set<string>();

      productRawList.forEach(raw => {
        const match = dictionary.find(d => 
          isFuzzyMatch(raw, d.name) || (d.aliases && d.aliases.split(',').some(a => isFuzzyMatch(raw, a.trim().toLowerCase())))
        );
        if (match) productStandardizedNames.add(match.name);
      });

      const productBahanCount = productStandardizedNames.size;

      // === SIMILARITY V2: dengan penalti bahan berlebih ===
      let matchCount = 0;
      userListArray.forEach(uName => {
        if (productStandardizedNames.has(uName)) matchCount++;
      });

      // Base similarity: berapa % bahan user yang tercakup di produk katalog
      const baseSimilarity = (matchCount / userBahanCount) * 100;

      // Penalti kelebihan bahan: setiap bahan ekstra di katalog yang TIDAK ada di user, -3%
      const extraIngredients = Math.max(0, productBahanCount - matchCount);
      const excessPenalty = extraIngredients * 3;

      // Bonus jika jumlah bahan sangat mirip (±3 bahan)
      const sizeDiff = Math.abs(productBahanCount - userBahanCount);
      const sizeBonus = sizeDiff <= 3 ? 5 : 0;

      // Final similarity score (clamped 0-100)
      const similarity = Math.max(0, Math.min(100, Math.round(baseSimilarity - excessPenalty + sizeBonus)));

      // Scoring engine untuk matchScore & safetyScore
      const analysis = runScoringEngine(userProfile, {
        productName: product.namaProduk,
        productType: product.tipeProduk as any,
        ingredientsRaw: product.komposisiAsli
      }, dictionary as any);

      const avgRating = product.reviews.length > 0 
        ? product.reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / product.reviews.length 
        : 0;

      return {
        ...product,
        similarity,
        matchScore: analysis.matchScore,
        safetyScore: analysis.safetyScore,
        komposisiAsli: product.komposisiAsli,
        reviews: product.reviews,
        rating: avgRating,
      };
    });

    // Kembalikan semua produk dalam kategori terpilih untuk diproses di tab UI (misal: Rating Tertinggi)
    const finalResult = recommendations
      .sort((a, b) => {
        if (a.isPinKreator !== b.isPinKreator) return a.isPinKreator ? -1 : 1;
        return b.similarity - a.similarity;
      });

    return NextResponse.json(finalResult, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}