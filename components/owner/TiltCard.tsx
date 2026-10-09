'use client';

import { useRef, type ReactNode } from 'react';

export default function TiltCard({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      el.style.setProperty('--rx', `${(-y * 10).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(x * 12).toFixed(2)}deg`);
    });
  };
  const onLeave = () => {
    cancelAnimationFrame(raf.current);
    ref.current?.style.setProperty('--rx', '0deg');
    ref.current?.style.setProperty('--ry', '0deg');
  };
  return (
    <div ref={ref} className={`tilt ${className}`} style={style} onPointerMove={onMove} onPointerLeave={onLeave} data-reveal>
      <div className="tilt-inner">{children}</div>
    </div>
  );
}
