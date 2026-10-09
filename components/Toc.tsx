'use client';

import { useEffect, useRef, useState } from 'react';

export default function Toc({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  const navRef = useRef<HTMLElement>(null);
  // active = the last heading that has scrolled past the header line (robust to fast scrolling)
  useEffect(() => {
    let raf = 0;
    const pick = () => {
      raf = 0;
      let cur = items[0]?.id;
      for (const i of items) {
        const el = document.getElementById(i.id);
        if (el && el.getBoundingClientRect().top <= 140) cur = i.id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = items[items.length - 1]?.id;
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    pick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);
  // keep the highlighted entry visible inside the (scrollable) contents list
  useEffect(() => {
    const nav = navRef.current;
    const a = nav?.querySelector<HTMLElement>('a.is-active');
    if (!nav || !a || nav.scrollHeight <= nav.clientHeight) return;
    const top = a.offsetTop - nav.clientHeight / 2 + a.offsetHeight / 2;
    nav.scrollTo({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }, [active]);
  return (
    <nav ref={navRef} className="toc glass card-dark" aria-label="Table of contents">
      <p className="kicker">Contents</p>
      <ol>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} className={active === i.id ? 'is-active' : ''} aria-current={active === i.id ? 'location' : undefined}>
              {i.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
