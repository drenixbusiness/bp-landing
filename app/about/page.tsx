import type { Metadata } from 'next';
import Image from 'next/image';
import { AtSign, Award, Building2, CalendarClock, GraduationCap, Handshake, Mail, MapPin, PackageCheck, Phone, ShieldCheck, Target, TrendingUp, Users } from 'lucide-react';
import SceneConfig from '@/components/SceneConfig';
import LeadForm from '@/components/LeadForm';
import OfficeMap from '@/components/OfficeMap';
import CopyButton from '@/components/CopyButton';
import { Btn, FacebookIcon, InstagramIcon, Kicker } from '@/components/ui';
import { ABOUT, ADVANTAGES, COMPANY, PARTNERS, WHY } from '@/lib/content';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'About Bipolar Bear Enterprises LLC — a trucking and transportation company based in Hattiesburg, Mississippi, with 300+ partnered brokers and 24/7 service. MC# 1257747 • US DOT# 3650011.',
};

const WHY_ICONS = [Handshake, Users, PackageCheck, GraduationCap, CalendarClock];
const ADV_ICONS = [Award, Target, TrendingUp];

const DETAILS: [string, string][] = [
  ['Legal name', COMPANY.legalName],
  ['MC number', `MC# ${COMPANY.mc}`],
  ['US DOT number', `US DOT# ${COMPANY.dot}`],
  ['Office', `${COMPANY.address.street}, ${COMPANY.address.city}`],
  ['Equipment', 'PO/VAN'],
  ['Broker network', '300+ partnered brokers in all states'],
  ['Service hours', '24/7'],
];

export default function AboutPage() {
  return (
    <>
      <SceneConfig />

      <section className="page-hero about-hero" aria-labelledby="about-h1">
        <div className="container">
          <Kicker>About Us</Kicker>
          <h1 id="about-h1" className="h1 on-scene" data-reveal>
            About <span className="mint">Bipolar Bear</span>
          </h1>
          <p className="lead on-scene" data-reveal style={{ ['--d' as string]: '.08s' }}>
            {ABOUT.p1}
          </p>
          <ul className="id-chips" data-reveal style={{ ['--d' as string]: '.16s' }}>
            <li className="glass card-dark">
              <span>MC#</span> {COMPANY.mc}
            </li>
            <li className="glass card-dark">
              <span>US DOT#</span> {COMPANY.dot}
            </li>
            <li className="glass card-dark">
              <span>SERVICE</span> 24/7
            </li>
          </ul>
        </div>
      </section>

      <section className="section" aria-labelledby="story-title">
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
            <Kicker>01 — Who we are</Kicker>
            <h2 id="story-title" className="h2 on-scene" data-reveal>
              Our story
            </h2>
            <p className="on-scene" data-reveal>
              {ABOUT.p2}
            </p>
            <p className="on-scene" data-reveal>
              {WHY.intro}
            </p>
            <div className="btn-row" data-reveal>
              <Btn href="/apply-now">BECOME A PARTNER</Btn>
              <Btn href="/service" variant="ghost">
                Our services
              </Btn>
            </div>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="numbers-title">
        <div className="container">
          <div className="section-head">
            <Kicker>02 — In numbers</Kicker>
            <h2 id="numbers-title" className="h2 on-scene" data-reveal>
              Bipolar Bear in numbers
            </h2>
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

      <section className="section" aria-labelledby="values-title">
        <div className="container">
          <div className="panel glass card-dark adv-panel" data-reveal>
            <Kicker>03 — What we stand for</Kicker>
            <h2 id="values-title" className="h2">
              {ADVANTAGES.title}
            </h2>
            <div className="adv-grid">
              {ADVANTAGES.items.map((a, i) => {
                const Icon = ADV_ICONS[i];
                return (
                  <div key={a.title} className="adv-item">
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

      <section className="section" id="company" aria-labelledby="company-title">
        <div className="container company-grid">
          <div className="section-head">
            <Kicker>04 — Company details</Kicker>
            <h2 id="company-title" className="h2 on-scene" data-reveal>
              Company information
            </h2>
            <p className="section-intro on-scene" data-reveal>
              Licensed interstate carrier operating nationwide. Verify our authority with the FMCSA using the numbers below.
            </p>
            <div className="btn-row" data-reveal>
              <a className="btn btn-ghost" href={`https://safer.fmcsa.dot.gov/query.asp?searchtype=ANY&query_type=queryCarrierSnapshot&query_param=USDOT&query_string=${COMPANY.dot}`} target="_blank" rel="noopener noreferrer">
                <ShieldCheck size={17} aria-hidden="true" />
                <span>Check on FMCSA SAFER</span>
              </a>
            </div>
          </div>
          <dl className="details glass card-dark" data-reveal>
            {DETAILS.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section" id="contacts" aria-labelledby="contacts-title">
        <div className="container">
          <div className="section-head">
            <Kicker>05 — Contacts</Kicker>
            <h2 id="contacts-title" className="h2 on-scene" data-reveal>
              Get in touch
            </h2>
            <p className="section-intro on-scene" data-reveal>
              Our team is available 24/7 — call, write or message us on social media.
            </p>
          </div>
          <ul className="contact-grid">
            <li className="contact-card glass card-dark" data-reveal>
              <span className="contact-icon">
                <Phone size={20} aria-hidden="true" />
              </span>
              <p className="kicker">Main line · 24/7</p>
              <a href={COMPANY.phoneHref} className="contact-value mono">
                {COMPANY.phone}
              </a>
              <CopyButton value={COMPANY.phone} label="phone number" />
            </li>
            <li className="contact-card glass card-dark" data-reveal style={{ ['--d' as string]: '.06s' }}>
              <span className="contact-icon">
                <Mail size={20} aria-hidden="true" />
              </span>
              <p className="kicker">General inquiries</p>
              <a href={`mailto:${COMPANY.email}`} className="contact-value">
                {COMPANY.email}
              </a>
              <CopyButton value={COMPANY.email} label="email address" />
            </li>
            <li className="contact-card glass card-dark" data-reveal style={{ ['--d' as string]: '.12s' }}>
              <span className="contact-icon">
                <Building2 size={20} aria-hidden="true" />
              </span>
              <p className="kicker">Operations</p>
              <a href={`mailto:${COMPANY.operationsEmail}`} className="contact-value">
                {COMPANY.operationsEmail}
              </a>
              <CopyButton value={COMPANY.operationsEmail} label="operations email" />
            </li>
            <li className="contact-card contact-wide glass card-dark" data-reveal style={{ ['--d' as string]: '.18s' }}>
              <span className="contact-icon">
                <MapPin size={20} aria-hidden="true" />
              </span>
              <p className="kicker">Office</p>
              <a href={COMPANY.mapsUrl} target="_blank" rel="noopener noreferrer" className="contact-value">
                {COMPANY.address.street}
              </a>
              <p className="contact-note">
                {COMPANY.address.city}, {COMPANY.address.country}
              </p>
            </li>
            <li className="contact-card glass card-dark" data-reveal style={{ ['--d' as string]: '.24s' }}>
              <span className="contact-icon">
                <AtSign size={20} aria-hidden="true" />
              </span>
              <p className="kicker">Follow us</p>
              <div className="social-row">
                <a href={COMPANY.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                  <InstagramIcon />
                  <span>Instagram</span>
                </a>
                <a href={COMPANY.facebook} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
                  <FacebookIcon />
                  <span>Facebook</span>
                </a>
              </div>
            </li>
          </ul>
          <div className="map-wrap" data-reveal>
            <OfficeMap />
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="about-partners">
        <div className="container">
          <div className="section-head">
            <Kicker>06 — Network</Kicker>
            <h2 id="about-partners" className="h2 on-scene" data-reveal>
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

      <section className="section" id="contact-form" aria-labelledby="about-form-title">
        <div className="container cta-grid">
          <div className="cta-text">
            <Kicker>Write to us</Kicker>
            <h2 id="about-form-title" className="h2 on-scene" data-reveal>
              Partner with Bipolar Bear today!
            </h2>
            <p className="on-scene" data-reveal>
              Leave your details and our team will call you back.
            </p>
            <a href={COMPANY.phoneHref} className="big-phone mono" data-reveal>
              {COMPANY.phone}
            </a>
          </div>
          <div className="glass-light form-card" data-reveal>
            <LeadForm variant="partner" />
          </div>
        </div>
      </section>
    </>
  );
}
