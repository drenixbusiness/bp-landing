'use client';

export interface TankLayer {
  key: string;
  label: string;
  value: number;
  color: string;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

/** Gross revenue as a tank of liquid; each cost is a layer, what you keep sits at the bottom. */
export default function TankChart({ layers, total }: { layers: TankLayer[]; total: number }) {
  let acc = 0;
  const safeTotal = Math.max(total, 1);
  return (
    <div className="tank-wrap">
      <div className="tank" role="img" aria-label={layers.map((l) => `${l.label} ${money(l.value)}`).join(', ')}>
        <div className="tank-glass" />
        {layers.map((l) => {
          const h = Math.max(0, (l.value / safeTotal) * 100);
          const bottom = acc;
          acc += h;
          return (
            <div key={l.key} className="tank-layer" style={{ bottom: `${bottom}%`, height: `${h}%`, ['--c' as string]: l.color }}>
              <svg className="tank-wave" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 6 Q 25 0 50 6 T 100 6 T 150 6 T 200 6 V12 H0 Z" />
              </svg>
            </div>
          );
        })}
        <div className="tank-ticks" aria-hidden="true">
          {[0, 25, 50, 75, 100].map((t) => (
            <span key={t} style={{ bottom: `${t}%` }} />
          ))}
        </div>
      </div>
      <ul className="tank-legend">
        {[...layers].reverse().map((l) => (
          <li key={l.key}>
            <span className="swatch" style={{ background: l.color }} />
            <span className="lg-label">{l.label}</span>
            <span className="lg-val mono">{money(l.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
