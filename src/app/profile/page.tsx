// src/app/profile/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ProfileForm from "@/components/profile/ProfileForm";

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    redirect("/");
  }

  const userId = (session.user as any).id;

  // 1. Ambil data User dan Profile secara bersamaan dari Database
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true } // Mengambil data profil yang terhubung
  });

  if (!userRecord) {
    redirect("/");
  }

  // 2. Siapkan data awal untuk Form
  const initialData = {
    name: userRecord.name || "",
    skinType: userRecord.profile?.skinType,
    age: userRecord.profile?.age,
    severity: userRecord.profile?.severity,
    primaryFocus: userRecord.profile?.primaryFocus,
    allergies: userRecord.profile?.allergies,
    isPregnantOrNursing: userRecord.profile?.isPregnantOrNursing,
  };

  return (
    <main className="min-h-screen p-6 flex flex-col items-center justify-center font-sans py-12 relative overflow-hidden">
      {/* Ambient Blobs */}
      <div className="ambient-blob ambient-blob-1" />
      <div className="ambient-blob ambient-blob-2" />
      <div className="ambient-blob ambient-blob-3" />

      <div className="max-w-2xl w-full mb-8 text-center space-y-2 relative z-10">
        <div className="inline-flex items-center gap-2 glass-card px-4 py-1.5 rounded-full text-xs font-bold text-teal-600 mb-4">
          <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
          Profil Kulit
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">
          <span className="gradient-text">Lengkapi Profil Kulitmu</span> ✨
        </h1>
        <p className="text-slate-500 font-medium">
          Bantu AI memahami kondisi kulitmu secara spesifik untuk hasil analisis yang personal dan akurat.
        </p>
      </div>
      
      {/* Sekarang data dikirim langsung dari Database! */}
      <ProfileForm initialData={initialData as any} />
    </main>
  );
}