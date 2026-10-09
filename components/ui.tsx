import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';

export function Logo({ className = '' }: { className?: string }) {
  // official logo, transparent; wordmark switched to white for the dark UI
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/img/logo-on-dark.webp?v=2" width={160} height={34} alt="Bipolar Bear" className={`logo ${className}`} />;
}

type BtnProps = { href: string; variant?: 'primary' | 'ghost' | 'dark'; arrow?: boolean; children: ReactNode; className?: string } & Omit<ComponentProps<'a'>, 'href'>;

export function Btn({ href, variant = 'primary', arrow = variant === 'primary', children, className = '', ...rest }: BtnProps) {
  const cls = `btn btn-${variant} ${className}`;
  const inner = (
    <>
      <span>{children}</span>
      {arrow && <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />}
    </>
  );
  if (/^(https?:|tel:|mailto:)|\.pdf$/.test(href))
    return (
      <a href={href} className={cls} {...rest}>
        {inner}
      </a>
    );
  return (
    <Link href={href} className={cls} {...rest}>
      {inner}
    </Link>
  );
}

export function Kicker({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return <p className={`kicker${light ? ' kicker-light' : ''}`}>{children}</p>;
}

export function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-7.2h2.4l.4-2.9h-2.8V9.1c0-.8.2-1.4 1.4-1.4h1.5V5.1c-.3 0-1.1-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H8v2.9h2.5V21h3z" />
    </svg>
  );
}
