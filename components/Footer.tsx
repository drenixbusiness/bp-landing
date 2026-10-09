import Link from 'next/link';
import { Mail, Phone } from 'lucide-react';
import { COMPANY } from '@/lib/content';
import { FacebookIcon, InstagramIcon, Logo } from './ui';

const LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Services', href: '/service' },
  { label: 'Our Partners', href: '/#partners' },
  { label: 'FAQ', href: '/#faq' },
  { label: 'Catalog', href: '/catalog' },
  { label: 'Owner-Operators', href: '/owner-operators' },
  { label: 'Privacy & Terms', href: '/privacy-policy' },
  { label: 'Apply Now', href: '/apply-now' },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-bar glass">
          <div className="footer-brand">
            <Link href="/" aria-label="Bipolar Bear — home">
              <Logo />
            </Link>
            <p className="footer-legal">
              {COMPANY.name}
              <br />
              <span className="mono">{COMPANY.ids}</span>
            </p>
            <div className="footer-social">
              <a href={COMPANY.instagram} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label="Instagram: bipolarbear_enterprises">
                <InstagramIcon />
              </a>
              <a href={COMPANY.facebook} target="_blank" rel="noopener noreferrer" className="icon-btn" aria-label="Facebook: BipolarbearEnterprisesLLC">
                <FacebookIcon />
              </a>
            </div>
          </div>
          <nav className="footer-links" aria-label="Footer">
            {LINKS.map((l) => (
              <Link key={l.label} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="footer-contact">
            <p className="kicker">Contact</p>
            <a href={COMPANY.phoneHref}>
              <Phone size={16} aria-hidden="true" /> {COMPANY.phone}
            </a>
            <a href={`mailto:${COMPANY.email}`}>
              <Mail size={16} aria-hidden="true" /> {COMPANY.email}
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} BIPOLARBEAR ENTERPRISES LLC</span>
          <Link href="/privacy-policy">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}
