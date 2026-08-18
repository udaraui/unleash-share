'use client';

import { useState, useEffect } from 'react';
import { X, Folder, ChevronRight, ChevronDown, Check, Copy, Edit2, Users, Eye, Link as LinkIcon, Move, Trash2, Mail, RefreshCw } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import InlineInput from './InlineInput';
import { getFileIcon } from '@/lib/iconUtils';

interface SelectedItem {
  type: 'folder' | 'asset';
  id: string;
  name: string;
  createdAt: string;
  mimeType?: string; // For assets
}

interface Share {
  id: string;
  urlSlug: string;
  authMethod: string;
  plainPassword?: string;
  expiresAt?: string;
  remark?: string;
  createdAt: string;
}

function getItemIcon(item: SelectedItem) {
  if (item.type === 'folder') return <Folder size={42} />;
  
  // Note: we don't have isZippedSite here directly, but the utility handles standard file types well
  return getFileIcon(item.name, item.mimeType, 42);
}

function getFriendlyType(item: SelectedItem) {
  if (item.type === 'folder') return 'Folder';
  
  const fileName = item.name.toLowerCase();
  const mimeType = (item.mimeType || '').toLowerCase();
  
  if (fileName.endsWith('.docx') || fileName.endsWith('.doc') || mimeType.includes('word') || mimeType.includes('document')) return 'Word Document';
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Excel Spreadsheet';
  if (fileName.endsWith('.csv') || mimeType.includes('csv')) return 'CSV Spreadsheet';
  if (fileName.endsWith('.pdf') || mimeType === 'application/pdf') return 'PDF Document';
  if (fileName.endsWith('.html') || mimeType === 'text/html') return 'HTML Document';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.includes('zip') || mimeType.includes('rar') || fileName.endsWith('.zip') || fileName.endsWith('.rar')) return 'Archive';
  
  const extIndex = item.name.lastIndexOf('.');
  if (extIndex > -1) {
    return item.name.substring(extIndex + 1).toUpperCase() + ' File';
  }
  
  return 'File';
}

const actionIconStyle: React.CSSProperties = {
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 4,
  width: 28,
  height: 28,
  minWidth: 0,
  fontSize: '0.8rem',
};

export default function ItemDetailsSidebar({
  item,
  onClose,
  onRename,
  onReplace,
  onShareInternally,
  onShareExternally,
  onMove,
  onDelete,
}: {
  item: SelectedItem | null;
  onClose: () => void;
  onRename?: () => void;
  onReplace?: () => void;
  onShareInternally?: () => void;
  onShareExternally?: () => void;
  onMove?: () => void;
  onDelete?: () => void;
}) {
  const [shares, setShares] = useState<Share[]>([]);
  const [internalShares, setInternalShares] = useState<any[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState<string | null>(null);
  const [internalExpanded, setInternalExpanded] = useState(true);
  const [externalExpanded, setExternalExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState<number | string>('50%');
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [deletingShare, setDeletingShare] = useState<{ id: string; name: string } | null>(null);
  const [hoveredShareId, setHoveredShareId] = useState<string | null>(null);
  const [editingShareId, setEditingShareId] = useState<string | null>(null);
  const [hoverInternalHeader, setHoverInternalHeader] = useState(false);
  const [hoverExternalHeader, setHoverExternalHeader] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      setSidebarWidth(Math.max(300, Math.min(newWidth, window.innerWidth - 300)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const fetchItemShares = (targetItem: SelectedItem | null) => {
    if (targetItem) {
      setLoadingInternal(true);
      const queryParam = targetItem.type === 'folder' ? `folderId=${targetItem.id}` : `assetId=${targetItem.id}`;
      fetch(`/api/shares/internal?${queryParam}`)
        .then(res => res.json())
        .then(data => {
          if (data.shares) setInternalShares(data.shares);
        })
        .finally(() => setLoadingInternal(false));

      if (targetItem.type === 'asset') {
        setLoadingShares(true);
        fetch(`/api/shares/external?assetId=${targetItem.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.shares) setShares(data.shares);
          })
          .finally(() => setLoadingShares(false));
      } else {
        setShares([]);
      }
    } else {
      setShares([]);
      setInternalShares([]);
    }
  };

  useEffect(() => {
    fetchItemShares(item);
  }, [item]);

  useEffect(() => {
    const handleRefresh = () => {
      fetchItemShares(item);
    };
    window.addEventListener('explorer-refresh', handleRefresh);
    return () => window.removeEventListener('explorer-refresh', handleRefresh);
  }, [item]);

  const formatDate = (dateStr: string) => 
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });

  const handleCopyLink = (slug: string) => {
    const url = `${window.location.origin}/preview/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(slug);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleCopyPass = (id: string, pass: string) => {
    navigator.clipboard.writeText(pass);
    setCopiedPass(id);
    setTimeout(() => setCopiedPass(null), 2000);
  };

  const updateInternalPermission = async (shareId: string, newLevel: 'VIEW' | 'EDIT') => {
    setInternalShares(prev => prev.map(s => s.id === shareId ? { ...s, permissionLevel: newLevel } : s));
    try {
      const res = await fetch('/api/shares/internal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, permissionLevel: newLevel })
      });
      if (!res.ok) {
        throw new Error('Failed to update permission');
      }
    } catch {
      setInternalShares(prev => prev.map(s => s.id === shareId ? { ...s, permissionLevel: newLevel === 'VIEW' ? 'EDIT' : 'VIEW' } : s));
    }
  };

  const deleteInternalShare = async (shareId: string) => {
    setInternalShares(prev => prev.filter(s => s.id !== shareId));
    try {
      await fetch(`/api/shares/internal?shareId=${shareId}`, {
        method: 'DELETE',
      });
      window.dispatchEvent(new CustomEvent('explorer-refresh'));
    } catch (err) {
      console.error('Failed to delete internal share:', err);
    }
  };

  const performDeleteExternalShare = async () => {
    if (!deletingShare) return;
    const shareId = deletingShare.id;
    setDeletingShare(null);
    setShares(prev => prev.filter(s => s.id !== shareId));
    try {
      await fetch(`/api/shares/external?shareId=${shareId}`, {
        method: 'DELETE',
      });
      window.dispatchEvent(new CustomEvent('explorer-refresh'));
    } catch (err) {
      console.error('Failed to delete external share link:', err);
    }
  };

  const handleRenameExternalShare = async (shareId: string, newTitle: string) => {
    setEditingShareId(null);
    setShares(prev => prev.map(s => s.id === shareId ? { ...s, remark: newTitle } : s));
    try {
      await fetch('/api/shares/external', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareId, remark: newTitle }),
      });
      window.dispatchEvent(new CustomEvent('explorer-refresh'));
    } catch (err) {
      console.error('Failed to rename share title:', err);
    }
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: sidebarWidth,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        flexShrink: 0,
        boxShadow: '-4px 0 24px rgba(0,0,0,0.02)',
        userSelect: isDragging ? 'none' : 'auto'
      }}
    >
      {/* Drag Handle */}
      <div
        onMouseDown={() => setIsDragging(true)}
        style={{
          position: 'absolute',
          left: -3,
          top: 0,
          bottom: 0,
          width: 6,
          cursor: 'col-resize',
          zIndex: 10,
          background: isDragging ? 'var(--accent)' : 'transparent',
          transition: 'background 0.2s'
        }}
        onMouseEnter={(e) => { if (!isDragging) e.currentTarget.style.background = 'rgba(99,102,241,0.2)' }}
        onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.background = 'transparent' }}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {!item ? (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', padding: '1.25rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>🖱️</div>
            Select an item to view its details and shared links.
          </div>
        ) : (
          <>
            {/* Fixed Header */}
            <div style={{ padding: '1.25rem 1.25rem 0', flexShrink: 0 }}>
              {/* Top Bar with Hover Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '0.5rem', minHeight: '28px' }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '4px', 
                  opacity: isHovered ? 1 : 0, 
                  pointerEvents: isHovered ? 'auto' : 'none',
                  transition: 'opacity 0.2s ease-in-out',
                }}>
                  {item.type === 'asset' && (
                    <a
                      href={`/api/proxy/internal/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="sidebar-action-btn"
                      style={{ display: 'inline-flex', textDecoration: 'none' }}
                      title="View / Preview"
                    >
                      <Eye size={15} />
                    </a>
                  )}
                  {onRename && (
                    <button onClick={onRename} className="sidebar-action-btn" title="Rename">
                      <Edit2 size={15} />
                    </button>
                  )}
                  {onReplace && (
                    <button onClick={onReplace} className="sidebar-action-btn" title="Replace File">
                      <RefreshCw size={15} />
                    </button>
                  )}
                  {onMove && (
                    <button onClick={onMove} className="sidebar-action-btn" title="Move to...">
                      <Move size={15} />
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={onDelete} className="sidebar-action-btn" style={{ color: 'var(--danger)' }} title="Delete">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              {/* Basic Metadata with Adjusted Spacing & Larger Icon */}
              <div>
                <div style={{ 
                  width: 80, height: 80, borderRadius: 20, 
                  background: 'var(--bg-elevated)', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  flexShrink: 0, margin: '0.5rem auto 0.75rem', 
                  color: 'var(--text-muted)' 
                }}>
                  {getItemIcon(item)}
                </div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, wordBreak: 'break-all', textAlign: 'center', marginBottom: '0.75rem' }}>
                  {item.name}
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Type</span>
                    <span style={{ fontWeight: 500 }}>{getFriendlyType(item)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Created</span>
                    <span style={{ fontWeight: 500 }}>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollable Shares Content Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem 1.25rem', marginTop: '0.75rem' }}>

        {/* Internal Shares Section */}
        <div
          onMouseEnter={() => setHoverInternalHeader(true)}
          onMouseLeave={() => setHoverInternalHeader(false)}
        >
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
          <div
            onClick={() => setInternalExpanded(!internalExpanded)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              cursor: 'pointer', marginBottom: internalExpanded ? '1rem' : 0, userSelect: 'none'
            }}
          >
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
              {internalExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Shared Internally With
              <div style={{ opacity: hoverInternalHeader ? 1 : 0, pointerEvents: hoverInternalHeader ? 'auto' : 'none', transition: 'opacity 0.2s', marginLeft: '0.25rem', display: 'flex' }}>
                {onShareInternally && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onShareInternally(); }} 
                    className="sidebar-action-btn" 
                    title="Share Internally"
                    style={{ width: 22, height: 22 }}
                  >
                    <Users size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {internalExpanded && (
            loadingInternal ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</div>
            ) : internalShares.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Not shared internally.
              </div>
            ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {internalShares.map(share => (
                <div key={share.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem',
                  background: 'var(--bg-secondary)', fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{share.sharedWithUser?.fullName || 'User'}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{share.sharedWithUser?.email}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginRight: '4px' }}>Permission:</span>
                      <select
                        value={share.permissionLevel}
                        onChange={(e) => updateInternalPermission(share.id, e.target.value as 'VIEW' | 'EDIT')}
                        style={{
                          background: 'transparent', border: 'none', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-secondary)',
                          cursor: 'pointer', outline: 'none'
                        }}
                      >
                        <option value="VIEW">VIEW</option>
                        <option value="EDIT">EDIT</option>
                      </select>
                    </div>
                    <button 
                      onClick={() => deleteInternalShare(share.id)}
                      className="sidebar-action-btn"
                      style={{ color: 'var(--danger)', width: 24, height: 24, flexShrink: 0 }}
                      title="Remove Access"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            )
          )}
        </div>

        {/* External Shares Section */}
        {item.type === 'asset' && (
          <div
            onMouseEnter={() => setHoverExternalHeader(true)}
            onMouseLeave={() => setHoverExternalHeader(false)}
          >
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
            <div
              onClick={() => setExternalExpanded(!externalExpanded)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', marginBottom: externalExpanded ? '1rem' : 0, userSelect: 'none'
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0' }}>
                {externalExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                Shared External Links
                <div style={{ opacity: hoverExternalHeader ? 1 : 0, pointerEvents: hoverExternalHeader ? 'auto' : 'none', transition: 'opacity 0.2s', marginLeft: '0.25rem', display: 'flex' }}>
                  {onShareExternally && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onShareExternally(); }} 
                      className="sidebar-action-btn" 
                      title="Share Externally"
                      style={{ width: 22, height: 22 }}
                    >
                      <LinkIcon size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {externalExpanded && (
              loadingShares ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</div>
              ) : shares.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No active links for this file.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {shares.map(share => {
                  const isExpired = share.expiresAt ? new Date() > new Date(share.expiresAt) : false;
                  return (
                    <div
                      key={share.id}
                      onMouseEnter={() => setHoveredShareId(share.id)}
                      onMouseLeave={() => setHoveredShareId(null)}
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '0.75rem',
                        background: 'var(--bg-secondary)',
                        fontSize: '0.78rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.6rem' }}>
                        {editingShareId === share.id ? (
                          <div style={{ flex: 1 }}>
                            <InlineInput
                              defaultValue={share.remark || ''}
                              placeholder="Link title…"
                              onConfirm={(val) => handleRenameExternalShare(share.id, val)}
                              onCancel={() => setEditingShareId(null)}
                            />
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                            <span
                              onDoubleClick={() => setEditingShareId(share.id)}
                              style={{ fontWeight: 600, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                              title="Double-click to rename title"
                            >
                              {share.remark ? share.remark : `/${share.urlSlug}`}
                            </span>
                            <button onClick={() => handleCopyLink(share.urlSlug)} className="sidebar-action-btn" style={{ width: 22, height: 22, flexShrink: 0 }} title="Copy Link">
                              {copiedLink === share.urlSlug ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            </button>
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '2px', 
                              flexShrink: 0,
                              opacity: hoveredShareId === share.id ? 1 : 0,
                              pointerEvents: hoveredShareId === share.id ? 'auto' : 'none',
                              transition: 'opacity 0.15s ease-in-out'
                            }}>
                              <button
                                onClick={() => setEditingShareId(share.id)}
                                className="sidebar-action-btn"
                                style={{ width: 24, height: 24 }}
                                title="Rename Title"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => {
                                  const link = `${window.location.origin}/preview/${share.urlSlug}`;
                                  const title = share.remark || item?.name || 'Shared File';
                                  const subject = encodeURIComponent(`Shared with you: ${title}`);
                                  const token = share.plainPassword || '(see token in Share Portal)';
                                  const titleInfo = [
                                    share.remark ? `Title: ${share.remark}` : '',
                                    item?.name ? `File: ${item.name}` : ''
                                  ].filter(Boolean).join('\n');
                                  const detailsBlock = titleInfo ? `${titleInfo}\n` : '';
                                  const body = encodeURIComponent(
                                    `Hi,\n\nI'd like to share a file with you via Share Portal.\n\n${detailsBlock}Link: ${link}\nAccess Token: ${token}\n\nPlease use the token above to access the file.\n\nBest regards`
                                  );
                                  window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
                                }}
                                className="sidebar-action-btn"
                                style={{ width: 24, height: 24 }}
                                title="Share via Email"
                              >
                                <Mail size={13} />
                              </button>
                              <button onClick={() => setDeletingShare({ id: share.id, name: share.remark ? share.remark : `/${share.urlSlug}` })} className="sidebar-action-btn" style={{ width: 24, height: 24, color: 'var(--danger)' }} title="Delete Link">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {share.authMethod === 'PASSWORD' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', background: 'var(--bg-card)', padding: '4px 6px', borderRadius: 4 }}>
                          <span style={{ color: 'var(--text-muted)' }}>Access Token:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'monospace', fontWeight: 600, letterSpacing: '0.1em' }}>
                              {share.plainPassword ? '********' : 'Hidden'}
                            </span>
                            {share.plainPassword && (
                              <button onClick={() => handleCopyPass(share.id, share.plainPassword!)} className="sidebar-action-btn" style={{ width: 22, height: 22 }} title="Copy Access Token">
                                {copiedPass === share.id ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {share.expiresAt && (
                        <div style={{ marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px', color: isExpired ? 'var(--danger)' : 'var(--text-secondary)' }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: isExpired ? 'var(--danger)' : 'var(--success)' }} />
                          <span style={{ fontWeight: 500 }}>Expires:</span> {formatDate(share.expiresAt)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
          </div>
        )}
            </div>
          </>
        )}
      </div>

      {/* Delete External Share Confirmation Modal */}
      {deletingShare && (
        <ConfirmModal
          title="Delete Share Link"
          message={
            <div>
              <p style={{ marginBottom: '0.75rem' }}>
                Are you sure you want to delete the share link <strong>{deletingShare.name}</strong>?
              </p>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-secondary)',
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                wordBreak: 'break-all'
              }}>
                Recipients with this link will no longer be able to access the file.
              </div>
            </div>
          }
          confirmText="Delete Link"
          danger={true}
          onConfirm={performDeleteExternalShare}
          onCancel={() => setDeletingShare(null)}
        />
      )}
    </div>
  );
}
