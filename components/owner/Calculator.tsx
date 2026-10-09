'use client';

import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import LeadForm from '@/components/LeadForm';
import { Kicker } from '@/components/ui';
import Slider from './Slider';
import Odometer from './Odometer';

const INSURANCE = 400;
const OTHER = 100;
const FEE = 0.12;
const PERIODS = { week: { label: 'Week', mult: 1 }, month: { label: 'Month', mult: 52 / 12 }, year: { label: 'Year', mult: 52 } } as const;
type Period = keyof typeof PERIODS;

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;

export default function Calculator() {
  const [miles, setMiles] = useState(4000);
  const [rpm, setRpm] = useState(3.3);
  const [mpg, setMpg] = useState(6.5);
  const [diesel, setDiesel] = useState(3.9);
  const [afterFuel, setAfterFuel] = useState(false);
  const [period, setPeriod] = useState<Period>('week');

  const r = useMemo(() => {
    const m = PERIODS[period].mult;
    const gross = miles * rpm * m;
    const fuel = (miles / mpg) * diesel * m;
    const fixed = (INSURANCE + OTHER) * m;
    const fee = gross * FEE;
    const beforeFuel = gross - fee - fixed;
    const net = afterFuel ? beforeFuel - fuel : beforeFuel;
    return { gross, fuel, fixed, fee, net, weeklyNet: (afterFuel ? beforeFuel - fuel : beforeFuel) / m };
  }, [miles, rpm, mpg, diesel, afterFuel, period]);

  const layers = [
    { key: 'keep', label: 'You keep', value: Math.max(r.net, 0), color: '#7cf7c8' },
    { key: 'fee', label: 'Company fee 12%', value: r.fee, color: '#8fb8ff' },
    { key: 'fixed', label: 'Insurance + other', value: r.fixed, color: '#c6a6ff' },
    ...(afterFuel ? [{ key: 'fuel', label: 'Fuel', value: r.fuel, color: '#ffb36b' }] : []),
  ];

  const estimate = {
    label: `${money(r.net)} / ${PERIODS[period].label.toLowerCase()}`,
    data: { miles, rpm, mpg, diesel, afterFuel: afterFuel ? 'yes' : 'no', period, net: Math.round(r.net), gross: Math.round(r.gross) },
  };

  return (
    <>
      <section className="section" id="calculator" data-chapter aria-labelledby="calc-title">
        <div className="container">
          <div className="section-head">
            <Kicker>03 — Calculator</Kicker>
            <h2 id="calc-title" className="h2 on-scene" data-reveal>
              Weekly Net Calculator
            </h2>
            <p className="section-intro on-scene" data-reveal>
              Move the sliders to match your truck and lanes. Insurance ($400) and other costs ($100) are weekly; the company fee is 12% of gross.
            </p>
          </div>
          <div className="calc panel glass card-dark" data-reveal>
            <div className="calc-inputs">
              <Slider label="Miles per week" value={miles} min={2000} max={7000} step={50} format={(v) => `${v.toLocaleString('en-US')} mi`} onChange={setMiles} />
              <Slider label="Rate per mile" value={rpm} min={2.8} max={4} step={0.01} format={(v) => `$${v.toFixed(2)}`} onChange={setRpm} />
              {/* fuel only matters for the after-fuel figure */}
              {afterFuel && (
                <>
                  <Slider label="Fuel economy" value={mpg} min={5} max={9} step={0.1} format={(v) => `${v.toFixed(1)} MPG`} onChange={setMpg} />
                  <Slider label="Diesel price" value={diesel} min={3} max={8} step={0.01} format={(v) => `$${v.toFixed(2)}`} onChange={setDiesel} />
                </>
              )}
            </div>

            <div className="calc-result">
              <div className="calc-toggles">
                <div className="seg seg-dark" role="group" aria-label="Fuel">
                  <button type="button" aria-pressed={!afterFuel} className={!afterFuel ? 'is-on' : ''} onClick={() => setAfterFuel(false)}>
                    Before fuel
                  </button>
                  <button type="button" aria-pressed={afterFuel} className={afterFuel ? 'is-on' : ''} onClick={() => setAfterFuel(true)}>
                    After fuel
                  </button>
                </div>
                <div className="seg seg-dark" role="group" aria-label="Period">
                  {(Object.keys(PERIODS) as Period[]).map((p) => (
                    <button key={p} type="button" aria-pressed={period === p} className={period === p ? 'is-on' : ''} onClick={() => setPeriod(p)}>
                      {PERIODS[p].label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="kicker">Your net / {PERIODS[period].label.toLowerCase()}</p>
              <p className="calc-net" aria-live="polite">
                <Odometer value={money(r.net)} />
              </p>
              <p className="calc-gross mono">
                Gross {money(r.gross)}
              </p>
              <div className="calc-bar" role="img" aria-label={layers.map((l) => `${l.label} ${money(l.value)}`).join(', ')}>
                {layers.map((l) => (
                  <span key={l.key} style={{ width: `${Math.max(0, (l.value / Math.max(r.gross, 1)) * 100)}%`, background: l.color }} />
                ))}
              </div>
              <ul className="calc-legend">
                {layers.map((l) => (
                  <li key={l.key}>
                    <span className="swatch" style={{ background: l.color }} />
                    <span>{l.label}</span>
                    <span className="mono">{money(l.value)}</span>
                  </li>
                ))}
              </ul>
              <p className="calc-note">
                <Info size={14} aria-hidden="true" /> Estimate only — actual earnings depend on lanes, rates, season and expenses.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="apply" data-chapter aria-labelledby="oo-apply">
        <div className="container cta-grid">
          <div className="cta-text">
            <Kicker>04 — Apply</Kicker>
            <h2 id="oo-apply" className="h2 on-scene" data-reveal>
              Apply in two minutes
            </h2>
            <p className="on-scene" data-reveal>
              Send us your details — your calculator estimate is attached automatically, so your dispatcher can call you with real loads that match it.
            </p>
          </div>
          <div className="glass-light form-card" data-reveal>
            <LeadForm variant="owner" estimate={estimate} />
          </div>
        </div>
      </section>
    </>
  );
}
