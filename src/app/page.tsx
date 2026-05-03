// src/app/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { LoginButton } from "@/components/AuthButtons";
import { redirect } from "next/navigation";

export default async function HomePage() {
  // Mengecek sesi login di sisi server (Server-Side Rendering)
  const session = await getServerSession(authOptions);

  // Jika BELUM login: Tampilkan Landing Page Minimalis
  if (!session) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 font-sans text-center">
        <div className="max-w-xl w-full space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900">
              SkinTech <span className="text-gray-400">Analyzer</span>
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed">
              Pahami setiap tetes skincare Anda. Analisis kecocokan bahan dengan teknologi AI berdasarkan profil unik kulit Anda.
            </p>
          </div>
          <div className="flex justify-center pt-4">
            <LoginButton />
          </div>
        </div>
      </main>
    );
  }

  // Jika SUDAH login: Langsung arahkan ke dashboard baru
  redirect("/dashboard");
}