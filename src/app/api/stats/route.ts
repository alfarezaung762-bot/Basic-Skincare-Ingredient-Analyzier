// src/app/api/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [ingredientCount, productCount] = await Promise.all([
      prisma.ingredientDictionary.count(),
      prisma.productCatalog.count(),
    ]);

    return NextResponse.json({
      ingredientCount,
      productCount,
    }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (error: any) {
    console.error("Gagal mengambil statistik:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
