'use client';

interface Props {
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, confirmText = 'Confirm', danger = false, onConfirm, onCancel }: Props) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 16, width: 400, maxWidth: '95vw',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>{title}</div>
        </div>
        <div style={{ padding: '1.25rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {message}
        </div>
        <div style={{
          padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border)',
          display: 'flex', gap: '0.5rem', justifyContent: 'flex-end',
        }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn btn-primary"
            style={{ fontSize: '0.82rem', ...(danger ? { background: '#ef4444', borderColor: '#ef4444', color: '#fff' } : {}) }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
