'use client';

import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import LeadForm from '@/components/LeadForm';
import { Kicker } from '@/components/ui';
import RulerSlider from './RulerSlider';
import Odometer from './Odometer';
import TankChart from './TankChart';

const INSURANCE = 400;
const OTHER = 100;
const FEE = 0.12;
const PERIODS = { week: { label: 'Week', mult: 1 }, month: { label: 'Month', mult: 52 / 12 }, year: { label: 'Year', mult: 52 } } as const;
type Period = keyof typeof PERIODS;

const money = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;

export default function Calculator() {
  const [miles, setMiles] = useState(4000);
  const [rpm, setRpm] = useState(2.75);
  const [mpg, setMpg] = useState(6.5);
  const [diesel, setDiesel] = useState(3.9);
  const [afterFuel, setAfterFuel] = useState(true);
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
    { key: 'fixed', label: 'Insurance $400 + other $100', value: r.fixed, color: '#c6a6ff' },
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
              Drag the rulers to match your truck and lanes. Insurance ($400) and other costs ($100) are weekly; the company fee is 12% of gross.
            </p>
          </div>
          <div className="calc panel glass card-dark" data-reveal>
            <div className="calc-inputs">
              <RulerSlider
                label="Miles per week"
                value={miles}
                min={2000}
                max={6000}
                step={50}
                tick={100}
                major={5}
                px={12}
                format={(v) => `${v.toLocaleString('en-US')} mi`}
                tickFormat={(v) => v.toLocaleString('en-US')}
                band={{ from: 3200, to: 5000, label: 'Typical OTR 3,200–5,000' }}
                onChange={setMiles}
              />
              <RulerSlider label="Rate per mile" value={rpm} min={2.5} max={4} step={0.01} tick={0.05} major={5} px={16} format={(v) => `$${v.toFixed(2)}/mi`} tickFormat={(v) => `$${v.toFixed(2)}`} onChange={setRpm} />
              <RulerSlider label="Fuel economy" value={mpg} min={5} max={9} step={0.1} tick={0.1} major={10} px={10} format={(v) => `${v.toFixed(1)} MPG`} tickFormat={(v) => v.toFixed(0)} onChange={setMpg} />
              <RulerSlider label="Diesel price" value={diesel} min={3} max={8} step={0.01} tick={0.1} major={10} px={10} format={(v) => `$${v.toFixed(2)}/gal`} tickFormat={(v) => `$${v.toFixed(0)}`} onChange={setDiesel} />
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
                Gross {money(r.gross)} · {(miles / mpg).toFixed(0)} gal/week
              </p>
              <TankChart layers={layers} total={r.gross} />
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
