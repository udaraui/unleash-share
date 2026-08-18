'use client';

import { useState } from 'react';
import { Link as LinkIcon, CheckCircle } from 'lucide-react';

interface Props {
  assetId: string;
  assetName: string;
  assetPath?: string;
  onClose: () => void;
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const length = 16;
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}

export default function ShareModal({ assetId, assetName, assetPath, onClose }: Props) {
  const [password, setPassword] = useState(() => generateToken());
  const [expiresAt, setExpiresAt] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Token is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/shares/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          authMethod: 'PASSWORD',
          password,
          ...(expiresAt && { expiresAt: new Date(expiresAt).toISOString() }),
          ...(remark && { remark }),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create share link');
      }

      setShareUrl(data.shareUrl);
      window.dispatchEvent(new CustomEvent('explorer-refresh'));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const generateSecureToken = () => {
    setPassword(generateToken());
  };

  const copyToken = () => {
    if (password) {
      navigator.clipboard.writeText(password);
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
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
        width: 460,
        maxWidth: '95vw',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.25rem 1rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ display: 'flex' }}><LinkIcon size={18} /></span> Share File
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
            Create a secure, token-protected link for:
          </div>
          {assetPath && (
            <div style={{ 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)', 
              background: 'var(--bg-secondary)', 
              padding: '6px 10px', 
              borderRadius: 6,
              border: '1px solid var(--border)',
              wordBreak: 'break-all',
              marginTop: '0.5rem'
            }}>
              <span style={{ fontWeight: 600 }}>Path:</span> {assetPath}
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem' }}>
          {!shareUrl ? (
            <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Title (Optional)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="E.g., Client Share Link, Marketing Assets..."
                  value={remark}
                  onChange={e => setRemark(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Access Token
                </label>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Set or generate a secure token..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={generateSecureToken}
                    disabled={loading}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.78rem', padding: '0 0.75rem', whiteSpace: 'nowrap' }}
                  >
                    Generate
                  </button>
                  {password && (
                    <button
                      type="button"
                      onClick={copyToken}
                      className="btn btn-ghost"
                      style={{ fontSize: '0.78rem', padding: '0 0.75rem', whiteSpace: 'nowrap' }}
                    >
                      {copiedToken ? 'Copied!' : 'Copy'}
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Anyone with the link will need this token to access the file.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  className="input"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  disabled={loading}
                />
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  If set, the file cannot be accessed after this date.
                </p>
              </div>

              {error && (
                <div style={{ color: 'var(--danger)', fontSize: '0.8rem', background: 'rgba(239,68,68,0.1)', padding: '0.5rem', borderRadius: '6px' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || !password}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {loading ? 'Generating...' : 'Generate Secure Link'}
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem' }}>🎉</div>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Link Generated Successfully!</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Share this link and the token with your intended recipients.
                </p>
              </div>

              <div style={{
                display: 'flex', alignItems: 'center', width: '100%',
                background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                borderRadius: '8px', padding: '4px', gap: '4px'
              }}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="input"
                  style={{ flex: 1, border: 'none', background: 'transparent' }}
                  onClick={e => e.currentTarget.select()}
                />
                <button
                  onClick={handleCopy}
                  className="btn btn-primary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
