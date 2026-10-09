'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

type Mark = { el: HTMLElement; label: string; target: number };

/**
 * Iceberg scrollbar (same design as bipolar-bear.com/offer): a hairline track that fills
 * with a mint glow as you go, diamond markers for the page's sections (hover = label,
 * click = jump), and a bobbing iceberg thumb whose waterline marks the position.
 * Mouse/trackpad + ≥760px only; touch devices keep their native scrollbars.
 */
export default function IceScrollbar() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const marksRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const mq = matchMedia('(pointer: fine) and (min-width: 760px)');
    const on = () => setEnabled(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    if (!enabled) {
      html.classList.remove('ice-on');
      return;
    }
    html.classList.add('ice-on');
    const root = rootRef.current!, track = trackRef.current!, fill = fillRef.current!, thumb = thumbRef.current!, marksBox = marksRef.current!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let max = 1, range = 1, marks: (Mark & { b: HTMLButtonElement })[] = [], raf = 0;
    const WL = 0.39; // waterline height within the thumb

    const update = () => {
      raf = 0;
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      const y = p * range;
      thumb.style.transform = `translate3d(0, ${y}px, 0)`;
      fill.style.height = `${y + thumb.offsetHeight * WL}px`;
      for (const m of marks) m.b.classList.toggle('passed', window.scrollY >= m.target - 2);
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    const layout = () => {
      max = Math.max(1, html.scrollHeight - window.innerHeight);
      range = Math.max(1, root.clientHeight - thumb.offsetHeight);
      root.style.opacity = html.scrollHeight > window.innerHeight + 4 ? '' : '0';
      // section markers: every section with a heading
      marksBox.innerHTML = '';
      const found: Mark[] = [];
      document.querySelectorAll<HTMLElement>('main section').forEach((el) => {
        const h = el.querySelector('h1, h2');
        const text = h?.textContent?.replace(/\s+/g, ' ').trim();
        if (!text) return;
        const target = Math.min(max, Math.max(0, el.getBoundingClientRect().top + window.scrollY - 90));
        if (found.some((f) => Math.abs(f.target - target) < 40)) return;
        found.push({ el, label: text.length > 26 ? text.slice(0, 25) + '…' : text, target });
      });
      marks = found.slice(0, 12).map((m) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'is-mark';
        b.tabIndex = -1;
        b.style.top = `${(m.target / max) * range + thumb.offsetHeight * WL}px`;
        const span = document.createElement('span');
        span.textContent = m.label;
        b.appendChild(span);
        b.addEventListener('click', () => window.scrollTo({ top: m.target, behavior: reduced ? 'auto' : 'smooth' }));
        marksBox.appendChild(b);
        return { ...m, b };
      });
      update();
    };

    // drag the berg
    let drag: { y: number; s: number; id: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      drag = { y: e.clientY, s: window.scrollY, id: e.pointerId };
      thumb.setPointerCapture(e.pointerId);
      thumb.classList.add('dragging');
      html.classList.add('ice-dragging');
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      window.scrollTo({ top: drag.s + ((e.clientY - drag.y) * max) / range, behavior: 'instant' as ScrollBehavior });
    };
    const onEnd = () => {
      drag = null;
      thumb.classList.remove('dragging');
      html.classList.remove('ice-dragging');
    };
    // click the line: glide there
    const onTrack = (e: MouseEvent) => {
      const r = root.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (e.clientY - r.top - thumb.offsetHeight * WL) / range));
      window.scrollTo({ top: p * max, behavior: reduced ? 'auto' : 'smooth' });
    };

    // re-measure when the page changes size (images, fonts, client navigation)
    let layoutT = 0;
    const relayout = () => {
      clearTimeout(layoutT);
      layoutT = window.setTimeout(layout, 120);
    };
    const ro = new ResizeObserver(relayout);
    ro.observe(document.body);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', relayout);
    thumb.addEventListener('pointerdown', onDown);
    thumb.addEventListener('pointermove', onMove);
    thumb.addEventListener('pointerup', onEnd);
    thumb.addEventListener('pointercancel', onEnd);
    thumb.addEventListener('lostpointercapture', onEnd);
    track.addEventListener('click', onTrack);
    document.fonts?.ready.then(layout);
    layout();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(layoutT);
      ro.disconnect();
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', relayout);
      thumb.removeEventListener('pointerdown', onDown);
      thumb.removeEventListener('pointermove', onMove);
      thumb.removeEventListener('pointerup', onEnd);
      thumb.removeEventListener('pointercancel', onEnd);
      thumb.removeEventListener('lostpointercapture', onEnd);
      track.removeEventListener('click', onTrack);
      onEnd();
      html.classList.remove('ice-on');
    };
  }, [enabled, pathname]);

  if (!enabled) return null;
  return (
    <div ref={rootRef} className="ice-scroll" aria-hidden="true">
      <div ref={trackRef} className="is-track">
        <div ref={fillRef} className="is-fill" />
      </div>
      <div ref={marksRef} />
      <div ref={thumbRef} className="is-thumb">
        <svg viewBox="0 0 28 46">
          {/* under the water: the bigger, dimmer bulk */}
          <polygon className="sub" strokeWidth=".7" strokeLinejoin="round" points="3,18 25,18 27.5,27 23,37 15.5,44.5 8.5,39 2,28" />
          <polyline fill="none" stroke="rgba(191,233,255,.28)" strokeWidth=".6" points="9,18 12,30 15.5,44.5" />
          <polyline fill="none" stroke="rgba(191,233,255,.28)" strokeWidth=".6" points="12,30 23,37" />
          {/* above the water: the faceted tip */}
          <g className="tip" stroke="rgba(255,255,255,.55)" strokeWidth=".5" strokeLinejoin="round">
            <polygon fill="#eaf6ff" points="3,18 8,9 11.5,11.5 15,1.5 19.5,8 22,6 25,18" />
            <polygon fill="#d4eeff" points="3,18 8,9 11.5,11.5 10,18" />
            <polygon fill="#bfe9ff" points="15,1.5 19.5,8 17.5,18 11.5,11.5" />
            <polygon fill="#8fc6e6" points="19.5,8 22,6 25,18 17.5,18" />
          </g>
          <line className="wl" x1="-2" y1="18" x2="30" y2="18" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
