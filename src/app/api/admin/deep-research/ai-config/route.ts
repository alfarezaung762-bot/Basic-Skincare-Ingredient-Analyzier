import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';const CONFIG_ID = 'singleton_ai_config';

const DEFAULT_CONFIG = {
  dataTemplate: "Nama (INCI), Sifat Kimia, Level Kekuatan, Fungsi Khusus, Sinonim / Alias, Manfaat Singkat (Untuk Pengguna), Analisis Mendalam (Khusus Mesin AI), Komedogenik (0-5), Aman Bumil, Aman Sensitif, Fokus Perawatan, Dilarang Keras Untuk",
  prioritizedSources: "EWG, Paula's Choice, INCIDecoder, CIR (Cosmetic Ingredient Review), PubMed",
  allowExternalSources: false,
  systemPrompt: `Anda adalah asisten AI Skincare Analyst tingkat lanjut di tahun 2026. Tugas Anda adalah mencari data bahan skincare yang sangat akurat.

ATURAN SISTEM SAAT INI:
{{ATURAN_SISTEM}}

PENTING:
1. Pastikan data se-akurat dan se-up-to-date mungkin.
2. Jawab HANYA menggunakan struktur JSON yang diminta.`,
  autoReportUnknowns: true,
};

export async function GET(request: Request) {
  try {
    // Hanya role tertentu yang bisa akses (misal SUPERADMIN atau ADMIN)
    // Asumsi: di app ini admin divalidasi lewat session.user.email atau AdminAccount
    // Karena kita tidak mengikat session dengan AdminAccount secara eksplisit di V3, 
    // kita akan lewati pengecekan RBAC strict di route ini, asalkan user terautentikasi (seperti route admin lain)

    let config = await prisma.aIPromptConfig.findUnique({
      where: { id: CONFIG_ID },
    });

    if (!config) {
      // Create default if not exists
      config = await prisma.aIPromptConfig.create({
        data: {
          id: CONFIG_ID,
          ...DEFAULT_CONFIG,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error fetching AI Config:', error);
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      dataTemplate, prioritizedSources, allowExternalSources, systemPrompt,
      // AI Hybrid fields
      aihybridPromptingredient, aihybridModelPriority, aihybridUseExternalSources, aihybridReferenceSources,
      autoReportUnknowns
    } = body;

    const updateData: any = {};
    if (dataTemplate !== undefined) updateData.dataTemplate = dataTemplate;
    if (prioritizedSources !== undefined) updateData.prioritizedSources = prioritizedSources;
    if (allowExternalSources !== undefined) updateData.allowExternalSources = allowExternalSources;
    if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;
    // AI Hybrid
    if (aihybridPromptingredient !== undefined) updateData.aihybridPromptingredient = aihybridPromptingredient;
    if (aihybridModelPriority !== undefined) updateData.aihybridModelPriority = aihybridModelPriority;
    if (aihybridUseExternalSources !== undefined) updateData.aihybridUseExternalSources = aihybridUseExternalSources;
    if (aihybridReferenceSources !== undefined) updateData.aihybridReferenceSources = aihybridReferenceSources;
    if (autoReportUnknowns !== undefined) updateData.autoReportUnknowns = autoReportUnknowns;

    const config = await prisma.aIPromptConfig.upsert({
      where: { id: CONFIG_ID },
      update: updateData,
      create: {
        id: CONFIG_ID,
        dataTemplate: dataTemplate || DEFAULT_CONFIG.dataTemplate,
        prioritizedSources: prioritizedSources || DEFAULT_CONFIG.prioritizedSources,
        allowExternalSources: allowExternalSources ?? DEFAULT_CONFIG.allowExternalSources,
        systemPrompt: systemPrompt || DEFAULT_CONFIG.systemPrompt,
        aihybridPromptingredient: aihybridPromptingredient || "",
        aihybridModelPriority: aihybridModelPriority || null,
        aihybridUseExternalSources: aihybridUseExternalSources ?? false,
        aihybridReferenceSources: aihybridReferenceSources || null,
        autoReportUnknowns: autoReportUnknowns ?? DEFAULT_CONFIG.autoReportUnknowns,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Error updating AI Config:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}
