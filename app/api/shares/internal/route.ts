import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/shares/internal — grant VIEW or EDIT access to a user
export const POST = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const {
    sharedWithUserEmail,
    assetId,
    folderId,
    permissionLevel,
  } = body as {
    sharedWithUserEmail: string;
    assetId?: string;
    folderId?: string;
    permissionLevel: 'VIEW' | 'EDIT';
  };

  if (!sharedWithUserEmail || !permissionLevel) {
    return NextResponse.json({ error: 'sharedWithUserEmail and permissionLevel are required' }, { status: 400 });
  }
  if (!assetId && !folderId) {
    return NextResponse.json({ error: 'Either assetId or folderId is required' }, { status: 400 });
  }
  if (!['VIEW', 'EDIT'].includes(permissionLevel)) {
    return NextResponse.json({ error: 'permissionLevel must be VIEW or EDIT' }, { status: 400 });
  }

  const targetUser = await prisma.user.findUnique({ where: { email: sharedWithUserEmail } });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Check ownership
  if (folderId) {
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder || folder.ownerId !== req.auth.user.id) {
      return NextResponse.json({ error: 'Not authorized to share this folder' }, { status: 403 });
    }
  } else if (assetId) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset || asset.ownerId !== req.auth.user.id) {
      return NextResponse.json({ error: 'Not authorized to share this file' }, { status: 403 });
    }
  }

  // Check if share already exists
  const existingShare = await prisma.internalShare.findFirst({
    where: {
      sharedWithUserId: targetUser.id,
      assetId: assetId ?? null,
      folderId: folderId ?? null,
    },
  });

  let share;
  if (existingShare) {
    share = await prisma.internalShare.update({
      where: { id: existingShare.id },
      data: { permissionLevel },
    });
  } else {
    share = await prisma.internalShare.create({
      data: {
        sharedWithUserId: targetUser.id,
        assetId: assetId ?? null,
        folderId: folderId ?? null,
        permissionLevel,
      },
    });
  }

  // Mock Email Notification
  console.log(`\n========================================`);
  console.log(`📧 MOCK EMAIL NOTIFICATION`);
  console.log(`To: ${targetUser.email}`);
  console.log(`Subject: ${req.auth.user.name} shared an item with you`);
  console.log(`Body: You have been granted ${permissionLevel} access to a ${folderId ? 'folder' : 'file'}. Log in to view it in your SHARED sidebar.`);
  console.log(`========================================\n`);

  return NextResponse.json({ share }, { status: 201 });
});

// GET /api/shares/internal — list all shares for the current user, or for a specific item
export const GET = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const folderId = searchParams.get('folderId');
  const assetId = searchParams.get('assetId');

  let whereClause: any = { sharedWithUserId: req.auth.user.id };
  if (folderId) {
    whereClause = { folderId };
  } else if (assetId) {
    whereClause = { assetId };
  }

  const shares = await prisma.internalShare.findMany({
    where: whereClause,
    include: {
      asset: { include: { owner: { select: { email: true } } } },
      folder: { include: { owner: { select: { email: true } } } },
      sharedWithUser: { select: { email: true, fullName: true } },
    },
  });

  return NextResponse.json({ shares });
});

// PATCH /api/shares/internal — update an existing share's permission level
export const PATCH = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { shareId, permissionLevel } = body as { shareId: string; permissionLevel: 'VIEW' | 'EDIT' };

  if (!shareId || !['VIEW', 'EDIT'].includes(permissionLevel)) {
    return NextResponse.json({ error: 'Invalid shareId or permissionLevel' }, { status: 400 });
  }

  // Find the share and verify ownership of the asset/folder
  const share = await prisma.internalShare.findUnique({
    where: { id: shareId },
    include: { folder: true, asset: true },
  });

  if (!share) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  const isFolderOwner = share.folder && share.folder.ownerId === req.auth.user.id;
  const isAssetOwner = share.asset && share.asset.ownerId === req.auth.user.id;

  if (!isFolderOwner && !isAssetOwner) {
    return NextResponse.json({ error: 'Not authorized to update this share' }, { status: 403 });
  }

  const updatedShare = await prisma.internalShare.update({
    where: { id: shareId },
    data: { permissionLevel },
  });

  return NextResponse.json({ share: updatedShare });
});

// DELETE /api/shares/internal — delete an internal share
export const DELETE = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const shareId = searchParams.get('shareId');

  if (!shareId) {
    return NextResponse.json({ error: 'shareId is required' }, { status: 400 });
  }

  const share = await prisma.internalShare.findUnique({
    where: { id: shareId },
    include: { folder: true, asset: true },
  });

  if (!share) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  const isFolderOwner = share.folder && share.folder.ownerId === req.auth.user.id;
  const isAssetOwner = share.asset && share.asset.ownerId === req.auth.user.id;

  if (!isFolderOwner && !isAssetOwner) {
    return NextResponse.json({ error: 'Not authorized to delete this share' }, { status: 403 });
  }

  await prisma.internalShare.delete({ where: { id: shareId } });

  return NextResponse.json({ success: true });
});
