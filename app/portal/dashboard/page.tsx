import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardContents from '@/components/explorer/DashboardContents';
import Link from 'next/link';
import { FolderX, ShieldAlert, Home } from 'lucide-react';

interface Props {
  searchParams: Promise<{ folderId?: string; assetId?: string }>;
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect('/login');

  const { folderId, assetId } = await searchParams;
  const fId = folderId ?? null;
  const reqAssetId = assetId ?? null;
  const ownerId = session.user!.id as string;

  let currentFolder: { id: string; name: string; parentFolderId: string | null; createdAt: Date; ownerId: string } | null = null;
  let breadcrumb: { id: string | null; name: string }[] = [];
  let permissionLevel: 'OWNER' | 'VIEW' | 'EDIT' = 'OWNER';

  if (fId) {
    currentFolder = await prisma.folder.findUnique({
      where: { id: fId },
      select: { id: true, name: true, parentFolderId: true, createdAt: true, ownerId: true },
    });

    if (!currentFolder) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', paddingTop: '10vh' }}>
          <FolderX size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Folder not found</h2>
          <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: 400, textAlign: 'center' }}>
            The folder you are looking for does not exist or has been deleted.
          </p>
          <Link href="/portal/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            <Home size={16} /> Go to Home
          </Link>
        </div>
      );
    }

    if (currentFolder.ownerId !== ownerId) {
      // Check for internal share access by walking up the folder tree (folder-level shares)
      let hasAccess = false;
      let curId: string | null = fId;
      
      while (curId) {
        const share = await prisma.internalShare.findFirst({
          where: { sharedWithUserId: ownerId, folderId: curId }
        });
        if (share) {
          hasAccess = true;
          permissionLevel = share.permissionLevel as 'VIEW' | 'EDIT';
          break;
        }
        const parentFolder: { parentFolderId: string | null } | null = await prisma.folder.findUnique({ where: { id: curId }, select: { parentFolderId: true } });
        curId = parentFolder?.parentFolderId || null;
      }

      // If no folder share found, check for a direct asset-level share
      // (e.g. user navigated here by clicking a shared file in the sidebar)
      if (!hasAccess) {
        // Check if the specific requested asset is shared with this user
        const assetIdToCheck = reqAssetId;
        if (assetIdToCheck) {
          const assetShare = await prisma.internalShare.findFirst({
            where: { sharedWithUserId: ownerId, assetId: assetIdToCheck },
            include: { asset: { select: { folderId: true } } },
          });
          if (assetShare && assetShare.asset?.folderId === fId) {
            hasAccess = true;
            permissionLevel = assetShare.permissionLevel as 'VIEW' | 'EDIT';
          }
        }

        // Also check if the user has ANY asset share in this folder (broader access)
        if (!hasAccess) {
          const anyAssetShare = await prisma.internalShare.findFirst({
            where: {
              sharedWithUserId: ownerId,
              asset: { folderId: fId },
            },
          });
          if (anyAssetShare) {
            hasAccess = true;
            permissionLevel = anyAssetShare.permissionLevel as 'VIEW' | 'EDIT';
          }
        }
      }

      if (!hasAccess) {
        return (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', paddingTop: '10vh' }}>
            <ShieldAlert size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Access Denied</h2>
            <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem', maxWidth: 400, textAlign: 'center' }}>
              You do not have permission to view this folder.
            </p>
            <Link href="/portal/dashboard" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Home size={16} /> Go to Home
            </Link>
          </div>
        );
      }
    }

    // Build breadcrumb
    const crumbs: typeof breadcrumb = [];
    let cur: { id: string; name: string; parentFolderId: string | null } | null = currentFolder;
    while (cur) {
      crumbs.unshift({ id: cur.id, name: cur.name });
      
      // Stop building breadcrumb if we hit the folder that was explicitly shared with us
      if (currentFolder.ownerId !== ownerId) {
        const isExplicitlyShared = await prisma.internalShare.findFirst({
          where: { sharedWithUserId: ownerId, folderId: cur.id }
        });
        if (isExplicitlyShared) break;
      }

      if (cur.parentFolderId) {
        cur = await prisma.folder.findUnique({
          where: { id: cur.parentFolderId },
          select: { id: true, name: true, parentFolderId: true, createdAt: true },
        });
      } else {
        cur = null;
      }
    }
    breadcrumb = [{ id: null, name: currentFolder.ownerId === ownerId ? 'HOME' : 'SHARED' }, ...crumbs];
  } else {
    breadcrumb = [{ id: null, name: 'HOME' }];
  }

  // Fetch sub-folders and assets
  const [folders, assets] = await Promise.all([
    prisma.folder.findMany({
      where: fId ? { parentFolderId: fId } : { ownerId, parentFolderId: null },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.asset.findMany({
      where: fId ? { folderId: fId } : { ownerId, folderId: null },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  return (
    <DashboardContents
      folderId={fId}
      breadcrumb={breadcrumb}
      permissionLevel={permissionLevel}
      currentFolder={currentFolder ? {
        id: currentFolder.id,
        name: currentFolder.name,
        parentFolderId: currentFolder.parentFolderId,
        createdAt: currentFolder.createdAt.toISOString()
      } : null}
      initialFolders={folders.map(f => ({
        id: f.id,
        name: f.name,
        parentFolderId: f.parentFolderId,
        createdAt: f.createdAt.toISOString(),
      }))}
      initialAssets={assets.map(a => ({
        id: a.id,
        fileName: a.fileName,
        mimeType: a.mimeType,
        isZippedSite: a.isZippedSite,
        azureStoragePath: a.azureStoragePath,
        createdAt: a.createdAt.toISOString(),
      }))}
    />
  );
}
