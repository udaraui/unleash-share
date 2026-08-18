import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST /api/shares/external/verify — client submits their token/password to get an auth cookie
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { slug, password, token } = body as { slug: string; password?: string; token?: string };
  const authToken = token || password;

  if (!slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const share = await prisma.externalShare.findUnique({
    where: { urlSlug: slug },
    include: { asset: true },
  });

  if (!share) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (share.expiresAt && new Date() > share.expiresAt) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 });
  }

  if (share.authMethod === 'PASSWORD') {
    if (!authToken || !share.hashedPassword) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }
    const valid = await bcrypt.compare(authToken, share.hashedPassword);
    if (!valid) return NextResponse.json({ error: 'Invalid access token' }, { status: 401 });
  }

  const rawTitle = share.remark || share.asset?.fileName || '';
  const titleSlug = rawTitle ? rawTitle.trim().replace(/\s+/g, '-') : '';

  // Set a secure, HttpOnly cookie to mark this share as authenticated
  const response = NextResponse.json({ success: true, titleSlug });
  response.cookies.set(`share-auth-${slug}`, '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8, // 8 hours
    path: '/',
  });

  return response;
}
