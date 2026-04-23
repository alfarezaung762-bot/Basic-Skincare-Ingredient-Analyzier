// app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true, // Tambahkan baris ini
    }),
  ],
  session: {
    strategy: "jwt",
  },
 callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id; 
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // PERBAIKAN: Biarkan user kembali ke beranda (Home) secara default setelah login
      return baseUrl;
    },
  },
  pages: {
    signIn: "/", // Kita letakkan tombol login di halaman utama (Home)
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };