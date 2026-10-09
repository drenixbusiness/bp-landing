'use client';

import { useId, useState } from 'react';
import { Plus } from 'lucide-react';

export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const id = useId();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="faq-list">
      {items.map((it, i) => {
        const on = open === i;
        return (
          <div key={it.q} className={`faq-item${on ? ' is-open' : ''}`}>
            <h3>
              <button type="button" id={`${id}-q${i}`} aria-expanded={on} aria-controls={`${id}-a${i}`} onClick={() => setOpen(on ? null : i)}>
                <span>{it.q}</span>
                <span className="faq-icon" aria-hidden="true">
                  <Plus size={20} strokeWidth={2} />
                </span>
              </button>
            </h3>
            <div className="faq-a" id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`} aria-hidden={!on}>
              <div>
                <p>{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
