'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, Phone, X } from 'lucide-react';
import { COMPANY, NAV } from '@/lib/content';
import { Btn, Logo } from './ui';

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [open]);

  const isActive = (href: string) => !href.includes('#') && (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="header-pill glass" ref={panelRef}>
        <Link href="/" className="header-logo" aria-label="Bipolar Bear — home">
          <Logo />
        </Link>
        <nav className="header-nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={`nav-link${isActive(n.href) ? ' is-active' : ''}`} aria-current={isActive(n.href) ? 'page' : undefined}>
              {n.label}
            </Link>
          ))}
        </nav>
        <a href={COMPANY.phoneHref} className="header-phone">
          <Phone size={15} strokeWidth={2} aria-hidden="true" />
          <span>{COMPANY.phone}</span>
        </a>
        <Btn href="/apply-now" className="header-cta">
          Join Us
        </Btn>
        <button type="button" className="burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div id="mobile-menu" className={`mobile-menu glass${open ? ' is-open' : ''}`} hidden={!open}>
          <nav aria-label="Mobile">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`mobile-link${isActive(n.href) ? ' is-active' : ''}`} onClick={() => setOpen(false)}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="mobile-actions">
            <a href={COMPANY.phoneHref} className="btn btn-ghost">
              <Phone size={16} aria-hidden="true" />
              <span>{COMPANY.phone}</span>
            </a>
            <Btn href="/apply-now">Join Us</Btn>
          </div>
        </div>
      </div>
    </header>
  );
}
