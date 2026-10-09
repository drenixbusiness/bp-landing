'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Global UI effects: cursor light, glass border highlight near the pointer,
 * and scroll reveals for [data-reveal] elements.
 */
export default function Effects() {
  const pathname = usePathname();
  const lightRef = useRef<HTMLDivElement>(null);

  // scroll reveal (re-scans on navigation and DOM changes)
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('rv')) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => io.observe(el));
    scan();
    let t = 0;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = window.setTimeout(scan, 60);
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
      clearTimeout(t);
    };
  }, [pathname]);

  // cursor light + glass highlights (fine pointers only)
  useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches) return;
    const light = lightRef.current;
    const visible = new Set<HTMLElement>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const el = e.target as HTMLElement;
        if (e.isIntersecting) visible.add(el);
        else {
          visible.delete(el);
          el.style.removeProperty('--mx');
        }
      }
    });
    const observed = new WeakSet<Element>();
    const scan = () =>
      document.querySelectorAll('.glass, .hl').forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      });
    scan();
    const mo = new MutationObserver(() => scan());
    mo.observe(document.body, { childList: true, subtree: true });

    let mx = -1000, my = -1000, lx = -1000, ly = -1000, raf = 0, active = false;
    const tick = () => {
      lx += (mx - lx) * 0.1;
      ly += (my - ly) * 0.1;
      if (light) light.style.transform = `translate3d(${lx - 380}px, ${ly - 380}px, 0)`;
      visible.forEach((el) => {
        const r = el.getBoundingClientRect();
        const near = mx > r.left - 200 && mx < r.right + 200 && my > r.top - 200 && my < r.bottom + 200;
        if (near) {
          el.style.setProperty('--mx', `${mx - r.left}px`);
          el.style.setProperty('--my', `${my - r.top}px`);
        } else el.style.removeProperty('--mx');
      });
      if (Math.abs(mx - lx) + Math.abs(my - ly) > 0.5) raf = requestAnimationFrame(tick);
      else {
        raf = 0;
        active = false;
      }
    };
    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (lx < -900) {
        lx = mx;
        ly = my;
      }
      if (light && !light.classList.contains('on')) light.classList.add('on');
      if (!active) {
        active = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const onLeave = () => light?.classList.remove('on');
    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(raf);
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return <div ref={lightRef} className="cursor-light" aria-hidden="true" />;
}
