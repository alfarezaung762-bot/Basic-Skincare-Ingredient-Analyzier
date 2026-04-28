import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runScoringEngine } from "../perhitunganlogic/scoringEngine";

export const dynamic = "force-dynamic";

function sanitize(text: string) {
  return text.replace(/[0-9]+%?/g, '').replace(/[\(\)\[\]\{\}\*]/g, '')
    .split(/[,\n;]/).map(i => i.trim().toLowerCase()).filter(i => i.length > 2);
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

    const [dictionary, allCatalogProducts] = await Promise.all([
      prisma.ingredientDictionary.findMany(),
      prisma.productCatalog.findMany({
        include: { reviews: { include: { user: true } } }
      })
    ]);

    const catalogProducts = allCatalogProducts.filter(p => 
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

    if (userListArray.length === 0) return NextResponse.json([], { status: 200 });

    const recommendations = catalogProducts.map((product) => {
      const productRawList = sanitize(product.komposisiAsli);
      const productStandardizedNames = new Set<string>();

      productRawList.forEach(raw => {
        const match = dictionary.find(d => 
          isFuzzyMatch(raw, d.name) || (d.aliases && d.aliases.split(',').some(a => isFuzzyMatch(raw, a.trim().toLowerCase())))
        );
        if (match) productStandardizedNames.add(match.name);
      });

      let matchCount = 0;
      userListArray.forEach(uName => {
        if (productStandardizedNames.has(uName)) matchCount++;
      });

      const similarity = Math.round((matchCount / userListArray.length) * 100);

      const analysis = runScoringEngine(userProfile, {
        productName: product.namaProduk,
        productType: product.tipeProduk as any,
        ingredientsRaw: product.komposisiAsli
      }, dictionary as any);

      return {
        ...product,
        similarity,
        matchScore: analysis.matchScore,
        safetyScore: analysis.safetyScore,
        komposisiAsli: product.komposisiAsli,
        reviews: product.reviews,
        rating: product.reviews.length > 0 ? product.reviews.reduce((acc: any, r: any) => acc + r.rating, 0) / product.reviews.length : 0
      };
    });

    // Filter kemiripan minimal 0% (semua muncul dulu untuk test)
    const finalResult = recommendations
      .filter(p => p.similarity >= 0) 
      .sort((a, b) => {
        if (a.isPinKreator !== b.isPinKreator) return a.isPinKreator ? -1 : 1;
        return b.similarity - a.similarity;
      });

    return NextResponse.json(finalResult, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}