import type { Metadata } from 'next';
import { Phone } from 'lucide-react';
import SceneConfig from '@/components/SceneConfig';
import LeadForm from '@/components/LeadForm';
import { Kicker } from '@/components/ui';
import { COMPANY } from '@/lib/content';

export const metadata: Metadata = {
  title: 'Apply Now',
  description: 'Apply to drive with Bipolar Bear Enterprises. Please fill out the fields below.',
};

export default function ApplyPage() {
  return (
    <>
      <SceneConfig />
      <section className="apply" aria-labelledby="apply-h1">
        <div className="container apply-grid">
          <div className="apply-text">
            <Kicker>{COMPANY.ids}</Kicker>
            <h1 id="apply-h1" className="h1 on-scene" data-reveal>
              APPLY NOW
            </h1>
            <p className="lead on-scene" data-reveal style={{ ['--d' as string]: '.08s' }}>
              Please fill out the fields below
            </p>
            <a href={COMPANY.phoneHref} className="btn btn-ghost" data-reveal style={{ ['--d' as string]: '.14s' }}>
              <Phone size={17} aria-hidden="true" />
              <span className="mono">{COMPANY.phone}</span>
            </a>
          </div>
          <div className="glass-light form-card" data-reveal style={{ ['--d' as string]: '.1s' }}>
            <LeadForm variant="apply" />
          </div>
        </div>
      </section>
    </>
  );
}
