import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/folders?parentId=... — fetch folder tree
export const GET = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const parentId = searchParams.get('parentId') ?? null;
  const ownerId: string = req.auth.user.id;

  const folders = await prisma.folder.findMany({
    where: { ownerId, parentFolderId: parentId },
    orderBy: { createdAt: 'asc' },
  });

  const assets = await prisma.asset.findMany({
    where: { ownerId, folderId: parentId },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ folders, assets });
});

// POST /api/folders — create a folder
export const POST = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownerId: string = req.auth.user.id;
  const body = await req.json();
  const { name, parentFolderId } = body as { name: string; parentFolderId?: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: { name: name.trim(), ownerId, parentFolderId: parentFolderId ?? null },
  });

  return NextResponse.json({ folder }, { status: 201 });
});

// PATCH /api/folders — move an asset to a different folder
export const PATCH = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownerId: string = req.auth.user.id;
  const body = await req.json();
  const { assetId, folderIdToMove, targetFolderId } = body as { assetId?: string; folderIdToMove?: string; targetFolderId: string | null };

  if (folderIdToMove) {
    if (folderIdToMove === targetFolderId) return NextResponse.json({ error: 'Cannot move folder into itself' }, { status: 400 });

    const folderToMove = await prisma.folder.findFirst({ where: { id: folderIdToMove, ownerId } });
    if (!folderToMove) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

    // Validate target folder is not a child of the folder being moved (simplified: just prevent moving to itself)
    const updated = await prisma.folder.update({
      where: { id: folderIdToMove },
      data: { parentFolderId: targetFolderId ?? null },
    });
    return NextResponse.json({ folder: updated });
  }

  if (assetId) {
    const asset = await prisma.asset.findFirst({ where: { id: assetId, ownerId } });
    if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

    const updated = await prisma.asset.update({
      where: { id: assetId },
      data: { folderId: targetFolderId ?? null },
    });
    return NextResponse.json({ asset: updated });
  }

  return NextResponse.json({ error: 'Missing assetId or folderIdToMove' }, { status: 400 });
});
