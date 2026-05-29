import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { adminName, adminEmail, adminRole, action, entity, details } = body;

    const newLog = await prisma.adminLog.create({
      data: {
        adminName: adminName || "Unknown",
        adminEmail: adminEmail || "Unknown",
        adminRole: adminRole || "VIEWER",
        action: action || "UNKNOWN",
        entity: entity || "UNKNOWN",
        details: details || "-",
      },
    });

    // Auto-delete history jika melebihi 100 entri
    const logCount = await prisma.adminLog.count();
    if (logCount > 100) {
      const logsToDelete = await prisma.adminLog.findMany({
        orderBy: { createdAt: "asc" },
        take: logCount - 100,
        select: { id: true },
      });
      
      const idsToDelete = logsToDelete.map(l => l.id);
      await prisma.adminLog.deleteMany({
        where: { id: { in: idsToDelete } }
      });
    }

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error("POST AdminLog Error:", error);
    return NextResponse.json({ message: `Gagal menyimpan log: ${error.message}` }, { status: 500 });
  }
}

export async function GET() {
  try {
    const adminLogs = await prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
    });

    const aiLogs = await prisma.aiAdjustmentLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100, // Limit to 100 recent
    });

    // Map AI Logs to match AdminLog format for the frontend
    const mappedAiLogs = aiLogs.map(ai => ({
      id: ai.id,
      adminName: "AI Hybrid Engine",
      adminEmail: ai.modelUsed,
      adminRole: "AI",
      action: "ADJUST",
      entity: "AI_ADJUSTMENT",
      details: `[${ai.targetScore}] Mengurangi penalti bahan ${ai.triggerIngredient} dari ${ai.originalPenalty} menjadi ${ai.adjustedPenalty} (-${ai.pointsRestored} pts). Produk: ${ai.productName}. Alasan: ${ai.reasoning}`,
      createdAt: ai.createdAt,
    }));

    const combined = [...adminLogs, ...mappedAiLogs].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json(combined, { status: 200 });
  } catch (error: any) {
    console.error("GET AdminLog Error:", error.message);
    return NextResponse.json({ message: "Gagal mengambil data log admin" }, { status: 500 });
  }
}
