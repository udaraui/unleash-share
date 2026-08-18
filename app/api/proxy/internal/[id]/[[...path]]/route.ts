import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { downloadBlob, blobExists } from '@/lib/azure-blob';
import * as mime from 'mime-types';

interface RouteParams {
  params: Promise<{ id: string; path?: string[] }>;
}

export const GET = auth(async (req: NextRequest & { auth: any }, { params }: RouteParams) => {
  const { id, path = [] } = await params;

  const errorHtml = (message: string, status: number) => {
    return new NextResponse(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Access Denied</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background: #0f172a; color: #f8fafc; margin: 0; }
          .card { background: #1e293b; padding: 2.5rem; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); text-align: center; max-width: 400px; width: 90%; border: 1px solid #334155; }
          h1 { margin: 0 0 0.5rem 0; color: #f8fafc; font-size: 1.5rem; }
          p { color: #94a3b8; font-size: 0.95rem; margin-bottom: 2rem; line-height: 1.5; }
          a { display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 0.7rem 1.5rem; border-radius: 8px; font-weight: 500; font-size: 0.9rem; transition: background 0.2s; }
          a:hover { background: #4f46e5; }
        </style>
      </head>
      <body>
        <div class="card">
          <div style="font-size: 3.5rem; margin-bottom: 1rem;">${status === 404 ? '📄' : '🚫'}</div>
          <h1>${status === 404 ? 'Not Found' : 'Access Denied'}</h1>
          <p>${message}</p>
          <a href="/portal/dashboard">Return to Dashboard</a>
        </div>
      </body>
      </html>
    `, { status, headers: { 'Content-Type': 'text/html' } });
  };

  if (!req.auth?.user?.id) {
    // Redirect unauthenticated users to the login page
    return NextResponse.redirect(new URL('/', req.url));
  }

  const userId = req.auth.user.id;

  // 1. Fetch the Asset
  const asset = await prisma.asset.findUnique({
    where: { id },
  });

  if (!asset) {
    return errorHtml('The file you are looking for does not exist or has been removed.', 404);
  }

  // 2. Validate internal access
  let hasAccess = false;
  if (asset.ownerId === userId) {
    hasAccess = true;
  } else {
    // Check internal share for the asset itself
    const assetShare = await prisma.internalShare.findFirst({
      where: { assetId: asset.id, sharedWithUserId: userId },
    });
    if (assetShare) {
      hasAccess = true;
    } else if (asset.folderId) {
      // Check internal share for parent folders
      // For simplicity in this proxy route, we check the immediate parent folder. 
      // If nested folders are shared, we should ideally traverse up or check if the user has access to the folder.
      // A simple approach is checking if the immediate folder is shared.
      let currentFolderId: string | null = asset.folderId;
      while (currentFolderId && !hasAccess) {
        const folderShare = await prisma.internalShare.findFirst({
          where: { folderId: currentFolderId, sharedWithUserId: userId },
        });
        if (folderShare) {
          hasAccess = true;
          break;
        }
        const folderInfo: { parentFolderId: string | null } | null = await prisma.folder.findUnique({ where: { id: currentFolderId }, select: { parentFolderId: true } });
        currentFolderId = folderInfo?.parentFolderId || null;
      }
    }
  }

  if (!hasAccess) {
    return errorHtml('You do not have permission to view this file. If you believe this is an error, contact the file owner.', 403);
  }

  // 3. Determine the blob path to serve
  let blobPath: string;
  let resolvedMimeType: string;

  if (asset.isZippedSite) {
    // For zipped sites, serve the requested sub-path (default: index.html)
    const subPath = path.length > 0 ? path.join('/') : 'index.html';
    blobPath = `${asset.azureStoragePath}/${subPath}`;
    resolvedMimeType =
      (mime.lookup(subPath) as string) || 'application/octet-stream';
  } else {
    // Standalone file — serve directly
    blobPath = asset.azureStoragePath;
    resolvedMimeType = asset.mimeType;
  }

  // 4. Fetch from Azure Blob Storage
  const exists = await blobExists(blobPath);
  if (!exists) {
    // For zipped sites, try appending index.html as fallback
    if (asset.isZippedSite && path.length > 0) {
      blobPath = `${asset.azureStoragePath}/${path.join('/')}/index.html`;
      resolvedMimeType = 'text/html';
    } else {
      return errorHtml('The file was not found in our storage systems.', 404);
    }
  }

  const { buffer, contentType } = await downloadBlob(blobPath);

  // 5. For HTML files in zipped sites, rewrite relative paths to go through this proxy
  let responseBody: Uint8Array | string = new Uint8Array(buffer);
  if (asset.isZippedSite && resolvedMimeType === 'text/html') {
    const html = buffer.toString('utf-8');
    // Rewrite relative asset paths to route through this internal proxy endpoint
    const baseProxyPath = `/api/proxy/internal/${id}`;
    responseBody = html
      .replace(/src="(?!https?:\/\/|\/\/|data:)([^"]+)"/g, `src="${baseProxyPath}/$1"`)
      .replace(/href="(?!https?:\/\/|\/\/|#)([^"]+\.(?:css|js|ico|png|jpg|gif|woff|woff2|ttf))"/g, `href="${baseProxyPath}/$1"`)
      .replace(/url\(["']?(?!https?:\/\/|\/\/|data:)([^"')]+)["']?\)/g, `url("${baseProxyPath}/$1")`);
  }

  return new NextResponse(responseBody as any, {
    status: 200,
    headers: {
      'Content-Type': contentType || resolvedMimeType,
      'Cache-Control': 'private, no-store',
      // Enable video streaming
      ...(resolvedMimeType.startsWith('video/') && {
        'Accept-Ranges': 'bytes',
      }),
    },
  });
});
