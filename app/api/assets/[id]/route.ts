import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getContainerClient } from '@/lib/azure-blob';

// PATCH /api/assets/[id] — rename an asset (fileName only, not the blob)
export const PATCH = auth(async (req: NextRequest & { auth: any }, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ownerId: string = req.auth.user.id;
  const { id } = await params;
  const body = await req.json();
  const { fileName } = body as { fileName: string };

  if (!fileName?.trim()) {
    return NextResponse.json({ error: 'File name is required' }, { status: 400 });
  }

  const asset = await prisma.asset.findFirst({ where: { id, ownerId } });
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  // Extract original file extension (e.g. '.docx', '.pdf', or '')
  const lastDot = asset.fileName.lastIndexOf('.');
  const originalExt = lastDot > 0 ? asset.fileName.substring(lastDot) : '';

  // Clean the new base name (remove duplicate extension if passed by user)
  let cleanBase = fileName.trim();
  if (originalExt && cleanBase.toLowerCase().endsWith(originalExt.toLowerCase())) {
    cleanBase = cleanBase.substring(0, cleanBase.length - originalExt.length).trim();
  }
  // Remove any trailing dots
  cleanBase = cleanBase.replace(/\.+$/, '').trim();

  if (!cleanBase) {
    return NextResponse.json({ error: 'File name cannot be empty' }, { status: 400 });
  }

  const finalFileName = `${cleanBase}${originalExt}`;

  const updated = await prisma.asset.update({
    where: { id },
    data: { fileName: finalFileName },
  });

  return NextResponse.json({ asset: updated });
});

// DELETE /api/assets/[id] — delete an asset from blob storage + DB
export const DELETE = auth(async (req: NextRequest & { auth: any }, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ownerId: string = req.auth.user.id;
  const { id } = await params;

  const asset = await prisma.asset.findFirst({ where: { id, ownerId } });
  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  // Delete blob from Azure Storage (fails silently if file not found or storage error)
  try {
    const container = getContainerClient();
    await container.getBlockBlobClient(asset.azureStoragePath).deleteIfExists();
  } catch (err) {
    console.error('Azure blob deletion error:', err);
  }

  // Delete related external shares and recipients manually to satisfy foreign key constraints
  try {
    const extShares = await prisma.externalShare.findMany({
      where: { assetId: id },
      select: { id: true },
    });
    const extShareIds = extShares.map(s => s.id);
    if (extShareIds.length > 0) {
      await prisma.externalShareRecipient.deleteMany({
        where: { externalShareId: { in: extShareIds } },
      });
      await prisma.externalShare.deleteMany({
        where: { id: { in: extShareIds } },
      });
    }

    // Delete related internal shares
    await prisma.internalShare.deleteMany({
      where: { assetId: id },
    });

    // Delete asset from DB
    await prisma.asset.delete({ where: { id } });
  } catch (dbErr) {
    console.error('Database deletion error:', dbErr);
    return NextResponse.json({ error: 'Failed to delete asset from database' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
});
