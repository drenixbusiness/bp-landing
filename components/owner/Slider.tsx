'use client';

import { useId } from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

/** A plain range input styled as an icy track with a mint fill. */
export default function Slider({ label, value, min, max, step, format, onChange }: Props) {
  const id = useId();
  const p = ((value - min) / (max - min)) * 100;
  return (
    <div className="cs-row">
      <div className="cs-head">
        <label htmlFor={id} className="cs-label">
          {label}
        </label>
        <output htmlFor={id} className="cs-value mono">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="cs-range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        style={{ ['--p' as string]: `${p}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="cs-scale mono" aria-hidden="true">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}
