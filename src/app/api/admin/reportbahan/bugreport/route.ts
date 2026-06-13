// src/app/api/admin/reportbahan/bugreport/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================================
// 1. GET: Mengambil semua laporan bug (Untuk Admin)
// ========================================================
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const adminUsername = searchParams.get("adminUsername");

    if (!adminUsername) {
      return NextResponse.json({ message: "Akses ditolak. Pengguna tidak teridentifikasi." }, { status: 401 });
    }

    // Validasi keberadaan admin di database
    const admin = await prisma.adminAccount.findUnique({
      where: { username: adminUsername }
    });

    if (!admin) {
      return NextResponse.json({ message: "Akses ditolak. Akun administrator tidak ditemukan." }, { status: 403 });
    }

    const bugReports = await prisma.bugReport.findMany({
      include: {
        user: {
          select: {
            name: true,
            email: true,
            points: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(bugReports, { status: 200 });
  } catch (error: any) {
    console.error("GET BugReport Error:", error);
    return NextResponse.json({ message: "Gagal memuat daftar laporan bug." }, { status: 500 });
  }
}

// ========================================================
// 2. POST: Membuat laporan bug baru (Untuk Pengguna/User)
// ========================================================
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ message: "Akses ditolak. Silakan masuk terlebih dahulu." }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { comment, images } = body;

    if (!comment || comment.trim() === "") {
      return NextResponse.json({ message: "Komentar laporan bug wajib diisi." }, { status: 400 });
    }

    // Pengecekan limitasi harian: Maksimal 2 laporan per hari
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const todayCount = await prisma.bugReport.count({
      where: {
        userId,
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (todayCount >= 2) {
      return NextResponse.json({ 
        message: "Batas harian tercapai. Anda hanya diperbolehkan melaporkan maksimal 2 bug per hari." 
      }, { status: 429 });
    }

    // Simpan laporan ke database
    const newReport = await prisma.bugReport.create({
      data: {
        userId,
        comment: comment.trim(),
        images: images || [],
        status: "PENDING"
      }
    });

    return NextResponse.json({
      message: "Laporan bug berhasil dikirim. Terima kasih atas kontribusi Anda!",
      data: newReport
    }, { status: 201 });

  } catch (error: any) {
    console.error("POST BugReport Error:", error);
    return NextResponse.json({ message: "Gagal mengirimkan laporan bug." }, { status: 500 });
  }
}

// ========================================================
// 3. PATCH: Mengubah status & Memberikan Reward (Dengan Keamanan Super Ketat)
// ========================================================
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { reportId, status, rewardPoints, adminUsername, adminPassword } = body;

    if (!reportId || !status || !adminUsername || !adminPassword) {
      return NextResponse.json({ message: "Parameter tidak lengkap." }, { status: 400 });
    }

    // VALIDASI KEAMANAN: Cek kecocokan password admin langsung ke database
    const admin = await prisma.adminAccount.findUnique({
      where: { username: adminUsername }
    });

    if (!admin || admin.password !== adminPassword) {
      return NextResponse.json({ message: "Autentikasi admin gagal! Sandi salah atau akun tidak valid." }, { status: 401 });
    }

    // Validasi wewenang role: Hanya SUPERADMIN atau ADMIN yang boleh merubah status
    if (admin.role !== "SUPERADMIN" && admin.role !== "ADMIN") {
      return NextResponse.json({ message: "Akses ditolak. Anda tidak memiliki izin untuk mengelola laporan bug." }, { status: 403 });
    }

    // Cari laporan bug
    const report = await prisma.bugReport.findUnique({
      where: { id: reportId },
      include: { user: true }
    });

    if (!report) {
      return NextResponse.json({ message: "Laporan bug tidak ditemukan." }, { status: 404 });
    }

    if (status === "REWARDED") {
      if (report.status === "REWARDED") {
        return NextResponse.json({ message: "Laporan bug ini sudah pernah diberikan reward koin sebelumnya." }, { status: 400 });
      }

      const pointsToReward = parseInt(rewardPoints);
      if (isNaN(pointsToReward) || pointsToReward <= 0) {
        return NextResponse.json({ message: "Jumlah poin reward tidak valid." }, { status: 400 });
      }

      // Transaksi atomik: Update status, tambah poin user, dan catat log audit admin
      await prisma.$transaction([
        prisma.bugReport.update({
          where: { id: reportId },
          data: {
            status: "REWARDED",
            reward: pointsToReward
          }
        }),
        prisma.user.update({
          where: { id: report.userId },
          data: {
            points: {
              increment: pointsToReward
            }
          }
        }),
        prisma.adminLog.create({
          data: {
            adminName: admin.username,
            adminEmail: admin.username,
            adminRole: admin.role,
            action: "UPDATE",
            entity: "USER",
            details: `MEMBERIKAN REWARD: Admin ${admin.username} menghargai laporan bug #${reportId} dari user ${report.user.email} dengan ${pointsToReward} koin poin.`
          }
        })
      ]);

      return NextResponse.json({ message: `Reward sebesar ${pointsToReward} koin berhasil dikirim ke pengguna.` }, { status: 200 });
    } else {
      // Perubahan status normal (VALID / INVALID)
      await prisma.$transaction([
        prisma.bugReport.update({
          where: { id: reportId },
          data: { status }
        }),
        prisma.adminLog.create({
          data: {
            adminName: admin.username,
            adminEmail: admin.username,
            adminRole: admin.role,
            action: "UPDATE",
            entity: "SYSTEM",
            details: `UPDATE STATUS BUG: Admin ${admin.username} mengubah status laporan bug #${reportId} menjadi ${status}.`
          }
        })
      ]);

      return NextResponse.json({ message: `Status laporan bug berhasil diperbarui menjadi ${status}.` }, { status: 200 });
    }

  } catch (error: any) {
    console.error("PATCH BugReport Error:", error);
    return NextResponse.json({ message: "Gagal memperbarui laporan bug." }, { status: 500 });
  }
}
