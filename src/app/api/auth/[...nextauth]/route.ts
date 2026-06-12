// app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),
    ...(process.env.NODE_ENV === "development"
      ? [
          CredentialsProvider({
            name: "Bypass",
            credentials: {
              email: { label: "Email", type: "text" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              const user = await prisma.user.findUnique({
                where: { email: credentials.email },
              });
              return user;
            },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
    maxAge: 15 * 60, // 15 menit — session JWT kedaluwarsa otomatis
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      // Validasi: cek apakah user masih ada di database
      // Ini menangani kasus user dihapus admin → session otomatis invalid
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { id: true },
          });
          if (!dbUser) {
            // User sudah dihapus dari DB → kosongkan token
            return { ...token, id: null, invalidUser: true };
          }
        } catch {
          // DB error, biarkan token tetap valid sementara
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Jika user sudah dihapus (invalidUser), jangan set session user
      if (token.invalidUser) {
        return { ...session, user: undefined } as any;
      }
      if (session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Setelah login, selalu kembali ke halaman utama (dashboard)
      // Logic pengecekan profil dilakukan di server component halaman utama
      return baseUrl;
    },
  },
  pages: {
    signIn: "/", // Halaman login = halaman utama (pop-up modal)
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };