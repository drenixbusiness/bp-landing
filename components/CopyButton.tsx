'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      /* clipboard blocked — the value is still visible and selectable */
    }
  };
  return (
    <button type="button" className="icon-btn copy-btn" onClick={copy} aria-label={done ? `${label} copied` : `Copy ${label}`}>
      {done ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        {done ? 'Copied' : ''}
      </span>
    </button>
  );
}
