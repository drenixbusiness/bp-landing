'use client';

import { useEffect, useState } from 'react';
import { Phone, ArrowRight } from 'lucide-react';
import { COMPANY } from '@/lib/content';

/** Mobile sticky action bar (shown after the hero). */
export default function OwnerNav() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.7);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className={`mobile-bar glass${show ? ' is-shown' : ''}`}>
      <a href={COMPANY.phoneHref} className="btn btn-ghost">
        <Phone size={16} aria-hidden="true" />
        <span>Call now</span>
      </a>
      <a href="#apply" className="btn btn-primary">
        <span>Apply now</span>
        <ArrowRight size={16} aria-hidden="true" />
      </a>
    </div>
  );
}
