import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  const userId = (session.user as any).id;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true }
  });

  if (!dbUser?.profile) {
    redirect("/profile/firstprofile");
  }

  const displayName = dbUser?.name || session.user?.name || "User";

  return <DashboardClient displayName={displayName} />;
}
