import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Award, CalendarClock, GraduationCap, Handshake, PackageCheck, Target, TrendingUp, Users } from 'lucide-react';
import SceneConfig from '@/components/SceneConfig';
import Faq from '@/components/Faq';
import LeadForm from '@/components/LeadForm';
import { Btn, Kicker } from '@/components/ui';
import { ABOUT, ADVANTAGES, COMPANY, FAQ, HERO, PARTNER_CTA, PARTNERS, SERVICES, WHY } from '@/lib/content';

const WHY_ICONS = [Handshake, Users, PackageCheck, GraduationCap, CalendarClock];
const ADV_ICONS = [Award, Target, TrendingUp];

export default function Home() {
  const [lead, last] = [HERO.title.replace(/ Trucking$/, ''), 'Trucking'];
  return (
    <>
      <SceneConfig chapters={[0.5, 6.5]} />

      <section className="hero" aria-labelledby="hero-title">
        <div className="container hero-inner">
          <p className="mono-strip" data-reveal>
            <span>NATIONWIDE FREIGHT SOLUTIONS</span>
            <span aria-hidden="true">·</span>
            <span>24/7 SERVICE</span>
            <span aria-hidden="true">·</span>
            <span>{COMPANY.ids}</span>
          </p>
          <h1 id="hero-title" className="h1 on-scene" data-reveal style={{ ['--d' as string]: '.08s' }}>
            {lead} <em className="mint">{last}</em>
          </h1>
          <p className="lead on-scene" data-reveal style={{ ['--d' as string]: '.16s' }}>
            {HERO.text}
          </p>
          <div className="btn-row" data-reveal style={{ ['--d' as string]: '.24s' }}>
            <Btn href="/apply-now">Join Us</Btn>
            <Btn href="/#about" variant="ghost">
              About Us
            </Btn>
          </div>
          <ul className="stat-chips" data-reveal style={{ ['--d' as string]: '.32s' }}>
            <li className="glass">
              <strong>300+</strong> BROKERS
            </li>
            <li className="glass">
              <strong>50+</strong> DRIVERS
            </li>
            <li className="glass">
              <strong>24/7</strong> SERVICE
            </li>
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="why-title">
        <div className="container">
          <div className="section-head">
            <Kicker>01 — Why us</Kicker>
            <h2 id="why-title" className="h2 on-scene" data-reveal>
              Why Choose Us?
            </h2>
            <p className="section-intro on-scene" data-reveal style={{ ['--d' as string]: '.08s' }}>
              {WHY.intro}
            </p>
          </div>
          <div className="why-grid">
            {WHY.cards.map((c, i) => {
              const Icon = WHY_ICONS[i];
              return (
                <article key={c.num} className="why-card glass card-dark" data-reveal style={{ ['--d' as string]: `${i * 0.08}s` }}>
                  <Icon size={24} strokeWidth={1.8} className="why-icon" aria-hidden="true" />
                  <p className="why-num">{c.num}</p>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="adv-title">
        <div className="container">
          <div className="panel glass card-dark adv-panel" data-reveal>
            <Kicker>Our Advantages</Kicker>
            <h2 id="adv-title" className="h2">
              {ADVANTAGES.title}
            </h2>
            <div className="adv-grid">
              {ADVANTAGES.items.map((a, i) => {
                const Icon = ADV_ICONS[i];
                return (
                  <div key={a.title} className="adv-item" data-reveal style={{ ['--d' as string]: `${0.1 + i * 0.1}s` }}>
                    <div className="adv-top">
                      <span className="adv-num">0{i + 1}</span>
                      <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                    </div>
                    <h3>{a.title}</h3>
                    <p>{a.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="svc-title">
        <div className="container">
          <div className="section-head section-head-row">
            <div>
              <Kicker>02 — Services</Kicker>
              <h2 id="svc-title" className="h2 on-scene" data-reveal>
                Services we offer
              </h2>
            </div>
            <Btn href="/service" variant="ghost" arrow>
              All services
            </Btn>
          </div>
          <div className="svc-grid">
            {SERVICES.map((s, i) => (
              <Link key={s.id} href={`/service#${s.id}`} className="svc-card glass card-dark" data-reveal style={{ ['--d' as string]: `${i * 0.07}s` }}>
                <span className="svc-tile">
                  <Image src={s.icon} alt="" width={96} height={96} />
                </span>
                <h3>{s.short}</h3>
                <p>{s.shortText}</p>
                <span className="svc-more">
                  Learn more <ArrowRight size={16} aria-hidden="true" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="faq" aria-labelledby="faq-title">
        <div className="container">
          <div className="panel glass-light faq-panel" data-reveal>
            <div className="faq-head">
              <Kicker light>FAQ</Kicker>
              <h2 id="faq-title" className="h2 dark">
                Frequently asked questions
              </h2>
            </div>
            <Faq items={FAQ} />
          </div>
        </div>
      </section>

      <section className="section" id="about" aria-labelledby="about-title">
        <div className="container about-grid">
          <div className="about-photos">
            <div className="photo glass" data-reveal>
              <Image src="/img/about-1.webp" alt="Bipolar Bear mascot in a business suit at the office" width={1024} height={1024} sizes="(max-width: 900px) 46vw, 330px" />
            </div>
            <div className="photo photo-offset glass" data-reveal style={{ ['--d' as string]: '.12s' }}>
              <Image src="/img/about-2.webp" alt="Bipolar Bear mascot driving a truck" width={1024} height={1024} sizes="(max-width: 900px) 46vw, 330px" />
            </div>
          </div>
          <div className="about-text">
            <Kicker>About</Kicker>
            <h2 id="about-title" className="h2 on-scene" data-reveal>
              Bipolar Bear
            </h2>
            <p className="on-scene" data-reveal style={{ ['--d' as string]: '.08s' }}>
              {ABOUT.p1}
            </p>
            <p className="on-scene" data-reveal style={{ ['--d' as string]: '.14s' }}>
              {ABOUT.p2}
            </p>
            <div data-reveal style={{ ['--d' as string]: '.2s' }}>
              <Btn href="/apply-now">BECOME A PARTNER</Btn>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="partners" aria-labelledby="partners-title">
        <div className="container">
          <div className="section-head">
            <Kicker>03 — Network</Kicker>
            <h2 id="partners-title" className="h2 on-scene" data-reveal>
              Our Partners
            </h2>
          </div>
          <ul className="partner-grid">
            {PARTNERS.map((p, i) => (
              <li key={p.name} className="partner-card" data-reveal style={{ ['--d' as string]: `${i * 0.07}s` }}>
                <Image src={p.src} alt={p.name} width={180} height={90} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section" id="partner-form" aria-labelledby="pf-title">
        <div className="container cta-grid">
          <div className="cta-text">
            <Kicker>Join us</Kicker>
            <h2 id="pf-title" className="h2 on-scene" data-reveal>
              {PARTNER_CTA.title}
            </h2>
            <p className="on-scene" data-reveal style={{ ['--d' as string]: '.08s' }}>
              {PARTNER_CTA.text}
            </p>
            <a href={COMPANY.phoneHref} className="big-phone mono" data-reveal style={{ ['--d' as string]: '.14s' }}>
              {COMPANY.phone}
            </a>
          </div>
          <div className="glass-light form-card" data-reveal style={{ ['--d' as string]: '.1s' }}>
            <LeadForm variant="partner" />
          </div>
        </div>
      </section>
    </>
  );
}
