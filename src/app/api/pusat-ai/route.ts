// src/app/api/pusat-ai/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: Mengambil riwayat cache atau statistik jumlah cache per model
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countsOnly = searchParams.get("countsOnly") === "true";
    const downloadPrompt = searchParams.get("downloadPrompt") === "true";
    const id = searchParams.get("id");

    if (id && downloadPrompt) {
      const item = await prisma.aiHybridCache.findUnique({
        where: { id }
      });
      if (!item) {
        return NextResponse.json({ message: "Cache tidak ditemukan." }, { status: 404 });
      }

      let content = "";
      if (item.systemPromptUsed) {
        content = item.systemPromptUsed;
      } else {
        content = `==================================================\n`;
        content += `PROMPT AI-HYBRID ANALYSIS (CACHE LAMA)\n`;
        content += `==================================================\n`;
        content += `Informasi: Entri cache ini dibuat sebelum fitur perekaman prompt diaktifkan.\n\n`;
        content += `[DATA REKONSTRUKSI MINIMAL]\n`;
        content += `- ID Cache: ${item.id}\n`;
        content += `- Model AI: ${item.modelUsed}\n`;
        content += `- Tanggal Analisis: ${item.createdAt}\n`;
        content += `- Tipe Produk: ${item.productType || "-"}\n`;
        content += `- Bahan Input: ${item.ingredientsInput}\n\n`;
        content += `Respons AI (JSON):\n`;
        content += JSON.stringify(item.aiResponse, null, 2);
      }

      const safeName = item.ingredientsInput.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30);
      const filename = `prompt-aihybrid-${item.modelUsed}-${safeName}.txt`;

      return new Response(content, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (countsOnly) {
      // Kelompokkan cache berdasarkan model dan hitung jumlahnya
      const groups = await prisma.aiHybridCache.groupBy({
        by: ["modelUsed"],
        _count: {
          _all: true,
        },
      });

      // Ubah format ke key-value map: { [modelName]: count }
      const counts = groups.reduce((acc, curr) => {
        acc[curr.modelUsed] = curr._count._all;
        return acc;
      }, {} as Record<string, number>);

      return NextResponse.json({ counts }, { status: 200 });
    }

    // Jika biasa, ambil semua riwayat cache diurutkan tanggal terbaru
    const history = await prisma.aiHybridCache.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(history, { status: 200 });
  } catch (error: any) {
    console.error("GET AI-Hybrid Cache History Error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data riwayat cache." },
      { status: 500 }
    );
  }
}

// DELETE: Menghapus cache (satu entri, massal berdasarkan model, atau seluruhnya)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "true";
    const model = searchParams.get("model");

    if (id) {
      // Hapus satu entri spesifik
      await prisma.aiHybridCache.delete({
        where: { id },
      });
      return NextResponse.json({ message: "Berhasil menghapus entri cache spesifik." }, { status: 200 });
    }

    if (all) {
      // Bersihkan seluruh cache
      await prisma.aiHybridCache.deleteMany({});
      return NextResponse.json({ message: "Berhasil membersihkan seluruh data cache." }, { status: 200 });
    }

    if (model) {
      // Hapus cache berdasarkan kategori model
      await prisma.aiHybridCache.deleteMany({
        where: { modelUsed: model },
      });
      return NextResponse.json({ message: `Berhasil menghapus seluruh cache untuk model ${model}.` }, { status: 200 });
    }

    return NextResponse.json(
      { message: "Parameter penghapusan tidak valid." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("DELETE AI-Hybrid Cache Error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus data cache." },
      { status: 500 }
    );
  }
}
