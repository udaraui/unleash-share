'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { Lock, Unlock, Loader2, AlertCircle } from 'lucide-react';

export default function PreviewAuthPage() {
  const { slug } = useParams<{ slug: string }>();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/shares/external/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, token }),
    });

    const data = await res.json();
    if (!res.ok) { setError(data.error || 'Access denied'); setLoading(false); return; }

    const titleSlug = data.titleSlug ? encodeURIComponent(data.titleSlug) : '';
    window.location.href = titleSlug ? `/preview/${slug}/${titleSlug}` : `/preview/${slug}`;
  };

  return (
    <>
      <style>{`
        .auth-layout {
          display: flex;
          min-height: 100vh;
          font-family: 'Inter', system-ui, sans-serif;
        }
        .auth-left {
          flex: 0 0 55%;
          background: linear-gradient(160deg, #e8f4ff 0%, #d0e9ff 40%, #b8dcff 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 3rem;
        }
        .auth-dot-grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(59,130,246,0.15) 1px, transparent 1px);
          background-size: 28px 28px;
        }
        .auth-circle-1 { position: absolute; top: -60px; left: -60px; width: 220px; height: 220px; border-radius: 50%; background: rgba(59,130,246,0.08); }
        .auth-circle-2 { position: absolute; bottom: -80px; right: -40px; width: 280px; height: 280px; border-radius: 50%; background: rgba(59,130,246,0.06); }
        .auth-circle-3 { position: absolute; bottom: 15%; left: -30px; width: 120px; height: 120px; border-radius: 50%; background: rgba(59,130,246,0.1); }
        .auth-brand {
          position: absolute; top: 2rem; left: 2.5rem;
          display: flex; align-items: center; gap: 0.6rem; z-index: 1;
        }
        .auth-brand-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .auth-brand-name { font-weight: 700; font-size: 1rem; color: #1e40af; }
        .auth-illustration { position: relative; z-index: 1; width: 100%; max-width: 480px; }
        .auth-illustration img { width: 100%; height: auto; object-fit: contain; filter: drop-shadow(0 20px 40px rgba(37,99,235,0.15)); }
        .auth-tagline {
          position: relative; z-index: 1; text-align: center;
          color: #1d4ed8; font-size: 0.9rem; margin-top: 1.5rem;
          font-weight: 500; letter-spacing: 0.01em;
        }
        .auth-right {
          flex: 1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 3rem; background: var(--bg-primary); position: relative;
        }
        .auth-theme-toggle { position: absolute; top: 1.5rem; right: 1.5rem; }
        .auth-form-wrap { width: 100%; max-width: 380px; }
        .auth-lock-icon {
          width: 56px; height: 56px; border-radius: 14px;
          background: linear-gradient(135deg, rgba(37,99,235,0.12), rgba(96,165,250,0.18));
          border: 1.5px solid rgba(37,99,235,0.2);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1.5rem; color: #2563eb;
          box-shadow: 0 4px 20px rgba(37,99,235,0.1);
        }
        .auth-heading {
          font-size: 2rem; font-weight: 700; color: var(--text-primary);
          margin-bottom: 0.5rem; letter-spacing: -0.03em;
        }
        .auth-subtext { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 2.5rem; }
        .auth-label {
          display: block; font-size: 0.8rem; font-weight: 600;
          color: var(--text-secondary); margin-bottom: 0.5rem; letter-spacing: 0.01em;
        }
        .auth-input-wrap { position: relative; }
        .auth-input-icon {
          position: absolute; left: 0.9rem; top: 50%; transform: translateY(-50%);
          color: var(--text-muted); display: flex; align-items: center;
        }
        .auth-input {
          width: 100%; padding: 0.8rem 1rem 0.8rem 2.5rem;
          border: 1.5px solid var(--border); border-radius: 10px;
          font-size: 0.9rem; outline: none; color: var(--text-primary);
          background: var(--bg-secondary); transition: all 0.2s;
          font-family: inherit;
        }
        .auth-input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
        .auth-error {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.7rem 1rem; border-radius: 8px;
          background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2);
          color: #dc2626; font-size: 0.85rem;
        }
        .auth-submit-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 0.6rem; width: 100%; padding: 0.9rem 1.5rem;
          color: #fff; font-weight: 600; font-size: 0.95rem;
          border: none; border-radius: 10px; cursor: pointer;
          transition: all 0.2s ease; font-family: inherit;
        }
        .auth-submit-btn:not(:disabled) { background: linear-gradient(135deg, #2563eb, #3b82f6); box-shadow: 0 4px 16px rgba(37,99,235,0.35); }
        .auth-submit-btn:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.45); }
        .auth-submit-btn:disabled { background: #93c5fd; cursor: not-allowed; }
        .auth-footer { text-align: center; margin-top: 2.5rem; font-size: 0.75rem; color: var(--text-muted); }

        /* ── Mobile ── */
        @media (max-width: 767px) {
          .auth-layout { flex-direction: column; }
          .auth-left { flex: none; padding: 2rem 1.5rem 1.5rem; min-height: auto; }
          .auth-brand { top: 1.25rem; left: 1.25rem; }
          .auth-illustration { max-width: 220px; margin-top: 2.5rem; }
          .auth-tagline { font-size: 0.8rem; margin-top: 1rem; }
          .auth-right { padding: 2rem 1.5rem; flex: 1; }
          .auth-heading { font-size: 1.6rem; }
          .auth-subtext { font-size: 0.85rem; margin-bottom: 1.75rem; }
          .auth-circle-1 { width: 140px; height: 140px; top: -40px; left: -40px; }
          .auth-circle-2 { width: 160px; height: 160px; bottom: -50px; right: -30px; }
          .auth-circle-3 { display: none; }
          .auth-lock-icon { width: 46px; height: 46px; border-radius: 12px; margin-bottom: 1rem; }
        }

        /* ── Tablet ── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .auth-left { flex: 0 0 45%; padding: 2rem; }
          .auth-illustration { max-width: 300px; margin-top: 2rem; }
          .auth-right { padding: 2rem; }
          .auth-heading { font-size: 1.75rem; }
        }
      `}</style>

      <div className="auth-layout">
        {/* ── Left Panel ── */}
        <div className="auth-left">
          <div className="auth-dot-grid" />
          <div className="auth-circle-1" /><div className="auth-circle-2" /><div className="auth-circle-3" />
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <span className="auth-brand-name">Unleash Share</span>
          </div>
          <div className="auth-illustration">
            <img src="/login-illustration.jpg" alt="Secure access illustration" />
          </div>
          <p className="auth-tagline">Your files are protected with end-to-end security</p>
        </div>

        {/* ── Right Panel ── */}
        <div className="auth-right">
          <div className="auth-theme-toggle"><ThemeToggle /></div>
          <div className="auth-form-wrap">
            <div className="auth-lock-icon"><Lock size={26} strokeWidth={1.5} /></div>
            <h1 className="auth-heading">Secured Content</h1>
            <p className="auth-subtext">
              This file is protected. Please enter your access token to verify your identity and view the content.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="auth-label">Access Token</label>
                <div className="auth-input-wrap">
                  <div className="auth-input-icon"><Lock size={15} strokeWidth={1.5} /></div>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="Enter your access token"
                    value={token}
                    onChange={e => setToken(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {error && (
                <div className="auth-error">
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  {error}
                </div>
              )}

              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading
                  ? <><Loader2 size={18} className="animate-spin" /> Verifying…</>
                  : <><Unlock size={18} /> Access Content</>
                }
              </button>
            </form>

            <p className="auth-footer">This link was securely shared via Unleash Share</p>
          </div>
        </div>
      </div>
    </>
  );
}
