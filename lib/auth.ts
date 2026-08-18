import NextAuth from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authConfig } from '../auth.config';

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user, profile }) {
      const email = user.email ?? (profile?.email as string);
      const fullName = user.name ?? (profile?.name as string) ?? email?.split('@')[0] ?? 'Unknown';

      if (!email) return false;

      // Auto-provision: upsert user into our users table
      await prisma.user.upsert({
        where: { email },
        update: { fullName },
        create: { email, fullName },
      });

      return true;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, email: true, fullName: true },
        });
        if (dbUser) {
          session.user.id = dbUser.id;
          session.user.name = dbUser.fullName;
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true },
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
  },
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
});
