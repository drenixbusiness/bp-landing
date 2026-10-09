'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
}

/**
 * Glass dropdown in the site's style (the native <select> popup can't be styled).
 * Button + listbox with full keyboard support: arrows, Home/End, Enter/Space, Escape, type-ahead.
 */
export default function Select({ label, value, options, onChange }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ s: '', t: 0 });
  const current = options.find((o) => o.value === value) ?? options[0];

  const openList = () => {
    setHi(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const choose = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
    btnRef.current?.focus();
  };

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    listRef.current?.focus();
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  // keep the highlighted option in view
  useEffect(() => {
    if (open) listRef.current?.children[hi]?.scrollIntoView({ block: 'nearest' });
  }, [hi, open]);

  const onBtnKey = (e: KeyboardEvent) => {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };
  const onListKey = (e: KeyboardEvent) => {
    const last = options.length - 1;
    if (e.key === 'ArrowDown') setHi((h) => Math.min(last, h + 1));
    else if (e.key === 'ArrowUp') setHi((h) => Math.max(0, h - 1));
    else if (e.key === 'Home') setHi(0);
    else if (e.key === 'End') setHi(last);
    else if (e.key === 'Enter' || e.key === ' ') choose(hi);
    else if (e.key === 'Escape' || e.key === 'Tab') {
      setOpen(false);
      if (e.key === 'Escape') btnRef.current?.focus();
      return;
    } else if (e.key.length === 1) {
      const now = Date.now();
      typed.current.s = (now - typed.current.t < 600 ? typed.current.s : '') + e.key.toLowerCase();
      typed.current.t = now;
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.s));
      if (i >= 0) setHi(i);
      return;
    } else return;
    e.preventDefault();
  };

  return (
    <div ref={rootRef} className={`dd${open ? ' is-open' : ''}`}>
      <span className="sr-only" id={`${id}-label`}>
        {label}
      </span>
      <button
        ref={btnRef}
        type="button"
        className="dd-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-btn`}
        id={`${id}-btn`}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onBtnKey}
      >
        <span className="dd-value">{current?.label}</span>
        <ChevronDown size={18} className="dd-chev" aria-hidden="true" />
      </button>
      {open && (
        <ul
          ref={listRef}
          className="dd-list glass card-dark"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={`${id}-label`}
          aria-activedescendant={`${id}-o${hi}`}
          onKeyDown={onListKey}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={o.value === value}
              className={`${i === hi ? 'is-hi' : ''}${o.value === value ? ' is-sel' : ''}`}
              onPointerEnter={() => setHi(i)}
              onClick={() => choose(i)}
            >
              <span>{o.label}</span>
              {o.value === value && <Check size={16} aria-hidden="true" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
