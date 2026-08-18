'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, FolderOpen, Folder, FolderPlus, Edit2, Trash2, Home, File } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import InlineInput from './InlineInput';

export interface FolderNode {
  id: string;
  name: string;
  parentFolderId: string | null;
  type?: 'folder' | 'file';
  children?: FolderNode[];
}

export interface AssetSlim {
  id: string;
  fileName: string;
  folderId: string | null;
}

interface Props {
  nodes: FolderNode[];
  assets: AssetSlim[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRefresh: () => void;
}

interface TreeNodeProps {
  node: FolderNode;
  assets: AssetSlim[];
  depth: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onRefresh: () => void;
  onDelete: (id: string, name: string, path: string) => void;
  parentPath?: string[];
}

function TreeNode({ node, assets, depth, selectedId, onSelect, onRefresh, onDelete, parentPath = [] }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [creatingChild, setCreatingChild] = useState(false);
  const [hovered, setHovered] = useState(false);

  // Files directly in this folder
  const folderFiles = (node.children ?? []).filter(c => c.type === 'file');
  // Subfolder children
  const subFolders = (node.children ?? []).filter(c => c.type !== 'file');
  const hasChildren = subFolders.length > 0 || folderFiles.length > 0;
  const isSelected = selectedId === node.id;

  // Auto-expand folder when it becomes selected
  useEffect(() => {
    if (isSelected && hasChildren && node.type !== 'file') {
      setExpanded(true);
    }
  }, [isSelected, hasChildren, node.type]);

  const handleRename = useCallback(async (newName: string) => {
    setRenaming(false);
    await fetch(`/api/folders/${node.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    onRefresh();
  }, [node.id, onRefresh]);

  const handleDelete = useCallback(() => {
    const fullPath = [...parentPath, node.name].join(' / ');
    onDelete(node.id, node.name, fullPath);
  }, [node.id, node.name, onDelete, parentPath]);

  const handleCreateChild = useCallback(async (name: string) => {
    setCreatingChild(false);
    setExpanded(true);
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentFolderId: node.id }),
    });
    onRefresh();
  }, [node.id, onRefresh]);


  return (
    <div>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          paddingLeft: depth * 14 + 8,
          paddingRight: 6,
          paddingTop: 4,
          paddingBottom: 4,
          borderRadius: 6,
          cursor: 'pointer',
          background: isSelected ? 'rgba(99,102,241,0.18)' : hovered ? 'rgba(255,255,255,0.05)' : 'transparent',
          transition: 'background 0.15s',
          userSelect: 'none',
          marginBottom: 1,
        }}
        onClick={() => {
          if (node.type === 'file') {
            onSelect(node.parentFolderId);
          } else {
            onSelect(node.id);
            // Always expand on click (toggle with arrow only)
            if (hasChildren) setExpanded(true);
          }
        }}
      >
        {/* Expand arrow */}
        <span
          style={{
            width: 16, textAlign: 'center', fontSize: '0.65rem',
            color: 'var(--text-muted)', transition: 'transform 0.15s',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
            opacity: hasChildren ? 1 : 0,
          }}
          onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
        >
          <ChevronRight size={10} />
        </span>

        {/* Folder/File icon */}
        <span style={{ fontSize: '0.85rem', flexShrink: 0, marginRight: 5, display: 'flex', color: 'var(--text-muted)' }}>
          {node.type === 'file' ? (
            <File size={16} color="var(--text-muted)" strokeWidth={1.5} />
          ) : expanded ? (
            <FolderOpen size={16} color="var(--text-muted)" strokeWidth={1.5} />
          ) : (
            <Folder size={16} color="var(--text-muted)" strokeWidth={1.5} />
          )}
        </span>

        {/* Name or inline input */}
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
              fontSize: '0.82rem', fontWeight: isSelected ? 600 : 400,
              color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
            }}
            onDoubleClick={e => { e.stopPropagation(); setRenaming(true); }}
            title={node.name}
          >
            {node.name}
          </span>
        )}

        {/* Hover Actions */}
        {hovered && !renaming && node.type !== 'file' && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button
              title="New sub-folder"
              onClick={() => { setCreatingChild(true); setExpanded(true); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '2px 3px', borderRadius: 3, display: 'flex' }}
            >
              <FolderPlus size={14} />
            </button>
            <button
              title="Rename"
              onClick={() => setRenaming(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '2px 3px', borderRadius: 3, display: 'flex' }}
            >
              <Edit2 size={12} />
            </button>
            <button
              title="Delete"
              onClick={handleDelete}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#ef4444', padding: '2px 3px', borderRadius: 3, display: 'flex' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Create child folder inline */}
      {creatingChild && (
        <div style={{ paddingLeft: (depth + 1) * 14 + 24, paddingRight: 8, marginBottom: 2 }}>
          <InlineInput
            defaultValue=""
            placeholder="Folder name…"
            onConfirm={handleCreateChild}
            onCancel={() => setCreatingChild(false)}
          />
        </div>
      )}

      {/* Children: subfolders + files */}
      {expanded && hasChildren && (
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute',
            left: depth * 14 + 16,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'var(--border)',
            opacity: 0.5,
            zIndex: 0
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            {/* Subfolder nodes */}
            {subFolders.map(child => (
              <TreeNode
                key={child.id}
                node={child}
                assets={assets}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onRefresh={onRefresh}
                onDelete={onDelete}
                parentPath={[...parentPath, node.name]}
              />
            ))}
            {/* File rows — always shown when parent expanded */}
            {folderFiles.map(file => (
              <FileRow
                key={file.id}
                file={{ id: file.id, fileName: file.name, folderId: file.parentFolderId }}
                depth={depth + 1}
                onNavigateToFolder={() => onSelect(node.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Slim file row shown in the tree under a folder
function FileRow({ file, depth, onNavigateToFolder }: { file: AssetSlim; depth: number; onNavigateToFolder: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onNavigateToFolder}
      title={file.fileName}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        paddingLeft: depth * 14 + 8,
        paddingRight: 6,
        paddingTop: 3,
        paddingBottom: 3,
        borderRadius: 5,
        cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.04)' : 'transparent',
        transition: 'background 0.12s',
        userSelect: 'none',
        marginBottom: 1,
      }}
    >
      <span style={{ width: 16, flexShrink: 0 }} />
      <span style={{ flexShrink: 0, display: 'flex', color: 'var(--text-muted)', opacity: 0.7 }}>
        <File size={13} strokeWidth={1.5} />
      </span>
      <span style={{
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: '0.76rem',
        color: 'var(--text-muted)',
      }}>
        {file.fileName}
      </span>
    </div>
  );
}

export default function FolderTree({ nodes, assets, selectedId, onSelect, onRefresh }: Props) {
  const [creatingRoot, setCreatingRoot] = useState(false);
  const [hoverRoot, setHoverRoot] = useState(false);
  const [deletingItem, setDeletingItem] = useState<{ id: string; name: string; path: string } | null>(null);

  const performDelete = async () => {
    if (!deletingItem) return;
    await fetch(`/api/folders/${deletingItem.id}`, { method: 'DELETE' });
    setDeletingItem(null);
    onRefresh();
  };

  const handleCreateRoot = async (name: string) => {
    setCreatingRoot(false);
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentFolderId: null }),
    });
    onRefresh();
  };

  return (
    <div style={{ padding: '0.5rem 0.25rem', flex: 1, overflowY: 'auto' }}>
      {/* Root / Home row */}
      <div
        onMouseEnter={() => setHoverRoot(true)}
        onMouseLeave={() => setHoverRoot(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 8px', borderRadius: 6, marginBottom: 4,
          cursor: 'pointer',
          background: selectedId === null ? 'rgba(99,102,241,0.18)' : hoverRoot ? 'rgba(255,255,255,0.05)' : 'transparent',
          transition: 'background 0.15s',
          userSelect: 'none',
        }}
        onClick={() => onSelect(null)}
      >
        <span style={{ width: 16 }} />
        <span style={{ fontSize: '0.9rem', display: 'flex', color: 'var(--text-muted)' }}><Home size={16} color="var(--text-muted)" strokeWidth={1.5} /></span>
        <span style={{
          flex: 1, fontSize: '0.82rem',
          fontWeight: selectedId === null ? 600 : 400,
          color: selectedId === null ? 'var(--accent)' : 'var(--text-primary)',
        }}>
          Root
        </span>
        {hoverRoot && (
          <button
            title="New root folder"
            onClick={e => { e.stopPropagation(); setCreatingRoot(true); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.7rem', color: 'var(--text-muted)', padding: '2px 4px' }}
          >
            +
          </button>
        )}
      </div>

      {/* Create root folder inline */}
      {creatingRoot && (
        <div style={{ paddingLeft: 24, paddingRight: 8, marginBottom: 4 }}>
          <InlineInput
            defaultValue=""
            placeholder="Folder name…"
            onConfirm={handleCreateRoot}
            onCancel={() => setCreatingRoot(false)}
          />
        </div>
      )}

      {nodes.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          assets={assets}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
          onRefresh={onRefresh}
          onDelete={(id, name, path) => setDeletingItem({ id, name, path })}
        />
      ))}

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
