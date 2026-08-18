'use client';

import { useState, useCallback, useRef } from 'react';
import { X, UploadCloud, Folder } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

interface Props {
  folderId: string | null;
  folderName: string;
  existingAssets?: { id: string; fileName: string }[];
  replaceAsset?: { id: string; name: string } | null;
  onUploaded: () => void;
  onClose: () => void;
}

export default function UploadModal({ folderId, folderName, existingAssets = [], replaceAsset, onUploaded, onClose }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [confirmingOverwrite, setConfirmingOverwrite] = useState(false);
  const [progress, setProgress] = useState<Record<string, 'pending' | 'done' | 'error'>>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    if (replaceAsset) {
      setFiles([arr[0]]); // Only allow single file for replacement
      return;
    }
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name + f.size));
      return [...prev, ...arr.filter(f => !existing.has(f.name + f.size))];
    });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, []);

  const startUpload = () => {
    if (replaceAsset) {
      upload();
      return;
    }
    const hasConflicts = files.some(f => existingAssets.some(a => a.fileName.toLowerCase() === f.name.toLowerCase()));
    if (hasConflicts) {
      setConfirmingOverwrite(true);
    } else {
      upload();
    }
  };

  const upload = async () => {
    if (!files.length) return;
    setUploading(true);
    setConfirmingOverwrite(false);
    const initialProgress: Record<string, 'pending'> = {};
    files.forEach(f => (initialProgress[f.name] = 'pending'));
    setProgress(initialProgress);

    for (const file of files) {
      try {
        const fd = new FormData();
        fd.append('file', file);
        if (folderId) fd.append('folderId', folderId);

        if (replaceAsset) {
          fd.append('replaceAssetId', replaceAsset.id);
        } else {
          const existing = existingAssets.find(a => a.fileName.toLowerCase() === file.name.toLowerCase());
          if (existing) {
            fd.append('replaceAssetId', existing.id);
          }
        }

        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        setProgress(p => ({ ...p, [file.name]: res.ok ? 'done' : 'error' }));
      } catch {
        setProgress(p => ({ ...p, [file.name]: 'error' }));
      }
    }
    setUploading(false);
    onUploaded();
  };

  const removeFile = (name: string) => setFiles(prev => prev.filter(f => f.name !== name));

  const formatSize = (bytes: number) =>
    bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget && !uploading) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, width: 520, maxWidth: '95vw',
        padding: '1.5rem', boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{replaceAsset ? 'Replace File' : 'Upload Files'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {replaceAsset ? `Replacing: ${replaceAsset.name}` : `📂 ${folderName}`}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.25rem', lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 12,
            padding: '2rem 1rem',
            textAlign: 'center',
            cursor: 'pointer',
            marginBottom: '1rem',
            transition: 'all 0.2s',
            background: dragging ? 'rgba(99,102,241,0.08)' : 'transparent',
          }}
        >
          <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
            <Folder size={32} />
          </div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Drop files here</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>or click to browse • PDF, ZIP, MP4, images &amp; more</div>
          <input
            ref={inputRef}
            type="file"
            multiple={!replaceAsset}
            style={{ display: 'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div style={{
            maxHeight: 200, overflowY: 'auto',
            border: '1px solid var(--border)', borderRadius: 8,
            marginBottom: '1rem',
          }}>
            {files.map(file => {
              const state = progress[file.name];
              return (
                <div
                  key={file.name + file.size}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '0.8rem',
                  }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{formatSize(file.size)}</span>
                  {state === 'done' && <span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span>}
                  {state === 'error' && <span style={{ color: '#ef4444', flexShrink: 0 }}>✗</span>}
                  {state === 'pending' && <span style={{ color: 'var(--accent)', flexShrink: 0 }}>⟳</span>}
                  {!state && (
                    <button
                      onClick={e => { e.stopPropagation(); removeFile(file.name); }}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={uploading}
            className="btn btn-ghost"
            style={{ fontSize: '0.85rem' }}
          >
            Cancel
          </button>
          <button
            onClick={startUpload}
            disabled={files.length === 0 || uploading}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', minWidth: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
          >
            <UploadCloud size={16} />
            {uploading ? (replaceAsset ? 'Replacing…' : 'Uploading…') : (replaceAsset ? 'Replace File' : `Upload ${files.length > 0 ? `(${files.length})` : ''}`)}
          </button>
        </div>
      </div>

      {/* Confirm Overwrite Modal */}
      {confirmingOverwrite && (
        <ConfirmModal
          title="Overwrite Existing Files?"
          message="Some of the files you are uploading already exist in this folder. Do you want to overwrite them? The existing sharing links will be preserved."
          confirmText="Overwrite"
          danger={false}
          onConfirm={upload}
          onCancel={() => setConfirmingOverwrite(false)}
        />
      )}
    </div>
  );
}
