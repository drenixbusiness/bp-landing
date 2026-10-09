import type { Metadata } from 'next';
import { BadgeDollarSign, CalendarCheck, Download, Eye, Handshake, Headset, HeartHandshake, Route, UserRound } from 'lucide-react';
import SceneConfig from '@/components/SceneConfig';
import Faq from '@/components/Faq';
import Calculator from '@/components/owner/Calculator';
import OwnerNav from '@/components/owner/OwnerNav';
import { Btn, Kicker } from '@/components/ui';
import { COMPANY } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Owner-Operators — Drive With BipolarBear',
  description: 'Earn up to $14,000+/week as an owner-operator with BipolarBear. Non-forced dispatch, pre-booked loads, a dedicated dispatcher and 24/7 support.',
};

const BENEFITS = [
  { icon: Route, title: 'Non-Forced Dispatch', text: 'You choose the loads and lanes you run. We bring options — you make the call.' },
  { icon: UserRound, title: 'Dedicated Dispatcher', text: 'One person who knows your truck, your home time and your preferred lanes.' },
  { icon: CalendarCheck, title: 'Pre-Booked Loads', text: 'Your next load is lined up before you deliver, so the wheels keep turning.' },
  { icon: Headset, title: '24/7 Support', text: 'Breakdowns, detention or paperwork — a real person answers day and night.' },
  { icon: BadgeDollarSign, title: 'No Hidden Fees', text: 'One flat 12% company fee. What you see in the calculator is what you get.' },
  { icon: Handshake, title: 'Partner Network', text: 'Over 300 partnered brokers in all states for steady, high-paying freight.' },
  { icon: Eye, title: 'Transparent Rates', text: 'See the broker rate on every load. No secret margins between you and the freight.' },
  { icon: HeartHandshake, title: 'HR Always on Your Side', text: 'Our HR team is your bridge to the company — any question or issue, they support you and get it solved.' },
];

const OO_FAQ = [
  { q: 'Is dispatch really non-forced?', a: 'Yes. You decide which loads and lanes you run. Your dedicated dispatcher brings you options and negotiates rates — the final call is always yours.' },
  { q: 'What does the 12% company fee cover?', a: 'Dispatch, HR & driver support, accounting, billing and factoring paperwork, and 24/7 support. There are no hidden fees on top.' },
  { q: 'How is fuel handled?', a: 'No personal cash purchases at the pump, charge back the fuel spent on your weekly payout with additional custom bonuses.' },
  { q: 'How do I get started?', a: 'Simply reach out to our team, and we will guide you through the onboarding process, consider your personal preferences, and design a service package that best suits your business goals.' },
  { q: 'Is the calculator a guarantee of earnings?', a: 'No. It is an estimate based on the numbers you enter. Real earnings depend on lanes, rates, season, equipment and your own expenses.' },
];

export default function OwnerOperatorsPage() {
  return (
    <>
      <SceneConfig />
      <OwnerNav />

      <section className="hero oo-hero" data-chapter aria-labelledby="oo-h1">
        <div className="container hero-inner">
          <p className="mono-strip" data-reveal>
            <span>OWNER-OPERATORS</span>
            <span aria-hidden="true">·</span>
            <span>{COMPANY.ids}</span>
          </p>
          <h1 id="oo-h1" className="h1 on-scene oo-title" data-reveal style={{ ['--d' as string]: '.08s' }}>
            <span className="oo-line">Drive With</span>
            <span className="mint">BipolarBear</span>
          </h1>
          <p className="lead on-scene" data-reveal style={{ ['--d' as string]: '.16s' }}>
            Earn up to <strong className="mint">$14,000+/week</strong> with non-forced dispatch, pre-booked loads and a dedicated dispatcher who works for you — 24/7.
          </p>
          <div className="btn-row" data-reveal style={{ ['--d' as string]: '.24s' }}>
            <Btn href="#apply">Apply now</Btn>
            <Btn href="#calculator" variant="ghost">
              Calculate your net
            </Btn>
          </div>
          <ul className="stat-chips" data-reveal style={{ ['--d' as string]: '.32s' }}>
            <li className="glass">
              <span className="chip-label">Weekly gross</span> <strong>$9,000–$14,000+</strong>
            </li>
            <li className="glass">
              <strong>$2.80+</strong> per mile
            </li>
          </ul>
        </div>
      </section>

      <section className="section" id="earnings" data-chapter aria-labelledby="earn-title">
        <div className="container">
          <div className="section-head">
            <Kicker>01 — Earnings</Kicker>
            <h2 id="earn-title" className="h2 on-scene" data-reveal>
              Real miles. Real money.
            </h2>
          </div>
          <div className="earn-grid">
            {[
              { n: '$9–14K +', l: 'Weekly gross', t: 'Typical gross for an OTR owner-operator running consistent lanes with our dispatch.' },
              { n: '$2.80+', l: 'Per mile', t: 'Rates negotiated across a network of more than 1,000+ brokers.' },
              { n: '12%', l: 'Company fee', t: 'One flat fee for dispatch, HR support, billing & factoring.' },
              { n: '3.2–5K', l: 'Miles / week', t: 'Typical OTR range of 3,200–5,000 miles — pick the pace that fits your home time.' },
            ].map((e, i) => (
              <div key={e.l} className="earn-card glass card-dark" data-reveal style={{ ['--d' as string]: `${i * 0.08}s` }}>
                <p className="earn-num">{e.n}</p>
                <p className="kicker">{e.l}</p>
                <p>{e.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="why" data-chapter aria-labelledby="why-oo">
        <div className="container">
          <div className="section-head">
            <Kicker>02 — Why BipolarBear</Kicker>
            <h2 id="why-oo" className="h2 on-scene" data-reveal>
              Built around the driver
            </h2>
          </div>
          <div className="benefit-grid">
            {BENEFITS.map((b, i) => (
              <div key={b.title} className="benefit-card glass card-dark" data-reveal style={{ ['--d' as string]: `${(i % 4) * 0.07}s` }}>
                  <span className="benefit-icon">
                    <b.icon size={22} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <h3>{b.title}</h3>
                  <p>{b.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Calculator />

      <section className="section" id="faq-oo" data-chapter aria-labelledby="faq-oo-title">
        <div className="container">
          <div className="panel glass-light faq-panel" data-reveal>
            <div className="faq-head">
              <Kicker light>05 — FAQ</Kicker>
              <h2 id="faq-oo-title" className="h2 dark">
                Owner-operator questions
              </h2>
            </div>
            <Faq items={OO_FAQ} />
          </div>
        </div>
      </section>

      <section className="section oo-close" data-chapter aria-labelledby="oo-close">
        <div className="container">
          <div className="panel glass card-dark closing-panel" data-reveal>
            <h2 id="oo-close" className="h2">
              Earn up to <span className="mint">$14,000+/week.</span>
            </h2>
            <p>Join 80+ drivers and owner-operators already running with BipolarBear.</p>
            <div className="btn-row center">
              <Btn href="#apply">Apply now</Btn>
              <a href="/bipolarbear-owner-operators.pdf" className="btn btn-ghost" download="BipolarBear-Owner-Operators.pdf">
                <Download size={17} aria-hidden="true" />
                <span>Download Presentation (PDF)</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
