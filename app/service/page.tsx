import type { Metadata } from 'next';
import Image from 'next/image';
import { Phone } from 'lucide-react';
import SceneConfig from '@/components/SceneConfig';
import { Btn, Kicker } from '@/components/ui';
import { COMPANY, PARTNER_CTA, SERVICES } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Services',
  description: 'Dispatch, Safety Legal Logbook, Accounting, Billing & factoring, Fuel and Insurance services for owner-operators.',
};

export default function ServicesPage() {
  return (
    <>
      <SceneConfig />
      <section className="page-hero" aria-labelledby="svc-h1">
        <div className="container">
          <Kicker>What we do</Kicker>
          <h1 id="svc-h1" className="h1 giant on-scene" data-reveal>
            Services
          </h1>
          <nav className="pill-tabs" aria-label="Services" data-reveal style={{ ['--d' as string]: '.12s' }}>
            {SERVICES.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className="pill-tab glass">
                <span className="mono">0{i + 1}</span> {s.tab}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {SERVICES.map((s, i) => (
        <section key={s.id} id={s.id} className="section svc-split-sec" aria-labelledby={`${s.id}-t`}>
          <div className={`container svc-split${i % 2 ? ' is-flipped' : ''}`}>
            <div className="svc-split-text glass card-dark" data-reveal>
              <div className="svc-split-top">
                <span className="mono mint">0{i + 1} / 05</span>
                <span className="svc-tile svc-tile-sm">
                  <Image src={s.icon} alt="" width={64} height={64} />
                </span>
              </div>
              <h2 id={`${s.id}-t`} className="h2">
                {s.title}
              </h2>
              <p>{s.text}</p>
              <Btn href="/apply-now">Become a Partner</Btn>
            </div>
            <div className="svc-split-photo glass" data-reveal style={{ ['--d' as string]: '.12s' }}>
              <Image src={s.photo} alt={`${s.title} — Bipolar Bear`} width={1024} height={1024} sizes="(max-width: 900px) 100vw, 640px" />
            </div>
          </div>
        </section>
      ))}

      <section className="section" aria-labelledby="svc-cta">
        <div className="container">
          <div className="panel glass card-dark closing-panel" data-reveal>
            <Kicker>Join us</Kicker>
            <h2 id="svc-cta" className="h2">
              {PARTNER_CTA.title}
            </h2>
            <p>{PARTNER_CTA.text}</p>
            <div className="btn-row center">
              <Btn href="/apply-now">Apply Now</Btn>
              <a href={COMPANY.phoneHref} className="btn btn-ghost">
                <Phone size={17} aria-hidden="true" />
                <span className="mono">{COMPANY.phone}</span>
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
