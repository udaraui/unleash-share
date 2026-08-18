'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Initial mount: load theme from localStorage
    const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
    setTheme(savedTheme);
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    const root = document.documentElement;
    if (newTheme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (newTheme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      // System theme: check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
    }
  };

  // Avoid hydration mismatch by rendering a placeholder container during SSR
  if (!mounted) {
    return (
      <div className="theme-selector" style={{ width: 84, height: 28, opacity: 0.5 }} />
    );
  }

  return (
    <div className="theme-selector">
      <button
        type="button"
        className={`theme-option ${theme === 'light' ? 'active' : ''}`}
        onClick={() => handleThemeChange('light')}
        title="Switch to Light Theme"
      >
        <Sun size={13} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => handleThemeChange('dark')}
        title="Switch to Dark Theme"
      >
        <Moon size={13} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        className={`theme-option ${theme === 'system' ? 'active' : ''}`}
        onClick={() => handleThemeChange('system')}
        title="Follow System Theme"
      >
        <Monitor size={13} strokeWidth={1.75} />
      </button>
    </div>
  );
}
