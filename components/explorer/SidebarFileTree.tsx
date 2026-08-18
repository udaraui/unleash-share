'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight, FolderOpen, Folder, FolderPlus, Edit2, Trash2, User, File } from 'lucide-react';
import InlineInput from './InlineInput';
import ConfirmModal from './ConfirmModal';
import { getFileIcon } from '@/lib/iconUtils';

interface FolderRaw {
  id: string;
  name: string;
  parentFolderId: string | null;
}

interface AssetRaw {
  id: string;
  fileName: string;
  folderId: string | null;
  mimeType?: string;
  isZippedSite?: boolean;
}

interface FolderNode {
  id: string;
  name: string;
  parentFolderId: string | null;
  children: FolderNode[];
}

interface TreeNodeProps {
  node: FolderNode;
  assets: AssetRaw[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null, assetId?: string) => void;
  parentPath?: string[];
}

function TreeNode({ node, assets, depth, selectedId, selectedAssetId, onSelect, onRefresh, onDelete, parentPath = [] }: TreeNodeProps & { selectedAssetId?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);
  const [hovered, setHovered] = useState(false);

  const folderFiles = assets.filter(a => a.folderId === node.id);
  const hasChildren = node.children.length > 0 || folderFiles.length > 0;
  const isSelected = selectedId === node.id && !selectedAssetId;

  // Auto-expand if a child folder or file is selected / folder itself selected
  useEffect(() => {
    if (isSelected && hasChildren) setExpanded(true);
    if (selectedId && node.children.some(c => c.id === selectedId)) {
      setExpanded(true);
    }
  }, [selectedId, isSelected, hasChildren, node.children]);

  const handleRename = async (newName: string) => {
    setRenaming(false);
    await fetch(`/api/folders/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    onRefresh();
  };

  const handleDelete = () => {
    const fullPath = [...parentPath, node.name].join(' / ');
    onDelete(node.id, node.name, fullPath);
  };

  const handleCreateChild = async (name: string) => {
    setCreatingChild(false);
    setExpanded(true);
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentFolderId: node.id }),
    });
    onRefresh();
  };

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          paddingLeft: depth * 12 + 4,
          paddingRight: 4,
          paddingTop: 3,
          paddingBottom: 3,
          borderRadius: 6,
          cursor: 'pointer',
          background: isSelected ? 'rgba(99,102,241,0.2)' : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
          transition: 'background 0.12s',
          userSelect: 'none',
          marginBottom: 1,
        }}
        onClick={() => { onSelect(node.id); if (hasChildren) setExpanded(e => !e); }}
      >
        {/* Arrow */}
        <span
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
          style={{
            width: 14, textAlign: 'center', fontSize: '0.55rem',
            color: 'var(--text-muted)',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s',
            flexShrink: 0,
            opacity: hasChildren ? 1 : 0,
          }}
        >
          <ChevronRight size={10} />
        </span>

        <span style={{ fontSize: '0.85rem', flexShrink: 0, marginRight: 5, display: 'flex', color: 'var(--text-muted)' }}>
          {expanded && hasChildren ? <FolderOpen size={16} color="var(--text-muted)" strokeWidth={1.5} /> : <Folder size={16} color="var(--text-muted)" strokeWidth={1.5} />}
        </span>

        {renaming ? (
          <InlineInput
            defaultValue={node.name}
            onConfirm={handleRename}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span
            style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: '0.8rem',
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
            }}
            onDoubleClick={e => { e.stopPropagation(); setRenaming(true); }}
          >
            {node.name}
          </span>
        )}

        {/* Hover actions */}
        {hovered && !renaming && (
          <div style={{ display: 'flex', gap: 1, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              title="New sub-folder"
              onClick={() => { setCreatingChild(true); setExpanded(true); onSelect(node.id); }}
              style={{ ...actionBtnStyle, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.75rem', display: 'flex' }}><FolderPlus size={14} /></span>
              </div>
            </button>
            <button title="Rename" onClick={() => setRenaming(true)} style={actionBtnStyle}><Edit2 size={12} /></button>
            <button title="Delete" onClick={handleDelete} style={{ ...actionBtnStyle, color: '#ef4444' }}><Trash2 size={12} /></button>
          </div>
        )}
      </div>

      {/* New child inline */}
      {creatingChild && (
        <div style={{ paddingLeft: (depth + 1) * 12 + 22, paddingRight: 6, marginBottom: 2 }}>
          <InlineInput
            defaultValue=""
            placeholder="Folder name…"
            onConfirm={handleCreateChild}
            onCancel={() => setCreatingChild(false)}
          />
        </div>
      )}

      {/* Children: subfolders */}
      {expanded && (node.children.length > 0 || folderFiles.length > 0) && (
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: depth * 12 + 11,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'var(--border)',
            opacity: 0.5,
            zIndex: 0
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {node.children.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                assets={assets}
                depth={depth + 1}
                selectedId={selectedId}
                selectedAssetId={selectedAssetId}
                onSelect={onSelect}
                onRefresh={onRefresh}
                onDelete={onDelete}
                parentPath={[...parentPath, node.name]}
              />
            ))}
            {/* File rows */}
            {folderFiles.map(file => {
              const isFileSelected = selectedAssetId === file.id;
              return (
              <div
                key={file.id}
                title={file.fileName}
                onClick={() => onSelect(node.id, file.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: (depth + 1) * 12 + 4,
                  paddingRight: 4,
                  paddingTop: 3,
                  paddingBottom: 3,
                  borderRadius: 5,
                  cursor: 'pointer',
                  userSelect: 'none',
                  marginBottom: 1,
                  background: isFileSelected ? 'rgba(99,102,241,0.2)' : 'transparent',
                }}
                onMouseEnter={e => { if (!isFileSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (!isFileSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ width: 14, flexShrink: 0 }} />
                <span style={{ flexShrink: 0, marginRight: 5, display: 'flex', opacity: 0.6, color: isFileSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {getFileIcon(file.fileName, file.mimeType, 13, file.isZippedSite)}
                </span>
                <span style={{
                  flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontSize: '0.75rem', fontWeight: isFileSelected ? 600 : 400, color: isFileSelected ? 'var(--accent)' : 'var(--text-muted)',
                }}>
                  {file.fileName}
                </span>
              </div>
            )})}
          </div>
        </div>
      )}
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer',
  fontSize: '0.65rem', color: 'var(--text-muted)',
  padding: '1px 3px', borderRadius: 3, lineHeight: 1,
};

export default function SidebarFileTree() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFolderId = searchParams.get('folderId');
  const currentAssetId = searchParams.get('assetId');

  const [allFolders, setAllFolders] = useState<FolderRaw[]>([]);
  const [allAssets, setAllAssets] = useState<AssetRaw[]>([]);
  const [sharedShares, setSharedShares] = useState<any[]>([]);
  const [creatingRoot, setCreatingRoot] = useState(false);
  const [hoverHome, setHoverHome] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ id: string; name: string; path: string } | null>(null);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders/tree', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAllFolders(data.folders ?? []);
        setAllAssets((data.assets ?? []).map((a: any) => ({
          id: a.id,
          fileName: a.fileName ?? a.file_name,
          folderId: a.folderId ?? a.folder_id ?? null,
          mimeType: a.mimeType,
          isZippedSite: a.isZippedSite,
        })));
      }
    } catch {}
  }, []);

  const fetchShared = useCallback(async () => {
    try {
      const res = await fetch('/api/shares/internal');
      if (res.ok) {
        const data = await res.json();
        setSharedShares(data.shares || []);
      }
    } catch {}
  }, []);

  useEffect(() => { 
    fetchFolders(); 
    fetchShared();
  }, [fetchFolders, fetchShared]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchFolders();
      fetchShared();
    };
    window.addEventListener('explorer-refresh', handleRefresh);
    return () => window.removeEventListener('explorer-refresh', handleRefresh);
  }, [fetchFolders, fetchShared]);

  const buildTree = (folders: FolderRaw[], parentId: string | null = null): FolderNode[] =>
    folders
      .filter(f => f.parentFolderId === parentId)
      .map(f => ({ ...f, children: buildTree(folders, f.id) }));

  const handleSelect = (id: string | null, assetId?: string) => {
    const base = '/portal/dashboard';
    const params = new URLSearchParams();
    if (id) params.set('folderId', id);
    if (assetId) params.set('assetId', assetId);
    const q = params.toString();
    router.push(q ? `${base}?${q}` : base);
  };

  const handleCreateRoot = async (name: string) => {
    setCreatingRoot(false);
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentFolderId: null }),
    });
    fetchFolders();
  };

  const performDelete = async () => {
    if (!deletingItem) return;
    await fetch(`/api/folders/${deletingItem.id}`, { method: 'DELETE' });
    setDeletingItem(null);
    fetchFolders();
  };

  const isOnDashboard = pathname === '/portal/dashboard';
  const isRootSelected = isOnDashboard && !currentFolderId;

  const treeNodes = buildTree(allFolders);

  // Group incoming shares by email
  const groupedShares: Record<string, any[]> = {};
  sharedShares.forEach(s => {
    const ownerEmail = s.folder?.owner?.email || s.asset?.owner?.email;
    if (ownerEmail) {
      if (!groupedShares[ownerEmail]) groupedShares[ownerEmail] = [];
      groupedShares[ownerEmail].push(s);
    }
  });

  return (
    <div 
      onMouseEnter={() => setHoverHome(true)}
      onMouseLeave={() => setHoverHome(false)}
      style={{ display: 'flex', flexDirection: 'column', gap: 1 }}
    >
      {/* Section header */}
      <div 
        style={{
          fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em',
          textTransform: 'uppercase', color: 'var(--text-muted)',
          padding: '0.5rem 0.75rem 0.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span
          onClick={() => handleSelect(null)}
          style={{
            cursor: 'pointer',
            userSelect: 'none',
            color: isRootSelected ? 'var(--accent)' : 'var(--text-muted)',
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = isRootSelected ? 'var(--accent)' : 'var(--text-muted)'}
        >
          HOME
        </span>
        <button
          title="New home folder"
          onClick={() => setCreatingRoot(true)}
          style={{ 
            background: 'none', border: 'none', cursor: 'pointer', padding: '1px 3px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            opacity: hoverHome ? 0.8 : 0, 
            pointerEvents: hoverHome ? 'auto' : 'none',
            color: 'inherit',
            transition: 'opacity 0.2s ease-in-out'
          }}
        >
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.85rem', display: 'flex' }}><FolderPlus size={16} /></span>
          </div>
        </button>
      </div>



      {/* New root folder inline */}
      {creatingRoot && (
        <div style={{ paddingLeft: 22, paddingRight: 6, marginBottom: 2 }}>
          <InlineInput
            defaultValue=""
            placeholder="Folder name…"
            onConfirm={handleCreateRoot}
            onCancel={() => setCreatingRoot(false)}
          />
        </div>
      )}

      {/* Tree */}
      {treeNodes.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          assets={allAssets}
          depth={0}
          selectedId={currentFolderId}
          selectedAssetId={currentAssetId}
          onSelect={handleSelect}
          onRefresh={fetchFolders}
          onDelete={(id, name, path) => setDeletingItem({ id, name, path })}
        />
      ))}

      {/* SHARED SECTION */}
      {Object.keys(groupedShares).length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.09em',
            textTransform: 'uppercase', color: 'var(--text-muted)',
            padding: '0.5rem 0.75rem 0.25rem',
          }}>
            SHARED
          </div>
          {Object.entries(groupedShares).map(([email, shares]) => (
            <SharedUserGroup 
            key={email} 
            email={email} 
            shares={shares} 
            currentFolderId={currentFolderId}
            currentAssetId={currentAssetId}
            onSelect={handleSelect} 
          />
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingItem && (
        <ConfirmModal
          title="Delete Folder"
          message={
            <div>
              <p style={{ marginBottom: '0.75rem' }}>
                Are you sure you want to delete the folder <strong>{deletingItem.name}</strong> and all its contents permanently?
              </p>
              {deletingItem.path && deletingItem.path !== deletingItem.name && (
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  background: 'var(--bg-secondary)',
                  padding: '6px 10px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  wordBreak: 'break-all'
                }}>
                  <span style={{ fontWeight: 600 }}>Path:</span> {deletingItem.path}
                </div>
              )}
            </div>
          }
          confirmText="Delete"
          danger={true}
          onConfirm={performDelete}
          onCancel={() => setDeletingItem(null)}
        />
      )}
    </div>
  );
}

function SharedUserGroup({ email, shares, currentFolderId, currentAssetId, onSelect }: any) {
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', padding: '3px 4px 3px 4px',
          borderRadius: 6, cursor: 'pointer',
          background: hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
          transition: 'background 0.12s', userSelect: 'none', marginBottom: 1,
        }}
        onClick={() => setExpanded((e: boolean) => !e)}
      >
        <span style={{
          width: 14, textAlign: 'center', fontSize: '0.55rem', color: 'var(--text-muted)',
          transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0,
        }}>
          <ChevronRight size={10} />
        </span>
        <span style={{ fontSize: '0.85rem', flexShrink: 0, marginRight: 5, display: 'flex' }}><User size={14} /></span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          {email}
        </span>
      </div>

      {expanded && shares.map((s: any) => {
        const item = s.folder || s.asset;
        if (!item) return null;
        const isFolder = !!s.folderId;
        // For folders: highlighted when the folder is active and no asset is selected
        // For assets: highlighted when this assetId is active in the URL
        const isSelected = isFolder
          ? currentFolderId === item.id && !currentAssetId
          : currentAssetId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => {
              if (isFolder) {
                onSelect(item.id);
              } else {
                // Navigate to parent folder + highlight this asset
                const parentFolderId = item.folderId ?? null;
                onSelect(parentFolderId, item.id);
              }
            }}
            style={{
              display: 'flex', alignItems: 'center', padding: '3px 4px 3px 16px',
              borderRadius: 6, cursor: 'pointer',
              background: isSelected ? 'rgba(99,102,241,0.2)' : 'transparent',
              transition: 'background 0.12s',
              userSelect: 'none', marginBottom: 1,
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: 14, flexShrink: 0 }} /> {/* Spacer */}
            <span style={{ fontSize: '0.85rem', flexShrink: 0, marginRight: 5, display: 'flex', color: isSelected ? 'var(--accent)' : 'var(--text-muted)' }}>
              {isFolder
                ? <Folder size={14} strokeWidth={1.5} />
                : getFileIcon(item.fileName, item.mimeType, 14, item.isZippedSite)}
            </span>
            <span style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: '0.8rem', fontWeight: isSelected ? 600 : 400,
              color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
              {isFolder ? item.name : item.fileName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
