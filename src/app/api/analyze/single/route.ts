// src/app/api/analyze/single/route.ts
// SISTEM CEPAT (FAST MODE ONLY) — Tanpa AI, murni Engine V5
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { runScoringEngine, UserProfile, ProductInput } from "../perhitunganlogic/scoringEngine";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Harap login terlebih dahulu." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { productName, productType, ingredients } = await req.json();

    if (!ingredients) {
      return NextResponse.json({ message: "Komposisi (ingredients) tidak boleh kosong." }, { status: 400 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
    });

    if (!profile) {
      return NextResponse.json({ message: "Harap isi profil kulit Anda terlebih dahulu di menu Profil." }, { status: 400 });
    }

    const dictionary = await prisma.ingredientDictionary.findMany();

    const userProfileInput: UserProfile = {
      skinType: profile.skinType,
      age: profile.age,
      isPregnantOrNursing: profile.isPregnantOrNursing,
      severity: profile.severity,
      primaryFocus: profile.primaryFocus,
      allergies: profile.allergies || "",
    };

    const productInput: ProductInput = {
      productName: productName || "Produk Tanpa Nama",
      productType: productType,
      ingredientsRaw: ingredients,
    };

    const engineResult = runScoringEngine(userProfileInput, productInput, dictionary);

    // Fallback statis (tanpa AI)
    const analysisData = {
      matchExplanation: engineResult.matchFlags.length > 0
        ? engineResult.matchFlags.map(f => `${f.type === "CRITICAL" ? "🚨" : f.type === "WARNING" ? "⚠️" : f.type === "SUCCESS" ? "✅" : "ℹ️"} ${f.message}`).join('\n')
        : "✅ Produk ini terpantau ideal dan tidak memiliki kandungan yang bertentangan dengan kebutuhan kecocokan profil Anda.",

      safetyExplanation: engineResult.safetyFlags.length > 0
        ? engineResult.safetyFlags.map(f => `${f.type === "CRITICAL" ? "🚨" : f.type === "WARNING" ? "⚠️" : f.type === "SUCCESS" ? "✅" : "ℹ️"} ${f.message}`).join('\n')
        : "✅ Berdasarkan kalkulasi sistem pusat, tidak ditemukan bahan keras atau toksik yang berisiko mengiritasi profil kulit Anda.",

      aiUnknownAnalysis: engineResult.unknownIngredients.length > 0
        ? "⚠️ Sistem mendeteksi bahan asing yang belum diverifikasi oleh database kami. Pada Mode Sistem Cepat, AI dinonaktifkan sehingga evaluasi mendalam untuk bahan asing dilewati. Harap waspada jika Anda memiliki riwayat alergi."
        : "✅ Seluruh bahan dalam formulasi ini telah terdaftar resmi dan terverifikasi di database medis kami.",

      recommendations: [
        "Mode Sistem Cepat sedang aktif. Analisis naratif AI dimatikan untuk mempercepat hasil.",
        "Skor persentase yang Anda lihat dijamin 100% akurat karena dihitung langsung oleh algoritma medis pusat kami.",
        "Lakukan patch test (uji tempel) di area rahang jika ini adalah produk baru bagi Anda."
      ]
    };

    // Simpan ke History
    const savedHistory = await prisma.analysisHistory.create({
      data: {
        userId: userId,
        productName: productName || "Produk Analisis",
        productType: productType,
        ingredientsInput: ingredients,
        matchScore: engineResult.matchScore,
        safetyScore: engineResult.safetyScore,
        aiResponse: analysisData,
      }
    });

    return NextResponse.json({
      engineResult: engineResult,
      analysis: analysisData,
      historyId: savedHistory.id
    }, { status: 200 });

  } catch (error: any) {
    console.error("Endpoint Error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan sistem fatal saat memproses data." },
      { status: 500 }
    );
  }
}