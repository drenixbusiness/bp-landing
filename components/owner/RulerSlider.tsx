'use client';

import { useId, useRef, type KeyboardEvent, type PointerEvent } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** Value distance between minor ticks, and how many minor ticks per labelled major tick. */
  tick: number;
  major: number;
  px?: number;
  format: (v: number) => string;
  tickFormat?: (v: number) => string;
  band?: { from: number; to: number; label: string };
  onChange: (v: number) => void;
}

/** A ruler that slides under a fixed centre needle. Drag, swipe, wheel or use the keyboard. */
export default function RulerSlider({ label, value, min, max, step, tick, major, px = 12, format, tickFormat = (v) => String(v), band, onChange }: Props) {
  const id = useId();
  const drag = useRef<{ x: number; v: number } | null>(null);
  const ticks = Math.round((max - min) / tick);
  const width = ticks * px;
  const toX = (v: number) => ((v - min) / tick) * px;
  const clamp = (v: number) => {
    const s = Math.round((v - min) / step) * step + min;
    return Math.min(max, Math.max(min, Number(s.toFixed(4))));
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, v: value };
    e.currentTarget.focus();
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const next = clamp(drag.current.v - (dx / px) * tick);
    if (next !== value) onChange(next);
  };
  const onUp = () => (drag.current = null);
  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowRight: step, ArrowUp: step, ArrowLeft: -step, ArrowDown: -step, PageUp: tick * major, PageDown: -tick * major };
    if (e.key in map) {
      e.preventDefault();
      onChange(clamp(value + map[e.key]));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(min);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(max);
    }
  };

  const labels = [];
  for (let i = 0; i <= ticks; i += major) {
    const v = min + i * tick;
    labels.push(
      <span key={i} className="ruler-label" style={{ left: i * px }}>
        {tickFormat(Number(v.toFixed(4)))}
      </span>,
    );
  }

  return (
    <div className="ruler">
      <div className="ruler-head">
        <span className="ruler-name" id={`${id}-l`}>
          {label}
        </span>
        <output className="ruler-value mono" htmlFor={`${id}-s`}>
          {format(value)}
        </output>
      </div>
      <div
        id={`${id}-s`}
        className="ruler-track"
        role="slider"
        tabIndex={0}
        aria-labelledby={`${id}-l`}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
      >
        <div className="ruler-strip" style={{ width, transform: `translate3d(${-toX(value)}px,0,0)`, ['--px' as string]: `${px}px`, ['--major' as string]: `${px * major}px` }}>
          {band && (
            <span className="ruler-band" style={{ left: toX(band.from), width: toX(band.to) - toX(band.from) }}>
              <span>{band.label}</span>
            </span>
          )}
          <span className="ruler-ticks" />
          {labels}
        </div>
        <span className="ruler-needle" aria-hidden="true" />
      </div>
    </div>
  );
}
