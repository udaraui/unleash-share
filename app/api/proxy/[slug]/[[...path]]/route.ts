import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { downloadBlob, blobExists } from '@/lib/azure-blob';
import * as mime from 'mime-types';

interface RouteParams {
  params: Promise<{ slug: string; path?: string[] }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { slug, path = [] } = await params;

  // 1. Look up the external share record
  const share = await prisma.externalShare.findUnique({
    where: { urlSlug: slug },
    include: { asset: true },
  });

  if (!share) {
    return NextResponse.json({ error: 'Share not found' }, { status: 404 });
  }

  // 2. Check expiry
  if (share.expiresAt && new Date() > share.expiresAt) {
    return NextResponse.json({ error: 'This share link has expired' }, { status: 410 });
  }

  // 3. Check if client is authenticated for this share (via cookie)
  //    The preview page sets a cookie like `share-auth-{slug}=1` after password entry
  const authCookie = req.cookies.get(`share-auth-${slug}`);
  if (!authCookie) {
    // Redirect to the preview auth page
    const authUrl = new URL(`/preview/${slug}`, req.url);
    return NextResponse.redirect(authUrl);
  }

  // 4. If accessed directly at /preview/[slug] without title parameter, redirect to append title
  const rawTitle = share.remark || share.asset?.fileName || '';
  const titleSlug = rawTitle ? rawTitle.trim().replace(/\s+/g, '-') : '';

  if (path.length === 0 && titleSlug) {
    const targetUrl = new URL(`/preview/${slug}/${encodeURIComponent(titleSlug)}`, req.url);
    return NextResponse.redirect(targetUrl);
  }

  // 5. Determine the blob path to serve
  const asset = share.asset;
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

  // 5. Fetch from Azure Blob Storage
  let exists = await blobExists(blobPath);
  if (!exists) {
    if (asset.isZippedSite) {
      // Try subPath/index.html
      const subIndex = `${asset.azureStoragePath}/${path.join('/')}/index.html`;
      if (await blobExists(subIndex)) {
        blobPath = subIndex;
        resolvedMimeType = 'text/html';
        exists = true;
      } else {
        // Fallback to root index.html (e.g. when title slug is passed as path parameter)
        const rootIndex = `${asset.azureStoragePath}/index.html`;
        if (await blobExists(rootIndex)) {
          blobPath = rootIndex;
          resolvedMimeType = 'text/html';
          exists = true;
        }
      }
    }
  }

  if (!exists) {
    return NextResponse.json({ error: 'Asset not found in storage' }, { status: 404 });
  }

  const { buffer, contentType } = await downloadBlob(blobPath);

  // 6. For HTML files in zipped sites, rewrite relative paths to go through this proxy
  let responseBody: Uint8Array | string = new Uint8Array(buffer);
  if (asset.isZippedSite && resolvedMimeType === 'text/html') {
    const html = buffer.toString('utf-8');
    // Rewrite relative asset paths to route through preview endpoint
    const baseProxyPath = `/preview/${slug}`;
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
}
