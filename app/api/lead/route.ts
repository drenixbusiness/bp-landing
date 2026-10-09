import { NextResponse } from 'next/server';
import { phoneDigits, validEmail, validName, validPhone } from '@/lib/validate';

const FORMS = new Set(['partner', 'apply', 'owner']);

// naive per-instance rate limit: 8 submissions / 10 min / IP
const hits = new Map<string, number[]>();

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 600_000);
  if (recent.length >= 8) return NextResponse.json({ ok: false, error: 'rate-limit' }, { status: 429 });
  hits.set(ip, [...recent, now]);

  const str = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : '');
  // honeypot filled → pretend success
  if (str('company')) return NextResponse.json({ ok: true });

  const lead = {
    form: str('form'),
    name: str('name').trim(),
    phone: str('phone'),
    email: str('email').trim(),
    semiTruck: str('semiTruck') || undefined,
    smsConsent: body.smsConsent === true,
    truckId: str('truckId').slice(0, 60) || undefined,
    estimate: typeof body.estimate === 'object' && body.estimate ? body.estimate : undefined,
    receivedAt: new Date().toISOString(),
  };
  const errors: string[] = [];
  if (!FORMS.has(lead.form)) errors.push('form');
  if (!validName(lead.name)) errors.push('name');
  if (!validPhone(lead.phone)) errors.push('phone');
  if (!validEmail(lead.email)) errors.push('email');
  if (lead.form === 'apply' && !['yes', 'no'].includes(lead.semiTruck || '')) errors.push('semiTruck');
  if (errors.length) return NextResponse.json({ ok: false, errors }, { status: 422 });

  const payload = { ...lead, phone: `+1${phoneDigits(lead.phone)}` };
  const hook = process.env.LEAD_WEBHOOK_URL;
  if (hook) {
    try {
      const r = await fetch(hook, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) throw new Error(String(r.status));
    } catch (e) {
      console.error('[lead] webhook failed', e);
      return NextResponse.json({ ok: false, error: 'delivery' }, { status: 502 });
    }
  } else {
    console.info('[lead]', JSON.stringify(payload));
  }
  return NextResponse.json({ ok: true });
}
