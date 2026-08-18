'use client';

import { useState } from 'react';
import InlineInput from './InlineInput';
import UploadModal from './UploadModal';
import ConfirmModal from './ConfirmModal';
import { Globe, SquarePlay, ImageIcon, FileText, Sheet, Archive, File, FolderOpen, Folder, FolderPlus, UploadCloud, Edit2, Trash2, FileCodeCorner, BookOpenText } from 'lucide-react';

interface Folder {
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
}

interface Props {
  folderId: string | null;
  folderName: string;
  breadcrumb: { id: string | null; name: string }[];
  folders: Folder[];
  assets: Asset[];
  onNavigate: (id: string | null) => void;
  onRefresh: () => void;
  detailWidth?: number;
}

function fileIcon(asset: Asset) {
  const fileName = asset.fileName.toLowerCase();
  const mimeType = asset.mimeType.toLowerCase();

  if (asset.isZippedSite) return <Globe size={24} />;
  if (mimeType === 'text/html' || fileName.endsWith('.html')) return <FileCodeCorner size={24} />;
  
  if (fileName.endsWith('.doc') || fileName.endsWith('.docx') || mimeType.includes('word') || mimeType.includes('document')) {
    return <BookOpenText size={24} />;
  }

  if (fileName.endsWith('.csv') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx') || mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
    return <Sheet size={24} />;
  }

  if (mimeType.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.avi') || fileName.endsWith('.mkv')) {
    return <SquarePlay size={24} />;
  }

  if (mimeType.startsWith('image/')) return <ImageIcon size={24} />;
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return <FileText size={24} />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || fileName.endsWith('.zip') || fileName.endsWith('.rar')) return <Archive size={24} />;
  
  return <File size={24} />;
}

export default function FolderContents({ folderId, folderName, breadcrumb, folders, assets, onNavigate, onRefresh, detailWidth = 260 }: Props) {
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renamingAsset, setRenamingAsset] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'folder' | 'asset'; id: string; name: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'folder' | 'asset'; id: string; name: string; path: string } | null>(null);

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handleRenameFolder = async (id: string, name: string) => {
    setRenamingFolder(null);
    await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    onRefresh();
  };

  const handleRenameAsset = async (id: string, fileName: string) => {
    setRenamingAsset(null);
    await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName }),
    });
    onRefresh();
  };

  const getItemPath = (id: string, name: string) => {
    const foldersPath = breadcrumb.filter(b => b.id !== null).map(b => b.name);
    if (id === folderId) {
      return foldersPath.join(' / ');
    }
    return [...foldersPath, name].join(' / ');
  };

  const handleDeleteFolder = (id: string, name: string) => {
    setContextMenu(null);
    setDeletingItem({ type: 'folder', id, name, path: getItemPath(id, name) });
  };

  const handleDeleteAsset = (id: string, name: string) => {
    setContextMenu(null);
    setDeletingItem({ type: 'asset', id, name, path: getItemPath(id, name) });
  };

  const performDelete = async () => {
    if (!deletingItem) return;
    if (deletingItem.type === 'folder') {
      await fetch(`/api/folders/${deletingItem.id}`, { method: 'DELETE' });
    } else {
      await fetch(`/api/assets/${deletingItem.id}`, { method: 'DELETE' });
    }
    setDeletingItem(null);
    onRefresh();
  };

  const handleCreateFolder = async (name: string) => {
    setCreatingFolder(false);
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentFolderId: folderId }),
    });
    onRefresh();
  };

  const openContext = (e: React.MouseEvent, type: 'folder' | 'asset', id: string, name: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id, name });
  };

  const isEmpty = folders.length === 0 && assets.length === 0;

  return (
    <div
      style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
      onClick={() => setContextMenu(null)}
    >
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Breadcrumb */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
          {breadcrumb.map((crumb, i) => (
            <span key={crumb.id ?? 'root'} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              {i > 0 && <span style={{ color: 'var(--text-muted)' }}>›</span>}
              <span
                onClick={() => onNavigate(crumb.id)}
                style={{
                  cursor: i < breadcrumb.length - 1 ? 'pointer' : 'default',
                  color: i < breadcrumb.length - 1 ? 'var(--accent)' : 'var(--text-primary)',
                  fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                }}
                className={i < breadcrumb.length - 1 ? 'hover-underline' : ''}
              >
                {crumb.name}
              </span>
            </span>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={() => setCreatingFolder(true)}
          className="sidebar-action-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, padding: 0 }}
          title="New Folder"
        >
          <FolderPlus size={18} />
        </button>
        <button
          onClick={() => setShowUpload(true)}
          className="sidebar-action-btn"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 6, padding: 0 }}
          title="Upload"
        >
          <UploadCloud size={18} />
        </button>
      </div>

      {/* Contents */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>

        {/* New folder inline creation */}
        {creatingFolder && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 0.75rem',
            border: '2px solid var(--accent)',
            borderRadius: 10,
            background: 'rgba(99,102,241,0.08)',
            marginBottom: '0.75rem',
            width: 200,
          }}>
            <span style={{ fontSize: '1.25rem', display: 'flex' }}><Folder size={20} /></span>
            <InlineInput
              defaultValue=""
              placeholder="Folder name…"
              onConfirm={handleCreateFolder}
              onCancel={() => setCreatingFolder(false)}
            />
          </div>
        )}

        {isEmpty && !creatingFolder ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '60%', textAlign: 'center', color: 'var(--text-muted)',
          }}>
            <div style={{ marginBottom: '0.75rem', display: 'flex' }}><FolderOpen size={48} strokeWidth={1.5} /></div>
            <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>This folder is empty</div>
            <div style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>Create a folder or upload files to get started.</div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setCreatingFolder(true)} className="btn btn-ghost" style={{ fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}><Folder size={14} /> New Folder</button>
              <button onClick={() => setShowUpload(true)} className="btn btn-primary" style={{ fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}><UploadCloud size={14} /> Upload</button>
            </div>
          </div>
        ) : (
          <div>
            {/* Folders grid */}
            {folders.length > 0 && (
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Folders
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      onDoubleClick={() => onNavigate(folder.id)}
                      onContextMenu={e => openContext(e, 'folder', folder.id, folder.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.6rem 0.75rem',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <span style={{ flexShrink: 0, display: 'flex', color: 'var(--text-muted)' }}><Folder size={24} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renamingFolder === folder.id ? (
                          <InlineInput
                            defaultValue={folder.name}
                            onConfirm={name => handleRenameFolder(folder.id, name)}
                            onCancel={() => setRenamingFolder(null)}
                          />
                        ) : (
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {folder.name}
                          </div>
                        )}
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatDate(folder.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files grid */}
            {assets.length > 0 && (
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Files
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.5rem' }}>
                  {assets.map(asset => (
                    <div
                      key={asset.id}
                      onContextMenu={e => openContext(e, 'asset', asset.id, asset.fileName)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                        padding: '0.7rem 0.75rem',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--bg-card)',
                        cursor: 'default',
                        transition: 'all 0.15s',
                        userSelect: 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 1, color: 'var(--text-muted)' }}>{fileIcon(asset)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renamingAsset === asset.id ? (
                          <InlineInput
                            defaultValue={asset.fileName}
                            onConfirm={name => handleRenameAsset(asset.id, name)}
                            onCancel={() => setRenamingAsset(null)}
                          />
                        ) : (
                          <div
                            style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            onDoubleClick={() => setRenamingAsset(asset.id)}
                            title={asset.fileName}
                          >
                            {asset.fileName}
                          </div>
                        )}
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {asset.mimeType.split('/')[1]?.toUpperCase()} · {formatDate(asset.createdAt)}
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                          {asset.isZippedSite && (
                            <a
                              href={`/preview/${asset.azureStoragePath.split('/').pop()?.replace('.zip', '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost"
                              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                            >
                              Preview
                            </a>
                          )}
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                            onClick={() => setRenamingAsset(asset.id)}
                          >
                            Rename
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: '0.7rem', padding: '2px 8px', color: '#ef4444' }}
                            onClick={() => handleDeleteAsset(asset.id, asset.fileName)}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 999,
            minWidth: 160,
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {[
            {
              id: 'rename',
              label: <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Edit2 size={14} /> Rename</span>,
              action: () => {
                if (contextMenu.type === 'folder') setRenamingFolder(contextMenu.id);
                else setRenamingAsset(contextMenu.id);
                setContextMenu(null);
              },
            },
            {
              id: 'delete',
              label: <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Trash2 size={14} /> Delete</span>,
              danger: true,
              action: () => {
                if (contextMenu.type === 'folder') handleDeleteFolder(contextMenu.id, contextMenu.name);
                else handleDeleteAsset(contextMenu.id, contextMenu.name);
              },
            },
          ].map(item => (
            <button
              key={item.id}
              onClick={item.action}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '0.55rem 1rem',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem',
                color: item.danger ? '#ef4444' : 'var(--text-primary)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          folderId={folderId}
          folderName={folderName}
          existingAssets={assets}
          onUploaded={() => { setShowUpload(false); onRefresh(); }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Delete Confirmation */}
      {deletingItem && (
        <ConfirmModal
          title={`Delete ${deletingItem.type === 'folder' ? 'Folder' : 'File'}`}
          message={
            <div>
              <p style={{ marginBottom: '0.75rem' }}>
                Are you sure you want to delete the {deletingItem.type === 'folder' ? 'folder' : 'file'} <strong>{deletingItem.name}</strong>{deletingItem.type === 'folder' && ' and all its contents'} permanently?
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
