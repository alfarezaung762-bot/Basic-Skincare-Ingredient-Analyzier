import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSubscriptionConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getSubscriptionConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json({ message: "Gagal mengambil data konfigurasi." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      adminUsername,
      pricePro, 
      pointsPro, 
      priceProPlus, 
      pointsProPlus, 
      initialPoints, 
      dailyRefresh, 
      costFast, 
      costHybrid 
    } = body;

    // Keamanan Gating: Validasi user pembuat request adalah SUPERADMIN
    if (!adminUsername) {
      return NextResponse.json({ message: "Akses ditolak. Username administrator tidak sah." }, { status: 401 });
    }

    const admin = await prisma.adminAccount.findUnique({
      where: { username: adminUsername }
    });

    if (!admin || admin.role !== "SUPERADMIN") {
      return NextResponse.json({ message: "Akses ditolak. Hanya SUPERADMIN yang dapat mengubah konfigurasi ini." }, { status: 403 });
    }

    // Update singleton config
    const updated = await prisma.subscriptionConfig.update({
      where: { id: "singleton_sub_config" },
      data: {
        pricePro: Number(pricePro),
        pointsPro: Number(pointsPro),
        priceProPlus: Number(priceProPlus),
        pointsProPlus: Number(pointsProPlus),
        initialPoints: Number(initialPoints),
        dailyRefresh: Number(dailyRefresh),
        costFast: Number(costFast),
        costHybrid: Number(costHybrid),
      }
    });

    // Catat log admin
    await prisma.adminLog.create({
      data: {
        adminName: admin.username,
        adminEmail: admin.username,
        adminRole: "SUPERADMIN",
        action: "UPDATE",
        entity: "SUBSCRIBTION_CONFIG",
        details: `Memperbarui konfigurasi langganan: Pro (${pointsPro} pts/Rp ${pricePro}), Pro Plus (${pointsProPlus} pts/Rp ${priceProPlus}), Awal: ${initialPoints}, Harian: ${dailyRefresh}, Biaya Cepat: ${costFast}, Biaya Hybrid: ${costHybrid}`
      }
    });

    return NextResponse.json({ message: "Konfigurasi berhasil disimpan!", config: updated }, { status: 200 });

  } catch (error: any) {
    console.error("API POST Config Error:", error);
    return NextResponse.json({ message: "Terjadi kesalahan pada server saat memperbarui konfigurasi." }, { status: 500 });
  }
}
