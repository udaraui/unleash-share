import type { NextAuthConfig } from 'next-auth';
import AzureAD from 'next-auth/providers/microsoft-entra-id';

export const authConfig = {
  providers: [
    AzureAD({
      clientId: process.env.AZURE_CLIENT_ID!,
      clientSecret: process.env.AZURE_CLIENT_SECRET!,
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
} satisfies NextAuthConfig;
