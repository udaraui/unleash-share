'use client';

import { useState, useEffect, useCallback } from 'react';

import { ChevronRight, FolderOpen, Folder, Home } from 'lucide-react';
interface FolderRaw {
  id: string;
  name: string;
  parentFolderId: string | null;
}

interface FolderNode {
  id: string;
  name: string;
  parentFolderId: string | null;
  children: FolderNode[];
}

interface Props {
  item: { type: 'folder' | 'asset'; id: string; name: string };
  currentFolderId: string | null;
  onMoved: () => void;
  onClose: () => void;
}

function buildTree(folders: FolderRaw[], parentId: string | null = null): FolderNode[] {
  return folders
    .filter(f => f.parentFolderId === parentId)
    .map(f => ({ ...f, children: buildTree(folders, f.id) }));
}

interface TreeNodeProps {
  node: FolderNode;
  depth: number;
  selectedId: string | null;
  disabledId: string | null;
  onSelect: (id: string) => void;
}

function TreeNode({ node, depth, selectedId, disabledId, onSelect }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedId === node.id;
  const isDisabled = disabledId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        onClick={() => !isDisabled && onSelect(node.id)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          paddingLeft: depth * 16 + 8, paddingRight: 8,
          paddingTop: 6, paddingBottom: 6,
          borderRadius: 6,
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          background: isSelected
            ? 'rgba(99,102,241,0.2)'
            : 'transparent',
          opacity: isDisabled ? 0.4 : 1,
          transition: 'background 0.12s',
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (!isDisabled && !isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
      >
        {hasChildren && (
          <span
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{
              fontSize: '0.55rem', color: 'var(--text-muted)',
              transform: expanded ? 'rotate(90deg)' : 'none',
              transition: 'transform 0.15s', flexShrink: 0, width: 12,
            }}
          >
            <ChevronRight size={12} />
          </span>
        )}
        {!hasChildren && <span style={{ width: 12, flexShrink: 0 }} />}

        <span style={{ fontSize: '0.9rem', display: 'flex' }}>{expanded && hasChildren ? <FolderOpen size={16} /> : <Folder size={16} />}</span>

        <span style={{
          flex: 1, fontSize: '0.84rem',
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {node.name}
        </span>

        {isDisabled && (
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', flexShrink: 0 }}>current</span>
        )}
        {isSelected && !isDisabled && (
          <span style={{ fontSize: '0.7rem', color: 'var(--accent)', flexShrink: 0 }}>✓</span>
        )}
      </div>

      {expanded && node.children.map(child => (
        <TreeNode
          key={child.id}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          disabledId={disabledId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default function MoveModal({ item, currentFolderId, onMoved, onClose }: Props) {
  const [allFolders, setAllFolders] = useState<FolderRaw[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/folders/tree');
      if (res.ok) {
        const data = await res.json();
        setAllFolders(data.folders);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  const handleMove = async () => {
    setMoving(true);
    const body = item.type === 'folder' 
      ? { folderIdToMove: item.id, targetFolderId: selectedId }
      : { assetId: item.id, targetFolderId: selectedId };
      
    await fetch('/api/folders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setMoving(false);
    onMoved();
  };

  const treeNodes = buildTree(allFolders);

  const targetLabel = selectedId === null
    ? 'HOME'
    : allFolders.find(f => f.id === selectedId)?.name ?? '…';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget && !moving) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: 440,
        maxWidth: '95vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Move File</div>
            <button
              onClick={onClose}
              disabled={moving}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Moving {item.type === 'folder' ? 'folder ' : 'file '}<strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong> to a new location
          </div>
        </div>

        {/* Tree */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem 0.5rem' }}>
          {/* Root option */}
          <div
            onClick={() => setSelectedId(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
              marginBottom: 2,
              background: selectedId === null
                ? (currentFolderId === null ? 'transparent' : 'rgba(99,102,241,0.2)')
                : 'transparent',
              opacity: currentFolderId === null ? 0.4 : 1,
              userSelect: 'none',
            }}
            onMouseEnter={e => { if (currentFolderId !== null && selectedId !== null) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { if (selectedId !== null) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: 12 }} />
            <span style={{ fontSize: '0.9rem', display: 'flex' }}><Home size={16} /></span>
            <span style={{
              flex: 1, fontSize: '0.84rem',
              fontWeight: selectedId === null && currentFolderId !== null ? 600 : 400,
              color: selectedId === null && currentFolderId !== null ? 'var(--accent)' : 'var(--text-primary)',
            }}>
              HOME
            </span>
            {currentFolderId === null && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>current</span>}
            {selectedId === null && currentFolderId !== null && <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>✓</span>}
          </div>

          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Loading folders…
            </div>
          ) : treeNodes.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              No folders yet. The {item.type === 'folder' ? 'folder' : 'file'} will move to HOME.
            </div>
          ) : (
            treeNodes.map(node => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                selectedId={selectedId}
                disabledId={currentFolderId}
                onSelect={id => setSelectedId(id)}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '0.85rem 1.25rem',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Destination: <strong style={{ color: 'var(--text-primary)' }}>{targetLabel}</strong>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} disabled={moving} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>
              Cancel
            </button>
            <button
              onClick={handleMove}
              disabled={moving || selectedId === currentFolderId}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', minWidth: 90 }}
            >
              {moving ? 'Moving…' : 'Move Here'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
