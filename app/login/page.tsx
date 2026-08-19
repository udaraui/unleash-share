'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import ThemeToggle from '@/components/ThemeToggle';

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/portal/dashboard';

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
          position: absolute;
          inset: 0;
          pointer-events: none;
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
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
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
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          background: var(--bg-primary);
          position: relative;
        }
        .auth-theme-toggle { position: absolute; top: 1.5rem; right: 1.5rem; }
        .auth-form-wrap { width: 100%; max-width: 380px; }
        .auth-heading {
          font-size: 2rem; font-weight: 700; color: var(--text-primary);
          margin-bottom: 0.5rem; letter-spacing: -0.03em;
        }
        .auth-subtext { color: var(--text-secondary); font-size: 0.9rem; line-height: 1.6; margin-bottom: 2.5rem; }
        .auth-ms-btn {
          display: flex; align-items: center; justify-content: center;
          gap: 0.75rem; width: 100%; padding: 0.9rem 1.5rem;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          color: #fff; font-weight: 600; font-size: 0.95rem;
          border: none; border-radius: 10px; cursor: pointer;
          box-shadow: 0 4px 16px rgba(37,99,235,0.35);
          transition: all 0.2s ease; letter-spacing: 0.01em;
          font-family: inherit;
        }
        .auth-ms-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,0.45); }
        .auth-footer { text-align: center; margin-top: 2.5rem; font-size: 0.75rem; color: var(--text-muted); }

        /* ── Mobile: stack vertically ── */
        @media (max-width: 767px) {
          .auth-layout { flex-direction: column; }
          .auth-left {
            flex: none;
            padding: 2rem 1.5rem 1.5rem;
            min-height: auto;
          }
          .auth-brand { top: 1.25rem; left: 1.25rem; }
          .auth-illustration { max-width: 260px; margin-top: 2.5rem; }
          .auth-tagline { font-size: 0.8rem; margin-top: 1rem; }
          .auth-right { padding: 2rem 1.5rem; flex: 1; }
          .auth-heading { font-size: 1.6rem; }
          .auth-subtext { font-size: 0.85rem; margin-bottom: 1.75rem; }
          .auth-circle-1 { width: 140px; height: 140px; top: -40px; left: -40px; }
          .auth-circle-2 { width: 160px; height: 160px; bottom: -50px; right: -30px; }
          .auth-circle-3 { display: none; }
        }

        /* ── Tablet: keep split but reduce illustration ── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .auth-left { flex: 0 0 45%; padding: 2rem; }
          .auth-illustration { max-width: 320px; margin-top: 2rem; }
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
            <img src="/login-illustration.jpg" alt="Welcome illustration" />
          </div>
          <p className="auth-tagline">Securely share files within your organization</p>
        </div>

        {/* ── Right Panel ── */}
        <div className="auth-right">
          <div className="auth-theme-toggle"><ThemeToggle /></div>
          <div className="auth-form-wrap">
            <h1 className="auth-heading">Welcome Back&nbsp;:)</h1>
            <p className="auth-subtext">
              To keep connected with us please login with your personal information by your organization account.
            </p>

            <button
              className="auth-ms-btn"
              onClick={() => signIn('microsoft-entra-id', { callbackUrl })}
            >
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Sign in with Microsoft
            </button>

            <p className="auth-footer">Only authorized organization members can access this portal.</p>
          </div>
        </div>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginContent />
    </Suspense>
  );
}
