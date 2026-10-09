/** Server-only: posts website leads to the team's Telegram group via the bot (TG_BOT_TOKEN, TG_GROUP_ID). */

const FORM_TITLE: Record<string, string> = {
  partner: 'Partner request',
  apply: 'Driver application',
  owner: 'Owner-operator application',
};

export interface Lead {
  form: string;
  name: string;
  phone: string;
  email: string;
  semiTruck?: string;
  smsConsent: boolean;
  truckId?: string;
  estimate?: Record<string, unknown>;
  receivedAt: string;
}

const esc = (v: unknown) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const usd = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? `$${Math.round(v).toLocaleString('en-US')}` : esc(v));

export function telegramConfigured() {
  return Boolean(process.env.TG_BOT_TOKEN && process.env.TG_GROUP_ID);
}

function format(l: Lead) {
  const lines = [
    `🐻‍❄️ <b>${esc(FORM_TITLE[l.form] ?? l.form)}</b> — bipolar-bear.com`,
    '',
    `👤 <b>Name:</b> ${esc(l.name)}`,
    `📞 <b>Phone:</b> <a href="tel:${esc(l.phone)}">${esc(l.phone)}</a>`,
    `✉️ <b>Email:</b> ${esc(l.email)}`,
  ];
  if (l.semiTruck) lines.push(`🚛 <b>Has a semi-truck:</b> ${l.semiTruck === 'yes' ? 'Yes' : 'No'}`);
  if (l.truckId) lines.push(`🔖 <b>Truck from catalog:</b> ${esc(l.truckId)}`);
  const e = l.estimate;
  if (e) {
    lines.push(
      '',
      '🧮 <b>Calculator estimate</b>',
      `Net / ${esc(e.period ?? 'week')} (${e.afterFuel === 'yes' ? 'after fuel' : 'before fuel'}): <b>${usd(e.net)}</b>`,
      `Gross: ${usd(e.gross)}`,
      `Miles/week: ${esc(e.miles)} · Rate: $${esc(e.rpm)}/mi${e.afterFuel === 'yes' ? ` · ${esc(e.mpg)} MPG · Diesel $${esc(e.diesel)}` : ''}`,
    );
  }
  const when = new Date(l.receivedAt).toLocaleString('en-US', { timeZone: 'America/Chicago', dateStyle: 'medium', timeStyle: 'short' });
  lines.push('', `💬 SMS consent: ${l.smsConsent ? 'Yes' : 'No'}`, `🕒 ${esc(when)} (CT)`);
  return lines.join('\n');
}

export async function sendLeadToTelegram(lead: Lead) {
  const token = process.env.TG_BOT_TOKEN;
  const chat = process.env.TG_GROUP_ID;
  if (!token || !chat) throw new Error('telegram-not-configured');
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: format(lead), parse_mode: 'HTML', disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) {
    // never log the token: only Telegram's own error description
    const info = (await r.json().catch(() => null)) as { description?: string } | null;
    throw new Error(`telegram ${r.status}: ${info?.description ?? 'unknown error'}`);
  }
}
