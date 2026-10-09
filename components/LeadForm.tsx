'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { ArrowRight, Check, Loader2, Paperclip } from 'lucide-react';
import { SMS_CONSENT } from '@/lib/content';
import { formatPhone, validEmail, validName, validPhone } from '@/lib/validate';

type Variant = 'partner' | 'apply' | 'owner';

interface Props {
  variant: Variant;
  /** Owner-operator calculator snapshot sent along with the application. */
  estimate?: { label: string; data: Record<string, number | string> };
  className?: string;
}

type Errors = Partial<Record<'name' | 'first' | 'last' | 'phone' | 'email' | 'truck' | 'form', string>>;

export default function LeadForm({ variant, estimate, className = '' }: Props) {
  const id = useId();
  const split = variant !== 'partner';
  const [v, setV] = useState({ name: '', first: '', last: '', phone: '', email: '', truck: '' as '' | 'yes' | 'no', sms: false, company: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  // truck chosen in the catalog (/apply-now?truck=…)
  const [truckId, setTruckId] = useState('');
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('truck');
    if (t) setTruckId(t.slice(0, 60));
  }, []);

  const set = <K extends keyof typeof v>(k: K, val: (typeof v)[K]) => {
    setV((s) => ({ ...s, [k]: val }));
    if (errors[k as keyof Errors]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = () => {
    const e: Errors = {};
    if (split) {
      if (!validName(v.first)) e.first = 'Please enter your first name.';
      if (!validName(v.last)) e.last = 'Please enter your last name.';
    } else if (!validName(v.name)) e.name = 'Please enter your full name.';
    if (!validPhone(v.phone)) e.phone = 'Enter a valid 10-digit US phone number.';
    if (!validEmail(v.email)) e.email = 'Enter a valid email address.';
    if (variant === 'apply' && !v.truck) e.truck = 'Please choose Yes or No.';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      const firstKey = Object.keys(e)[0];
      document.getElementById(`${id}-${firstKey}`)?.focus();
      return;
    }
    setState('sending');
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form: variant,
          name: split ? `${v.first.trim()} ${v.last.trim()}` : v.name.trim(),
          phone: v.phone,
          email: v.email.trim(),
          semiTruck: v.truck || undefined,
          smsConsent: v.sms,
          estimate: estimate?.data,
          truckId: truckId || undefined,
          company: v.company,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setState('done');
    } catch {
      setState('idle');
      setErrors({ form: 'Something went wrong. Please try again or call us.' });
    }
  };

  const firstName = (split ? v.first : v.name).trim().split(/\s+/)[0];

  if (state === 'done') {
    return (
      <div className={`lead-form lead-success ${className}`} role="status" aria-live="polite">
        <span className="success-icon">
          <Check size={28} strokeWidth={2.4} aria-hidden="true" />
        </span>
        <h3>Thanks, {firstName}.</h3>
        <p>We received your request and will contact you shortly.</p>
      </div>
    );
  }

  const field = (key: 'name' | 'first' | 'last' | 'email', label: string, type: string, auto: string, placeholder: string) => (
    <div className={`field${errors[key] ? ' has-error' : ''}`}>
      <label htmlFor={`${id}-${key}`}>{label}</label>
      <input
        id={`${id}-${key}`}
        type={type}
        autoComplete={auto}
        placeholder={placeholder}
        value={v[key]}
        onChange={(e) => set(key, e.target.value)}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${id}-${key}-err` : undefined}
        maxLength={key === 'email' ? 120 : 80}
      />
      {errors[key] && (
        <p className="field-error" id={`${id}-${key}-err`} role="alert">
          {errors[key]}
        </p>
      )}
    </div>
  );

  return (
    <form className={`lead-form ${className}`} onSubmit={submit} noValidate>
      {truckId && (
        <p className="estimate-chip">
          <Paperclip size={14} aria-hidden="true" /> Truck: <strong>{truckId}</strong>
        </p>
      )}
      {estimate && (
        <p className="estimate-chip">
          <Paperclip size={14} aria-hidden="true" /> Estimate attached: <strong>{estimate.label}</strong>
        </p>
      )}
      <div className={split ? 'field-row' : ''}>
        {split ? (
          <>
            {field('first', 'First name', 'text', 'given-name', 'John')}
            {field('last', 'Last name', 'text', 'family-name', 'Smith')}
          </>
        ) : (
          field('name', 'Full name', 'text', 'name', 'John Smith')
        )}
      </div>
      <div className={`field${errors.phone ? ' has-error' : ''}`}>
        <label htmlFor={`${id}-phone`}>Phone</label>
        <input
          id={`${id}-phone`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="(555) 123-4567"
          value={v.phone}
          onChange={(e) => set('phone', formatPhone(e.target.value))}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? `${id}-phone-err` : undefined}
        />
        {errors.phone && (
          <p className="field-error" id={`${id}-phone-err`} role="alert">
            {errors.phone}
          </p>
        )}
      </div>
      {field('email', 'Email', 'email', 'email', 'john@example.com')}

      {variant === 'apply' && (
        <fieldset className={`field segmented-field${errors.truck ? ' has-error' : ''}`}>
          <legend id={`${id}-truck-label`}>Do you have a Semi-Truck?</legend>
          <div className="segmented" role="radiogroup" aria-labelledby={`${id}-truck-label`}>
            {(['yes', 'no'] as const).map((opt, i) => (
              <label key={opt} className={v.truck === opt ? 'is-on' : ''}>
                <input id={i === 0 ? `${id}-truck` : undefined} type="radio" name={`${id}-truck`} value={opt} checked={v.truck === opt} onChange={() => set('truck', opt)} />
                <span>{opt === 'yes' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
          {errors.truck && (
            <p className="field-error" role="alert">
              {errors.truck}
            </p>
          )}
        </fieldset>
      )}

      {/* honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hp" value={v.company} onChange={(e) => set('company', e.target.value)} aria-hidden="true" />

      <label className="consent">
        <input type="checkbox" id={`${id}-sms`} checked={v.sms} onChange={(e) => set('sms', e.target.checked)} />
        <span className="consent-box" aria-hidden="true">
          <Check size={14} strokeWidth={3} />
        </span>
        <span className="consent-text">{SMS_CONSENT}</span>
      </label>

      {errors.form && (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      )}

      {/* submitting requires the consent box to be ticked */}
      <button type="submit" className="btn btn-primary btn-block" disabled={state === 'sending' || !v.sms} aria-describedby={v.sms ? undefined : `${id}-sms-hint`}>
        {state === 'sending' ? <Loader2 size={18} className="spin" aria-hidden="true" /> : null}
        <span>{state === 'sending' ? 'Sending…' : 'Submit'}</span>
        {state !== 'sending' && <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />}
      </button>
      {!v.sms && (
        <p className="consent-hint" id={`${id}-sms-hint`}>
          Tick the box above to enable Submit.
        </p>
      )}
      <p className="privacy-link">
        <Link href="/privacy-policy">Privacy Policy</Link>
      </p>
    </form>
  );
}
