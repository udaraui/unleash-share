'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, SquarePlay, FileText, Globe, File as FileIcon, UploadCloud, Cloud, CheckCircle, XCircle, Loader2, FileCodeCorner, BookOpenText, Sheet } from 'lucide-react';

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      setStatus({ type: 'success', message: `"${file.name}" uploaded successfully!` });
      setFile(null);
      setTimeout(() => router.push('/portal/dashboard'), 1500);
    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (f: File) => {
    const fileName = f.name.toLowerCase();
    const mimeType = f.type.toLowerCase();

    if (fileName.endsWith('.zip')) return <Archive size={48} />;
    if (mimeType === 'text/html' || fileName.endsWith('.html')) return <FileCodeCorner size={48} />;
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx') || mimeType.includes('word') || mimeType.includes('document')) {
      return <BookOpenText size={48} />;
    }
    if (fileName.endsWith('.csv') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx') || mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType.includes('csv')) {
      return <Sheet size={48} />;
    }
    if (mimeType.startsWith('video/') || fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.avi') || fileName.endsWith('.mkv')) {
      return <SquarePlay size={48} />;
    }
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return <FileText size={48} />;
    return <FileIcon size={48} />;
  };

  return (
    <div style={{ padding: '1.75rem 2rem', flex: 1 }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>
          <span className="gradient-text">Upload</span> Asset
        </h1>
        <p>Upload a ZIP site, HTML file, video, PDF, or any document.</p>
      </div>

      {/* Drop Zone */}
      <div
        className="card"
        style={{
          border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border)'}`,
          background: isDragging ? 'rgba(99,102,241,0.05)' : 'var(--bg-card)',
          cursor: 'pointer',
          textAlign: 'center',
          padding: '3rem 2rem',
          transition: 'all 0.2s ease',
          boxShadow: isDragging ? '0 0 30px var(--accent-glow)' : undefined,
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{getFileIcon(file)}</div>
            <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{file.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || 'Unknown type'}
            </div>
            <div style={{ marginTop: '1rem', padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              background: 'rgba(99,102,241,0.1)', borderRadius: 6, fontSize: '0.75rem', color: 'var(--accent)' }}>
              {file.name.endsWith('.zip') ? <><Archive size={14} /> Will be extracted to Azure Blob</> : <><UploadCloud size={14} /> Will be uploaded directly</>}
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><Cloud size={48} /></div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Drop your file here</div>
            <p style={{ fontSize: '0.85rem' }}>or click to browse</p>
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Supports: .zip (sites), .html, .pdf, .mp4, .mov, and more
            </div>
          </>
        )}
      </div>

      {/* Status */}
      {status && (
        <div style={{
          marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 8,
          background: status.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${status.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
          color: status.type === 'success' ? 'var(--success)' : 'var(--danger)',
          fontSize: '0.875rem',
        }}>
          {status.type === 'success' ? <CheckCircle size={16} className="inline mr-1" /> : <XCircle size={16} className="inline mr-1" />} {status.message}
        </div>
      )}

      {/* Actions */}
      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1, justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem',
            opacity: (!file || uploading) ? 0.5 : 1 }}
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? <><Loader2 size={16} className="inline mr-2 animate-spin" /> Uploading...</> : <><UploadCloud size={16} className="inline mr-2" /> Upload File</>}
        </button>
        {file && (
          <button className="btn btn-ghost" onClick={() => setFile(null)}>
            Clear
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
