'use client';

import { signOut } from 'next-auth/react';
import { useState } from 'react';
import { LogOut } from 'lucide-react';

export default function SignOutButton() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className="btn btn-ghost"
      style={{
        width: 28,
        height: 28,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--danger)',
        border: 'none',
        background: 'rgba(239, 68, 68, 0.08)',
        borderRadius: '6px',
        opacity: loading ? 0.6 : 1,
        cursor: 'pointer',
        flexShrink: 0,
      }}
      title="Sign Out"
    >
      <LogOut size={14} />
    </button>
  );
}
