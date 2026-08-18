import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET /api/folders/tree — fetch ALL folders and assets for the current user (used for sidebar tree)
export const GET = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ownerId: string = req.auth.user.id;

  const folders = await prisma.folder.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      name: true,
      parentFolderId: true,
      createdAt: true,
    },
  });

  const assets = await prisma.asset.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      fileName: true,
      folderId: true,
      mimeType: true,
      isZippedSite: true,
    },
  });

  return NextResponse.json({ folders, assets });
});
