import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { uploadBuffer, getContainerClient } from '@/lib/azure-blob';
import { prisma } from '@/lib/prisma';
import * as mime from 'mime-types';
import * as unzipper from 'unzipper';
import { Readable } from 'stream';

export const POST = auth(async (req: NextRequest & { auth: any }) => {
  if (!req.auth?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ownerId: string = req.auth.user.id;
  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  const folderId = formData.get('folderId') as string | null;
  const replaceAssetId = formData.get('replaceAssetId') as string | null;

  console.log('UPLOAD POST received. fileName:', file?.name, 'replaceAssetId:', replaceAssetId, 'folderId:', folderId);

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const originalName = file.name;
  const isZip = originalName.toLowerCase().endsWith('.zip');

  let assetData: {
    fileName: string;
    azureStoragePath: string;
    mimeType: string;
    isZippedSite: boolean;
  };

  if (isZip) {
    assetData = await handleZipUpload(buffer, originalName, ownerId);
  } else {
    assetData = await handleStandaloneUpload(buffer, originalName, ownerId);
  }

  if (replaceAssetId) {
    const existingAsset = await prisma.asset.findFirst({ where: { id: replaceAssetId, ownerId } });
    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset to replace not found' }, { status: 404 });
    }

    try {
      const container = getContainerClient();
      await container.getBlockBlobClient(existingAsset.azureStoragePath).deleteIfExists();
    } catch (err) {
      console.error('Azure blob deletion error on overwrite:', err);
    }

    const asset = await prisma.asset.update({
      where: { id: replaceAssetId },
      data: {
        fileName: assetData.fileName,
        azureStoragePath: assetData.azureStoragePath,
        mimeType: assetData.mimeType,
        isZippedSite: assetData.isZippedSite,
      },
    });
    return NextResponse.json({ success: true, asset }, { status: 200 });
  }

  // Persist metadata to the assets table
  const asset = await prisma.asset.create({
    data: {
      fileName: assetData.fileName,
      azureStoragePath: assetData.azureStoragePath,
      mimeType: assetData.mimeType,
      isZippedSite: assetData.isZippedSite,
      ownerId,
      folderId: folderId ?? null,
    },
  });

  return NextResponse.json({ success: true, asset }, { status: 201 });
});

async function handleStandaloneUpload(
  buffer: Buffer,
  originalName: string,
  ownerId: string,
) {
  const mimeType =
    (mime.lookup(originalName) as string) || 'application/octet-stream';
  const blobPath = `uploads/${ownerId}/${Date.now()}-${originalName}`;
  await uploadBuffer(blobPath, buffer, mimeType);
  return { fileName: originalName, azureStoragePath: blobPath, mimeType, isZippedSite: false };
}

async function handleZipUpload(
  buffer: Buffer,
  originalName: string,
  ownerId: string,
): Promise<{ fileName: string; azureStoragePath: string; mimeType: string; isZippedSite: boolean }> {
  const baseFolder = `sites/${ownerId}/${Date.now()}-${originalName.replace('.zip', '')}`;
  const readable = Readable.from(buffer);

  return new Promise((resolve, reject) => {
    const uploads: Promise<void>[] = [];

    readable
      .pipe(unzipper.Parse())
      .on('entry', (entry: unzipper.Entry) => {
        if (entry.type === 'File') {
          const filePath = entry.path;
          const entryMime =
            (mime.lookup(filePath) as string) || 'application/octet-stream';
          const blobPath = `${baseFolder}/${filePath}`;

          const uploadPromise = entry
            .buffer()
            .then((buf: Buffer) => uploadBuffer(blobPath, buf, entryMime))
            .then(() => void 0);

          uploads.push(uploadPromise);
        } else {
          entry.autodrain();
        }
      })
      .on('close', async () => {
        await Promise.all(uploads);
        resolve({
          fileName: originalName,
          azureStoragePath: baseFolder,
          mimeType: 'application/zip',
          isZippedSite: true,
        });
      })
      .on('error', reject);
  });
}
