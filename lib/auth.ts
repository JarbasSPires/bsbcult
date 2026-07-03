import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Precomputed bcrypt hash of a random placeholder (never a real password). Used to run
// bcrypt.compare() unconditionally in authorize() below, even when the user doesn't exist,
// so response timing doesn't leak whether an email is registered (timing side-channel /
// user enumeration mitigation).
const DUMMY_HASH = "$2b$10$b9BquuDHjnFxWA5LzxUwwusklQ6KRwOGCwznO4KDlTzyoR82czN5e";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        const hash = user?.passwordHash ?? DUMMY_HASH;
        const valid = await bcrypt.compare(credentials.password, hash);

        if (!user || !valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
};
