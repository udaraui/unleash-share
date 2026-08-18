'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import InlineInput from './InlineInput';
import UploadModal from './UploadModal';
import MoveModal from './MoveModal';
import ShareModal from './ShareModal';
import InternalShareModal from './InternalShareModal';
import ItemDetailsSidebar from './ItemDetailsSidebar';
import ConfirmModal from './ConfirmModal';
import { Globe, SquarePlay, ImageIcon, FileText, Sheet, Archive, File, Home, ChevronRight, FolderPlus, UploadCloud, FolderOpen, Folder, MoreVertical, Edit2, Users, Eye, Link as LinkIcon, Move, Trash2, FileCodeCorner, BookOpenText, RefreshCw } from 'lucide-react';
import { getFileIcon } from '@/lib/iconUtils';

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
  breadcrumb: { id: string | null; name: string }[];
  initialFolders: Folder[];
  initialAssets: Asset[];
  currentFolder: Folder | null;
  permissionLevel?: 'VIEW' | 'EDIT' | 'OWNER';
}


function splitFileName(fileName: string) {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot > 0) {
    return {
      baseName: fileName.substring(0, lastDot),
      extension: fileName.substring(lastDot),
    };
  }
  return { baseName: fileName, extension: '' };
}

function getFileBadge(asset: Asset) {
  const { extension } = splitFileName(asset.fileName);
  if (extension) {
    return extension.replace('.', '').toUpperCase();
  }
  if (asset.isZippedSite) return 'ZIP SITE';
  const sub = asset.mimeType.split('/')[1] || '';
  if (sub.includes('pdf')) return 'PDF';
  if (sub.includes('word') || sub.includes('document')) return 'DOCX';
  if (sub.includes('sheet') || sub.includes('excel')) return 'XLSX';
  if (sub.includes('presentation') || sub.includes('powerpoint')) return 'PPTX';
  return sub.toUpperCase().slice(0, 8);
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function DashboardContents({ folderId, breadcrumb, initialFolders, initialAssets, currentFolder, permissionLevel = 'OWNER' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renamingAsset, setRenamingAsset] = useState<string | null>(null);
  const [movingItem, setMovingItem] = useState<{ type: 'folder' | 'asset'; id: string; name: string } | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: 'folder' | 'asset'; id: string; name: string; path: string } | null>(null);
  const [sharingAsset, setSharingAsset] = useState<{ id: string; name: string; path: string } | null>(null);
  const [internalSharingItem, setInternalSharingItem] = useState<{ type: 'folder' | 'asset'; id: string; name: string } | null>(null);
  const [replacingAsset, setReplacingAsset] = useState<{ id: string; name: string } | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [hoverHeader, setHoverHeader] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; type: 'folder' | 'asset'; id: string; name: string;
  } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'folder' | 'asset'; id: string; name: string; createdAt: string; mimeType?: string;
  } | null>(null);

  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);

  useEffect(() => {
    setFolders(initialFolders);
    setAssets(initialAssets);
  }, [initialFolders, initialAssets]);

  useEffect(() => {
    const assetId = searchParams.get('assetId');
    if (assetId) {
      const asset = initialAssets.find(a => a.id === assetId);
      if (asset) {
        setSelectedItem({
          type: 'asset',
          id: asset.id,
          name: asset.fileName,
          createdAt: asset.createdAt,
          mimeType: asset.mimeType,
        });
        return;
      }
    }
    if (currentFolder) {
      setSelectedItem({
        type: 'folder',
        id: currentFolder.id,
        name: currentFolder.name,
        createdAt: currentFolder.createdAt,
      });
    } else {
      setSelectedItem(null);
    }
  }, [folderId, currentFolder, searchParams, initialAssets]);

  const navigate = (id: string | null) => {
    startTransition(() => {
      router.push(id ? `/portal/dashboard?folderId=${id}` : '/portal/dashboard');
    });
  };

  const refresh = () => {
    startTransition(() => {
      router.refresh();
      window.dispatchEvent(new Event('explorer-refresh'));
    });
  };

  const handleRenameFolder = async (id: string, name: string) => {
    setRenamingFolder(null);
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    await fetch(`/api/folders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    refresh();
  };

  const handleRenameAsset = async (id: string, fileName: string) => {
    setRenamingAsset(null);
    setAssets(prev => prev.map(a => a.id === id ? { ...a, fileName } : a));
    await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName }),
    });
    refresh();
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
      setFolders(prev => prev.filter(f => f.id !== deletingItem.id));
      await fetch(`/api/folders/${deletingItem.id}`, { method: 'DELETE' });
    } else {
      setAssets(prev => prev.filter(a => a.id !== deletingItem.id));
      await fetch(`/api/assets/${deletingItem.id}`, { method: 'DELETE' });
    }
    setDeletingItem(null);
    refresh();
  };

  const handleCreateFolder = async (name: string) => {
    setCreatingFolder(false);
    await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentFolderId: folderId }),
    });
    refresh();
  };

  const openContext = (e: React.MouseEvent, type: 'folder' | 'asset', id: string, name: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type, id, name });
  };

  const isEmpty = folders.length === 0 && assets.length === 0;
  const currentName = breadcrumb[breadcrumb.length - 1]?.name ?? 'HOME';
  const canEdit = permissionLevel === 'OWNER' || permissionLevel === 'EDIT';

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden' }}>
      {/* Main Content Area */}
      <div 
        onMouseEnter={() => setHoverHeader(true)}
        onMouseLeave={() => setHoverHeader(false)}
        onClick={() => {
          setContextMenu(null);
          if (searchParams.get('assetId')) {
            const params = new URLSearchParams(searchParams.toString());
            params.delete('assetId');
            router.replace(`${pathname}?${params.toString()}`);
          } else if (!currentFolder) {
            setSelectedItem(null);
          } else {
            setSelectedItem({
              type: 'folder',
              id: currentFolder.id,
              name: currentFolder.name,
              createdAt: currentFolder.createdAt,
            });
          }
        }}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0, padding: '1.75rem 0 1.75rem 2rem', paddingRight: '1rem' }}
      >
        {/* Page header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexShrink: 0, gap: '1rem', flexWrap: 'wrap' }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap', fontSize: '0.82rem' }}>
            {breadcrumb.map((crumb, i) => {
              const isLast = i === breadcrumb.length - 1;
              const isHome = i === 0 || crumb.id === null;
              return (
                <span key={crumb.id ?? 'root'} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {i > 0 && <span style={{ color: 'var(--text-muted)' }}><ChevronRight size={14} /></span>}
                  <span
                    onClick={() => navigate(crumb.id)}
                    style={{
                      cursor: !isLast ? 'pointer' : 'default',
                      color: isLast ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: isLast ? 700 : 500,
                      fontSize: isLast ? '1.35rem' : '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                  {isHome ? <span><Home size={16} /></span> : <span>{crumb.name}</span>}
                </span>
              </span>
            );
          })}
        </div>

        {/* Toolbar */}
        {canEdit && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.25rem',
            opacity: hoverHeader ? 1 : 0,
            pointerEvents: hoverHeader ? 'auto' : 'none',
            transition: 'opacity 0.2s ease-in-out'
          }}>
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
              title="Upload Here"
            >
              <UploadCloud size={18} />
            </button>
          </div>
        )}
        </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Inline new folder */}
        {creatingFolder && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 0.75rem',
            border: '2px solid var(--accent)', borderRadius: 10,
            background: 'rgba(99,102,241,0.08)',
            marginBottom: '1rem', width: 200,
          }}>
            <span style={{ fontSize: '1.1rem', display: 'flex' }}><Folder size={18} /></span>
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
            paddingTop: '4rem', textAlign: 'center', color: 'var(--text-muted)',
          }}>
            <div style={{ marginBottom: '0.75rem', display: 'flex' }}><FolderOpen size={48} strokeWidth={1.5} /></div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>This folder is empty</div>
            <div style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>{canEdit ? 'Create a sub-folder or upload files to get started.' : 'Nothing has been shared here yet.'}</div>
            {canEdit && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => setCreatingFolder(true)} className="btn btn-ghost" style={{ fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}><FolderPlus size={14} /> New Folder</button>
                <button onClick={() => setShowUpload(true)} className="btn btn-primary" style={{ fontSize: '0.8rem', display: 'flex', gap: '0.25rem', alignItems: 'center' }}><UploadCloud size={14} /> Upload</button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Folders */}
            {folders.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                  Folders
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '0.5rem' }}>
                  {folders.map(folder => (
                    <div
                      key={folder.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete('assetId');
                        router.replace(`${pathname}?${params.toString()}`);
                        setSelectedItem({ type: 'folder', id: folder.id, name: folder.name, createdAt: folder.createdAt });
                      }}
                      onDoubleClick={() => navigate(folder.id)}
                      onContextMenu={e => openContext(e, 'folder', folder.id, folder.name)}
                      className={`card ${selectedItem?.id === folder.id ? 'selected' : ''}`}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.6rem 0.75rem',
                        cursor: 'pointer',
                        position: 'relative',
                        userSelect: 'none',
                        transition: 'all 0.15s',
                        borderColor: selectedItem?.id === folder.id ? 'var(--accent)' : undefined,
                        boxShadow: selectedItem?.id === folder.id ? 'inset 0 0 0 1px var(--accent)' : undefined,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <span style={{ flexShrink: 0, display: 'flex', color: 'var(--text-muted)' }}><Folder size={24} /></span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renamingFolder === folder.id ? (
                          <InlineInput
                            defaultValue={folder.name}
                            onConfirm={n => handleRenameFolder(folder.id, n)}
                            onCancel={() => setRenamingFolder(null)}
                          />
                        ) : (
                          <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {folder.name}
                          </div>
                        )}
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{formatDate(folder.createdAt)}</div>
                        <button
                          onClick={(e) => { e.stopPropagation(); openContext(e, 'folder', folder.id, folder.name); }}
                          className="btn btn-ghost"
                          style={{
                            position: 'absolute', top: '50%', right: '0.25rem', transform: 'translateY(-50%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 24, height: 24, padding: 0, borderRadius: '50%',
                            opacity: 0.7, zIndex: 2
                          }}
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Files */}
            {assets.length > 0 && (
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
                  Files
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.5rem' }}>
                  {assets.map(asset => (
                    <div
                      key={asset.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('assetId', asset.id);
                        router.replace(`${pathname}?${params.toString()}`);
                      }}
                      onContextMenu={e => openContext(e, 'asset', asset.id, asset.fileName)}
                      className={`card ${selectedItem?.id === asset.id ? 'selected' : ''}`}
                      style={{
                        padding: '1rem',
                        cursor: 'pointer',
                        display: 'flex', gap: '1rem', alignItems: 'flex-start',
                        position: 'relative',
                        borderColor: selectedItem?.id === asset.id ? 'var(--accent)' : undefined,
                        boxShadow: selectedItem?.id === asset.id ? 'inset 0 0 0 1px var(--accent)' : undefined,
                        userSelect: 'none',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <span style={{ fontSize: '1.4rem', flexShrink: 0, marginTop: 1, color: 'var(--text-muted)' }}>{getFileIcon(asset.fileName, asset.mimeType, 24, asset.isZippedSite)}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {renamingAsset === asset.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', width: '100%' }}>
                            <InlineInput
                              defaultValue={splitFileName(asset.fileName).baseName}
                              placeholder="File name…"
                              onConfirm={n => {
                                const { extension } = splitFileName(asset.fileName);
                                handleRenameAsset(asset.id, `${n}${extension}`);
                              }}
                              onCancel={() => setRenamingAsset(null)}
                            />
                            {splitFileName(asset.fileName).extension && (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                                background: 'rgba(255,255,255,0.06)',
                                padding: '2px 5px',
                                borderRadius: 4,
                                flexShrink: 0,
                                userSelect: 'none',
                              }}>
                                {splitFileName(asset.fileName).extension}
                              </span>
                            )}
                          </div>
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
                          {getFileBadge(asset)} · {formatDate(asset.createdAt)}
                        </div>
                        {/* Context Menu Button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); openContext(e, 'asset', asset.id, asset.fileName); }}
                          className="btn btn-ghost"
                          style={{
                            position: 'absolute', top: '0.5rem', right: '0.5rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 28, height: 28, padding: 0, borderRadius: '50%',
                            opacity: 0.7, zIndex: 2
                          }}
                          title="Actions"
                        >
                          <MoreVertical size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>

      {/* Right Sidebar */}
      <ItemDetailsSidebar
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onRename={canEdit && selectedItem ? () => {
          if (selectedItem.type === 'folder') setRenamingFolder(selectedItem.id);
          else setRenamingAsset(selectedItem.id);
        } : undefined}
        onShareInternally={permissionLevel === 'OWNER' && selectedItem ? () => {
          setInternalSharingItem({ type: selectedItem.type, id: selectedItem.id, name: selectedItem.name });
        } : undefined}
        onShareExternally={selectedItem?.type === 'asset' && canEdit && selectedItem ? () => {
          setSharingAsset({ id: selectedItem.id, name: selectedItem.name, path: getItemPath(selectedItem.id, selectedItem.name) });
        } : undefined}
        onMove={permissionLevel === 'OWNER' && selectedItem && !(selectedItem.type === 'folder' && folderId === null) ? () => {
          setMovingItem({ type: selectedItem.type, id: selectedItem.id, name: selectedItem.name });
        } : undefined}
        onReplace={selectedItem?.type === 'asset' && canEdit ? () => {
          setReplacingAsset({ id: selectedItem.id, name: selectedItem.name });
        } : undefined}
        onDelete={permissionLevel === 'OWNER' && selectedItem ? () => {
          if (selectedItem.type === 'folder') handleDeleteFolder(selectedItem.id, selectedItem.name);
          else handleDeleteAsset(selectedItem.id, selectedItem.name);
        } : undefined}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed', top: contextMenu.y, left: contextMenu.x,
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            zIndex: 9999, minWidth: 160, overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {contextMenu.type === 'folder' && (
            <button onClick={() => navigate(contextMenu.id)} style={ctxItemStyle}>
              <FolderOpen size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Open
            </button>
          )}
          {contextMenu.type === 'asset' && (
            <a
              href={`/api/proxy/internal/${contextMenu.id}`}
              target="_blank"
              rel="noreferrer"
              style={{ ...ctxItemStyle, textDecoration: 'none' }}
              onClick={() => setContextMenu(null)}
            >
              <Eye size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> View / Preview
            </a>
          )}
          {permissionLevel === 'OWNER' && (
            <button
              onClick={() => {
                setInternalSharingItem({ type: contextMenu.type, id: contextMenu.id, name: contextMenu.name });
                setContextMenu(null);
              }}
              style={ctxItemStyle}
            >
              <Users size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Share Internally
            </button>
          )}
          {contextMenu.type === 'asset' && canEdit && (
            <button
              onClick={() => {
                setSharingAsset({ id: contextMenu.id, name: contextMenu.name, path: getItemPath(contextMenu.id, contextMenu.name) });
                setContextMenu(null);
              }}
              style={ctxItemStyle}
            >
              <LinkIcon size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Share Externally
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => {
                if (contextMenu.type === 'folder') setRenamingFolder(contextMenu.id);
                else setRenamingAsset(contextMenu.id);
                setContextMenu(null);
              }}
              style={ctxItemStyle}
            >
              <Edit2 size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Rename
            </button>
          )}
          {contextMenu.type === 'asset' && canEdit && (
            <button
              onClick={() => {
                setReplacingAsset({ id: contextMenu.id, name: contextMenu.name });
                setContextMenu(null);
              }}
              style={ctxItemStyle}
            >
              <RefreshCw size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Replace
            </button>
          )}
          {permissionLevel === 'OWNER' && (
            <button
              onClick={() => {
                setMovingItem({ type: contextMenu.type, id: contextMenu.id, name: contextMenu.name });
                setContextMenu(null);
              }}
              style={{
                ...ctxItemStyle,
                opacity: contextMenu.type === 'folder' && folderId === null ? 0.5 : 1,
                cursor: contextMenu.type === 'folder' && folderId === null ? 'not-allowed' : 'pointer'
              }}
              disabled={contextMenu.type === 'folder' && folderId === null}
              title={contextMenu.type === 'folder' && folderId === null ? 'First-level folders cannot be moved' : ''}
            >
              <Move size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Move to…
            </button>
          )}
          {permissionLevel === 'OWNER' && (
            <button
              onClick={() => {
                if (contextMenu.type === 'folder') handleDeleteFolder(contextMenu.id, contextMenu.name);
                else handleDeleteAsset(contextMenu.id, contextMenu.name);
                setContextMenu(null);
              }}
              style={{ ...ctxItemStyle, color: '#ef4444' }}
            >
              <Trash2 size={14} style={{ display: 'inline', marginRight: '0.5rem' }} /> Delete
            </button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          folderId={folderId}
          folderName={currentName}
          existingAssets={initialAssets}
          onUploaded={() => { setShowUpload(false); refresh(); }}
          onClose={() => setShowUpload(false)}
        />
      )}

      {/* Replace Modal */}
      {replacingAsset && (
        <UploadModal
          folderId={folderId}
          folderName={currentName}
          replaceAsset={replacingAsset}
          onUploaded={() => { setReplacingAsset(null); refresh(); }}
          onClose={() => setReplacingAsset(null)}
        />
      )}

      {/* Move Modal */}
      {movingItem && (
        <MoveModal
          item={movingItem}
          currentFolderId={folderId}
          onMoved={() => { setMovingItem(null); refresh(); }}
          onClose={() => setMovingItem(null)}
        />
      )}

      {/* Share Modal */}
      {sharingAsset && (
        <ShareModal
          assetId={sharingAsset.id}
          assetName={sharingAsset.name}
          assetPath={sharingAsset.path}
          onClose={() => setSharingAsset(null)}
        />
      )}

      {/* Internal Share Modal */}
      {internalSharingItem && (
        <InternalShareModal
          item={internalSharingItem}
          onClose={() => setInternalSharingItem(null)}
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

const ctxItemStyle: React.CSSProperties = {
  display: 'block', width: '100%', textAlign: 'left',
  padding: '0.55rem 1rem', background: 'none', border: 'none',
  cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-primary)',
};
