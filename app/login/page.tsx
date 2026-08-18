'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Rocket } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/portal/dashboard';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1rem',
    }}>
      {/* Floating Theme Toggler */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <ThemeToggle />
      </div>

      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.15), transparent)',
      }} />

      <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: '2.5rem' }}>
        {/* Logo */}
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem', color: '#ffffff',
        }}>
          <Rocket size={32} />
        </div>

        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
          <span className="gradient-text">Unleash Share</span>
        </h1>
        <p style={{ marginBottom: '2rem', fontSize: '0.9rem' }}>
          Sign in with your organization account to access the portal.
        </p>

        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '0.85rem', fontSize: '0.95rem' }}
          onClick={() => signIn('microsoft-entra-id', { callbackUrl })}
        >
          <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>

        <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Only authorized organization members can access this portal.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginContent />
    </Suspense>
  );
}
