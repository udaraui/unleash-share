'use client';

import { useState, useCallback, useEffect } from 'react';
import FolderTree, { FolderNode } from './FolderTree';
import FolderContents from './FolderContents';

interface FolderRaw {
  id: string;
  name: string;
  parentFolderId: string | null;
  createdAt: string;
}

interface Asset {
  id: string;
  fileName: string;
  mimeType: string;
  isZippedSite: boolean;
  azureStoragePath: string;
  createdAt: string;
  folderId?: string | null;
}

interface AssetSlim {
  id: string;
  fileName: string;
  folderId: string | null;
}

export default function FileExplorer() {
  const [allFolders, setAllFolders] = useState<FolderRaw[]>([]);
  const [allAssets, setAllAssets] = useState<AssetSlim[]>([]);
  const [currentFolders, setCurrentFolders] = useState<FolderRaw[]>([]);
  const [currentAssets, setCurrentAssets] = useState<Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(260);
  const [resizing, setResizing] = useState(false);
  const [resizingRight, setResizingRight] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all folders (full tree) for the sidebar
  const fetchAllFolders = useCallback(async () => {
    try {
      // Fetch root folders, then we build the tree recursively from a flat list
      // We'll load all at root for now; deep trees load on expand
      const res = await fetch('/api/folders/tree', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAllFolders(data.folders ?? []);
        setAllAssets((data.assets ?? []).map((a: any) => ({
          id: a.id,
          fileName: a.fileName ?? a.file_name,
          folderId: a.folderId ?? a.folder_id ?? null,
        })));
      }
    } catch {}
  }, []);

  // Fetch contents of current folder
  const fetchCurrentFolder = useCallback(async (folderId: string | null) => {
    setLoading(true);
    try {
      const url = folderId ? `/api/folders?parentId=${folderId}` : '/api/folders';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCurrentFolders(data.folders);
        setCurrentAssets(data.assets);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    fetchAllFolders();
    fetchCurrentFolder(selectedId);
  }, [fetchAllFolders, fetchCurrentFolder, selectedId]);

  useEffect(() => {
    refresh();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleNavigate = useCallback((id: string | null) => {
    setSelectedId(id);
    fetchCurrentFolder(id);
    // Update allFolders for sidebar highlighting
    fetchAllFolders();
  }, [fetchCurrentFolder, fetchAllFolders]);

  // Build tree from flat folder list for sidebar
  const buildTree = (folders: FolderRaw[], assets: AssetSlim[], parentId: string | null = null): FolderNode[] => {
    const folderNodes: FolderNode[] = folders
      .filter(f => f.parentFolderId === parentId)
      .map(f => ({
        id: f.id,
        name: f.name,
        parentFolderId: f.parentFolderId,
        type: 'folder' as const,
        children: buildTree(folders, assets, f.id),
      }));

    const fileNodes: FolderNode[] = assets
      .filter(a => a.folderId === parentId)
      .map(a => ({
        id: a.id,
        name: a.fileName,
        parentFolderId: a.folderId,
        type: 'file' as const,
      }));

    return [...folderNodes, ...fileNodes];
  };

  const treeNodes = buildTree(allFolders, allAssets);

  // Build breadcrumb from allFolders
  const buildBreadcrumb = (id: string | null): { id: string | null; name: string }[] => {
    const crumbs: { id: string | null; name: string }[] = [{ id: null, name: 'Root' }];
    if (!id) return crumbs;

    const path: FolderRaw[] = [];
    let current: FolderRaw | undefined = allFolders.find(f => f.id === id);
    while (current) {
      path.unshift(current);
      current = allFolders.find(f => f.id === (current!.parentFolderId ?? ''));
    }
    return [...crumbs, ...path.map(f => ({ id: f.id, name: f.name }))];
  };

  const breadcrumb = buildBreadcrumb(selectedId);
  const currentFolderName = breadcrumb[breadcrumb.length - 1]?.name ?? 'Root';

  // Resize sidebar
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (me: MouseEvent) => {
      const delta = me.clientX - startX;
      setSidebarWidth(Math.max(160, Math.min(400, startW + delta)));
    };
    const onUp = () => {
      setResizing(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const startResizeRight = (e: React.MouseEvent) => {
    e.preventDefault();
    setResizingRight(true);
    const startX = e.clientX;
    const startW = rightWidth;
    const onMove = (me: MouseEvent) => {
      const delta = startX - me.clientX;
      setRightWidth(Math.max(160, Math.min(480, startW + delta)));
    };
    const onUp = () => {
      setResizingRight(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 80px)',
      borderRadius: 14,
      border: '1px solid var(--border)',
      overflow: 'hidden',
      background: 'var(--bg-secondary)',
      userSelect: (resizing || resizingRight) ? 'none' : 'auto',
    }}>
      {/* Left Sidebar — Folder Tree */}
      <div style={{
        width: sidebarWidth,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--bg-sidebar, var(--bg-secondary))',
        overflow: 'hidden',
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          flexShrink: 0,
        }}>
          File Explorer
        </div>

        <FolderTree
          nodes={treeNodes}
          assets={allAssets}
          selectedId={selectedId}
          onSelect={handleNavigate}
          onRefresh={refresh}
        />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={startResize}
        style={{
          width: 4,
          cursor: 'col-resize',
          background: resizing ? 'var(--accent)' : 'transparent',
          transition: 'background 0.15s',
          flexShrink: 0,
          zIndex: 1,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.4)')}
        onMouseLeave={e => { if (!resizing) e.currentTarget.style.background = 'transparent'; }}
      />

      {/* Right Resize handle */}
      <div
        onMouseDown={startResizeRight}
        style={{
          width: 4,
          cursor: 'col-resize',
          background: resizingRight ? 'var(--accent)' : 'transparent',
          transition: 'background 0.15s',
          flexShrink: 0,
          zIndex: 1,
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.4)')}
        onMouseLeave={e => { if (!resizingRight) e.currentTarget.style.background = 'transparent'; }}
      />

      {/* Right Panel — Folder Contents */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <span style={{ fontSize: '0.85rem' }}>Loading…</span>
        </div>
      ) : (
        <FolderContents
          folderId={selectedId}
          folderName={currentFolderName}
          breadcrumb={breadcrumb}
          folders={currentFolders}
          assets={currentAssets}
          onNavigate={handleNavigate}
          onRefresh={refresh}
          detailWidth={rightWidth}
        />
      )}
    </div>
  );
}
