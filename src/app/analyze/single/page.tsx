// src/app/analyze/single/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import Link from "next/link";
import SingleAnalyzer from "@/components/analyze/SingleAnalyzer";

export default async function SingleAnalyzerPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#F4F4F5] p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Tombol Kembali & Header */}
        <div className="flex flex-col space-y-4 mb-8">
          <Link href="/" className="text-sm font-medium text-gray-500 hover:text-black transition-colors w-fit flex items-center gap-2">
            <span>←</span> Kembali ke Dashboard
          </Link>
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Single Ingredient 🔬</h1>
            <p className="text-gray-500 mt-1">
              Tempelkan komposisi produkmu di bawah ini. AI akan menganalisis kecocokannya secara spesifik berdasarkan profil kulitmu.
            </p>
          </div>
        </div>

        {/* Memanggil Komponen UI */}
        <SingleAnalyzer />
        
      </div>
    </main>
  );
}