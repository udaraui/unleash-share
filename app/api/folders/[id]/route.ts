import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getContainerClient } from '@/lib/azure-blob';

// PATCH /api/folders/[id] — rename a folder
export const PATCH = auth(async (req: NextRequest & { auth: any }, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ownerId: string = req.auth.user.id;
  const { id } = await params;
  const body = await req.json();
  const { name } = body as { name: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Folder name is required' }, { status: 400 });
  }

  const folder = await prisma.folder.findFirst({ where: { id, ownerId } });
  if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

  const updated = await prisma.folder.update({
    where: { id },
    data: { name: name.trim() },
  });

  return NextResponse.json({ folder: updated });
});

// DELETE /api/folders/[id] — recursively delete a folder and all its assets from Azure + DB
export const DELETE = auth(async (req: NextRequest & { auth: any }, { params }: { params: Promise<{ id: string }> }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const ownerId: string = req.auth.user.id;
  const { id } = await params;

  const folder = await prisma.folder.findFirst({ where: { id, ownerId } });
  if (!folder) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

  // Recursively collect all asset paths under this folder tree
  const collectAssets = async (folderId: string): Promise<string[]> => {
    const assets = await prisma.asset.findMany({
      where: { folderId },
      select: { azureStoragePath: true },
    });
    const childFolders = await prisma.folder.findMany({
      where: { parentFolderId: folderId },
      select: { id: true },
    });
    const childPaths = await Promise.all(childFolders.map(f => collectAssets(f.id)));
    return [...assets.map(a => a.azureStoragePath), ...childPaths.flat()];
  };

  const blobPaths = await collectAssets(id);

  // Delete blobs from Azure Storage
  try {
    const container = getContainerClient();
    await Promise.all(blobPaths.map(path => container.getBlockBlobClient(path).deleteIfExists()));
  } catch (err) {
    console.error('Azure blob deletion error (partial ok):', err);
  }

  // Since our schema doesn't have cascade, we delete manually bottom-up
  const deleteFolderTree = async (folderId: string): Promise<void> => {
    const childFolders = await prisma.folder.findMany({
      where: { parentFolderId: folderId },
      select: { id: true },
    });
    
    // Recursively delete child folders
    for (const f of childFolders) {
      await deleteFolderTree(f.id);
    }
    
    // Find all assets in this folder
    const assets = await prisma.asset.findMany({
      where: { folderId },
      select: { id: true },
    });
    const assetIds = assets.map(a => a.id);
    
    if (assetIds.length > 0) {
      // Find all external shares for these assets
      const extShares = await prisma.externalShare.findMany({
        where: { assetId: { in: assetIds } },
        select: { id: true },
      });
      const extShareIds = extShares.map(s => s.id);
      
      if (extShareIds.length > 0) {
        // Delete recipients of external shares
        await prisma.externalShareRecipient.deleteMany({
          where: { externalShareId: { in: extShareIds } },
        });
        // Delete external shares
        await prisma.externalShare.deleteMany({
          where: { id: { in: extShareIds } },
        });
      }
      
      // Delete internal shares for these assets
      await prisma.internalShare.deleteMany({
        where: { assetId: { in: assetIds } },
      });
      
      // Delete assets
      await prisma.asset.deleteMany({
        where: { id: { in: assetIds } },
      });
    }
    
    // Delete internal shares for the folder itself
    await prisma.internalShare.deleteMany({
      where: { folderId },
    });
    
    // Delete the folder itself
    await prisma.folder.delete({
      where: { id: folderId },
    });
  };

  await deleteFolderTree(id);

  return NextResponse.json({ success: true });
});
