import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

// POST /api/shares/external — create an external share link
export const POST = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const createdByUserId: string = req.auth.user.id;
  const body = await req.json();
  const {
    assetId,
    authMethod,
    password,
    expiresAt,
    remark,
    recipients, // Array of { email?, mobile? }
  } = body as {
    assetId: string;
    authMethod: 'PASSWORD' | 'EMAIL_OTP' | 'MOBILE_OTP';
    password?: string;
    expiresAt?: string;
    remark?: string;
    recipients?: Array<{ email?: string; mobile?: string }>;
  };

  if (!assetId || !authMethod) {
    return NextResponse.json({ error: 'assetId and authMethod are required' }, { status: 400 });
  }
  if (!['PASSWORD', 'EMAIL_OTP', 'MOBILE_OTP'].includes(authMethod)) {
    return NextResponse.json({ error: 'Invalid authMethod' }, { status: 400 });
  }

  // Generate a unique URL slug
  const urlSlug = randomBytes(6).toString('hex'); // e.g., "a3f9c2"

  // Hash password if provided
  let hashedPassword: string | null = null;
  if (authMethod === 'PASSWORD' && password) {
    hashedPassword = await bcrypt.hash(password, 12);
  }

  const externalShare = await prisma.externalShare.create({
    data: {
      assetId,
      urlSlug,
      authMethod,
      hashedPassword,
      plainPassword: password || null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      remark: remark || null,
      createdByUserId,
      // Create recipients in the same transaction
      recipients: {
        create: (recipients ?? []).map((r) => ({
          recipientEmail: r.email ?? null,
          recipientMobile: r.mobile ?? null,
        })),
      },
    },
    include: { recipients: true },
  });

  const shareUrl = `${process.env.NEXTAUTH_URL}/preview/${urlSlug}`;

  return NextResponse.json({ externalShare, shareUrl }, { status: 201 });
});

// GET /api/shares/external — list external shares created by the current user
export const GET = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const assetId = url.searchParams.get('assetId');

  const shares = await prisma.externalShare.findMany({
    where: { 
      createdByUserId: req.auth.user.id,
      ...(assetId ? { assetId } : {}),
    },
    include: { asset: true, recipients: true },
    orderBy: { asset: { createdAt: 'desc' } },
  });

  return NextResponse.json({ shares });
});

// DELETE /api/shares/external — delete an external share link by shareId
export const DELETE = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const shareId = url.searchParams.get('shareId');

  if (!shareId) {
    return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
  }

  const share = await prisma.externalShare.findFirst({
    where: {
      id: shareId,
      createdByUserId: req.auth.user.id,
    },
  });

  if (!share) {
    return NextResponse.json({ error: 'Share link not found or unauthorized' }, { status: 404 });
  }

  // Delete recipient records first to prevent foreign key violation
  await prisma.externalShareRecipient.deleteMany({
    where: { externalShareId: shareId },
  });

  // Delete external share record
  await prisma.externalShare.delete({
    where: { id: shareId },
  });

  return NextResponse.json({ success: true });
});

// PATCH /api/shares/external — update external share remark / title
export const PATCH = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { shareId, remark } = body as { shareId: string; remark?: string };

  if (!shareId) {
    return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
  }

  const share = await prisma.externalShare.findFirst({
    where: {
      id: shareId,
      createdByUserId: req.auth.user.id,
    },
  });

  if (!share) {
    return NextResponse.json({ error: 'Share link not found or unauthorized' }, { status: 404 });
  }

  const updated = await prisma.externalShare.update({
    where: { id: shareId },
    data: {
      remark: remark !== undefined ? (remark.trim() || null) : share.remark,
    },
  });

  return NextResponse.json({ share: updated });
});
