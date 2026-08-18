'use client';

import { useEffect, useRef } from 'react';

interface Props {
  defaultValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
}

export default function InlineInput({ defaultValue, onConfirm, onCancel, placeholder }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = ref.current?.value.trim();
      if (val) onConfirm(val);
      else onCancel();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <input
      ref={ref}
      defaultValue={defaultValue}
      placeholder={placeholder}
      onKeyDown={handleKeyDown}
      onBlur={() => {
        const val = ref.current?.value.trim();
        if (val) onConfirm(val);
        else onCancel();
      }}
      style={{
        background: 'var(--bg-input, var(--bg-card))',
        border: '1px solid var(--accent)',
        borderRadius: 4,
        color: 'var(--text-primary)',
        fontSize: '0.8rem',
        padding: '2px 6px',
        outline: 'none',
        width: '100%',
        minWidth: 0,
      }}
      onClick={e => e.stopPropagation()}
    />
  );
}
