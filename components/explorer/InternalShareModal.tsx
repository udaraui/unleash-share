'use client';

import { useState, useEffect } from 'react';

import { Users, CheckCircle, Search, Trash2 } from 'lucide-react';

interface Props {
  item: { type: 'folder' | 'asset'; id: string; name: string };
  onClose: () => void;
}

interface User {
  id: string;
  email: string;
  fullName: string;
}

export default function InternalShareModal({ item, onClose }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [selectedEmail, setSelectedEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<'VIEW' | 'EDIT'>('VIEW');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.users) setUsers(data.users);
      })
      .finally(() => setLoadingUsers(false));
  }, []);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmail) {
      setError('Please select a user to share with');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shares/internal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharedWithUserEmail: selectedEmail,
          assetId: item.type === 'asset' ? item.id : undefined,
          folderId: item.type === 'folder' ? item.id : undefined,
          permissionLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to share internally');
      }

      setSuccess(true);
      setTimeout(onClose, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: 440,
        maxWidth: '95vw',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'flex' }}><Users size={18} /></span> Share Internally
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Share <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong> securely with another team member.
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem' }}>
          {!success ? (
            <form onSubmit={handleShare} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Select User (Email)
                </label>
                {loadingUsers ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading users...</div>
                ) : (
                  <>
                    <input
                      type="email"
                      list="user-emails"
                      className="input"
                      placeholder="Type or select email..."
                      value={selectedEmail}
                      onChange={e => setSelectedEmail(e.target.value)}
                      disabled={loading}
                      required
                      autoFocus
                    />
                    <datalist id="user-emails">
                      {users.map(u => (
                        <option key={u.id} value={u.email}>{u.fullName}</option>
                      ))}
                    </datalist>
                  </>
                )}
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  An email notification will be sent to this user.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Permission Level
                </label>
                <select
                  className="input"
                  value={permissionLevel}
                  onChange={e => setPermissionLevel(e.target.value as 'VIEW' | 'EDIT')}
                  disabled={loading}
                  style={{ width: '100%', cursor: 'pointer' }}
                >
                  <option value="VIEW">View Only (Cannot edit or delete)</option>
                  <option value="EDIT">Full Access (Can edit and delete)</option>
                </select>
              </div>

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !selectedEmail || loadingUsers}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Sharing...' : 'Share Now'}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center', padding: '1rem 0' }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}><CheckCircle size={48} className="text-green-500" /></div>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Shared Successfully!</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {item.name} is now shared with {selectedEmail}.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
