import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import ThemeToggle from '@/components/ThemeToggle';
import SignOutButton from '@/components/SignOutButton';
import SidebarFileTree from '@/components/explorer/SidebarFileTree';
import { Rocket } from 'lucide-react';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect('/login');

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 240,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 10,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: '1.25rem 1rem 0.75rem', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, color: '#ffffff',
            }}><Rocket size={20} /></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Unleash Share</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Internal</div>
            </div>
          </div>
        </div>

        {/* File tree — fills remaining space, scrollable */}
        <div style={{ flex: 1, padding: '0 0.5rem', overflowY: 'auto', overflowX: 'hidden' }}>
          <Suspense fallback={<div style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Loading…</div>}>
            <SidebarFileTree />
          </Suspense>
        </div>



        {/* User info & actions */}
        <div style={{ padding: '0.5rem 0.75rem 1rem', flexShrink: 0 }}>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', marginBottom: '0.75rem' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={session.user?.name || ''}>
                {session.user?.name}
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={session.user?.email || ''}>
                {session.user?.email}
              </div>
            </div>
            <SignOutButton />
          </div>
          <div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, marginLeft: 240, height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
