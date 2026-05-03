// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "@/app/dashboard/DashboardClient";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // === BELUM LOGIN: Tampilkan Dashboard dalam mode Guest ===
  if (!session || !session.user) {
    return <DashboardClient displayName="Skincare Lover" isGuest={true} />;
  }

  // === SUDAH LOGIN: Cek profil kulit ===
  const userId = (session.user as any).id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  // Jika user tidak ditemukan di DB (sudah dihapus), tampilkan sebagai guest
  if (!dbUser) {
    return <DashboardClient displayName="Skincare Lover" isGuest={true} />;
  }

  // Jika belum punya profil kulit → arahkan ke kuesioner pertama
  if (!dbUser.profile) {
    redirect("/profile/firstprofile");
  }

  // Sudah login + punya profil → Dashboard penuh
  const displayName = dbUser.name || session.user?.name || "User";
  return <DashboardClient displayName={displayName} isGuest={false} />;
}