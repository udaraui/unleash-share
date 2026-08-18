'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { Lock, Unlock, Loader2, XCircle } from 'lucide-react';

export default function PreviewAuthPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
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

    if (!res.ok) {
      setError(data.error || 'Access denied');
      setLoading(false);
      return;
    }

    // Redirect to the preview content with the share title as the last path parameter
    const titleSlug = data.titleSlug ? encodeURIComponent(data.titleSlug) : '';
    window.location.href = titleSlug ? `/preview/${slug}/${titleSlug}` : `/preview/${slug}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
    }}>
      {/* Floating Theme Toggler */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>

      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 40% at 50% -5%, rgba(99,102,241,0.12), transparent)',
      }} />

      <div className="card" style={{ maxWidth: 400, width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(167,139,250,0.2))',
            border: '1px solid rgba(99,102,241,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem', color: '#818cf8',
            boxShadow: '0 8px 32px rgba(99,102,241,0.15)'
          }}>
            <Lock size={32} strokeWidth={1.5} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            <span className="gradient-text">Secured Content</span>
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            This file is protected. Please enter your access token to verify your identity.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500,
              color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Access Token
            </label>
            <input
              className="input"
              type="password"
              placeholder="Enter access token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              autoFocus
            />
          </div>

          {error && (
            <div style={{
              padding: '0.6rem 0.75rem', borderRadius: 6,
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid var(--danger)',
              color: 'var(--danger)', fontSize: '0.8rem',
            }}>
              <XCircle size={16} className="inline mr-2" /> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ 
              justifyContent: 'center', 
              padding: '0.85rem', 
              fontSize: '0.95rem',
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
              transition: 'all 0.2s',
              opacity: loading ? 0.7 : 1 
            }}
            disabled={loading}
          >
            {loading ? <><Loader2 size={18} className="inline mr-2 animate-spin" /> Verifying...</> : <><Unlock size={18} className="inline mr-2" /> Access Content</>}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          This link was securely shared via Unleash Share
        </p>
      </div>
    </div>
  );
}
