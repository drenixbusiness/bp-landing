export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Digits of a US phone number without the leading country code. */
export function phoneDigits(v: string) {
  let d = v.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
}

/** Progressive "(555) 555-5555" formatting while typing. */
export function formatPhone(v: string) {
  let d = v.replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('1')) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length === 0) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function validName(v: string) {
  const s = v.trim();
  return s.length >= 2 && s.length <= 80 && /\p{L}/u.test(s);
}
export function validPhone(v: string) {
  const d = phoneDigits(v);
  return d.length === 10 && /^[2-9]/.test(d);
}
export function validEmail(v: string) {
  return v.length <= 120 && EMAIL_RE.test(v.trim());
}
