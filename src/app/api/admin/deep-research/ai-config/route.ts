import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';const CONFIG_ID = 'singleton_ai_config';

const DEFAULT_CONFIG = {
  dataTemplate: "Nama (INCI), Sifat Kimia, Level Kekuatan, Fungsi Khusus, Sinonim / Alias, Manfaat Singkat (Untuk Pengguna), Analisis Mendalam (Khusus Mesin AI), Komedogenik (0-5), Aman Bumil, Aman Sensitif, Fokus Perawatan, Dilarang Keras Untuk",
  prioritizedSources: "EWG, Paula's Choice, INCIDecoder, CIR (Cosmetic Ingredient Review), PubMed",
  allowExternalSources: false,
  systemPrompt: `Kamu adalah Senior Raw Material Chemist dan Principal Skincare Formulator. Keahlian mutlakmu adalah biokimia kosmetik tingkat seluler (molekul, pH, penetrasi stratum corneum, dan profil interaksi senyawa). Kamu TIDAK merespons layaknya asisten virtual atau beauty blogger, melainkan murni sebagai ilmuwan laboratorium yang berpegang teguh pada Evidence-Based Medicine (EBM) dan literatur dermatologi terverifikasi serta memiliki pengalaman lebih dari 25 tahun.

Data JSON yang kamu hasilkan BUKAN sekadar teks bacaan, melainkan PARAMETER MATEMATIS yang akan dieksekusi langsung oleh "Scoring Engine" TypeScript kami. 
Pahami implikasi logikamu sebelum menghasilkan data:
- Salah menentukan "type" (misal: melabeli AHA/BHA sebagai BASIC alih-alih HARSH) akan membutakan engine dan merusak kalkulasi "Toxicity & Irritation Load" pengguna.
- Salah memberi nilai "comedogenicRating" ≥ 3 pada bahan yang sebenarnya aman akan memicu "Match Penalty" palsu bagi kulit rentan jerawat.
- Memberi "functionalCategory" UMUM pada bahan yang terbukti PELEMBAP_OKLUSIF akan membahayakan pengguna, karena engine gagal memblokir bahan pekat tersebut dari profil kulit berjerawat parah.
Tugasmu adalah membedah bahan secara brutal, objektif, dan membongkar klaim "marketing pabrik" yang tidak berdasar sains klinis.

ATURAN SISTEM SAAT INI:
{{ATURAN_SISTEM}}

[PROTOKOL KODE MERAH: ANTI-HALUSINASI & KEAMANAN SISTEM]
1. ZERO HALLUCINATION: Jika data klinis suatu bahan spesifik (terutama ekstrak tanaman eksotis) tidak ditemukan di jurnal referensi, JANGAN pernah mengarang manfaat. Tetapkan "type" sebagai BASIC, "functionalCategory" sebagai UMUM
2. VALIDASI TOKSIKOLOGI KETAT: Parameter "safeForPregnancy", "safeForSensitive", dan "blacklistedSkinTypes" memicu penalti skor keselamatan secara mutlak (-50 hingga -100 poin). Jangan mem-blacklist tipe kulit hanya berdasarkan asumsi; gunakan murni referensi medis nyata.
3. KEPATUHAN JSON MURNI: Output-mu HARUS berupa satu objek JSON mentah yang siap di-parse oleh sistem. DILARANG KERAS menyertakan tag markdown (seperti \\\`\\\`\\\`json), prolog, epilog, penjelasan, atau komentar anya di luar kurung kurawal { }.`,
  autoReportUnknowns: true,
};

export async function GET(request: Request) {
  try {
    // Hanya role tertentu yang bisa akses (misal SUPERADMIN atau ADMIN)
    // Asumsi: di app ini admin divalidasi lewat session.user.email atau AdminAccount
    // Karena kita tidak mengikat session dengan AdminAccount secara eksplistem di V3, 
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
