'use client';

import { useEffect, useState } from 'react';
import { Phone, ArrowRight } from 'lucide-react';
import { COMPANY } from '@/lib/content';

const LINKS = [
  { id: 'earnings', label: 'Earnings' },
  { id: 'why', label: 'Why' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'apply', label: 'Apply' },
  { id: 'faq-oo', label: 'FAQ' },
];

/** Compact in-page sub-nav (after the hero) + mobile sticky action bar. */
export default function OwnerNav() {
  const [show, setShow] = useState(false);
  const [active, setActive] = useState('');

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    );
    LINKS.forEach((l) => {
      const el = document.getElementById(l.id);
      if (el) io.observe(el);
    });
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  return (
    <>
      <nav className={`sub-nav glass${show ? ' is-shown' : ''}`} aria-label="On this page" aria-hidden={!show}>
        {LINKS.map((l) => (
          <a key={l.id} href={`#${l.id}`} className={active === l.id ? 'is-active' : ''} tabIndex={show ? 0 : -1}>
            {l.label}
          </a>
        ))}
      </nav>
      <div className={`mobile-bar glass${show ? ' is-shown' : ''}`}>
        <a href={COMPANY.phoneHref} className="btn btn-ghost">
          <Phone size={16} aria-hidden="true" />
          <span>Call now</span>
        </a>
        <a href="#apply" className="btn btn-primary">
          <span>Apply now</span>
          <ArrowRight size={16} aria-hidden="true" />
        </a>
      </div>
    </>
  );
}
