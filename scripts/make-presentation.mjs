// Generates public/bipolarbear-owner-operators.pdf — run: node scripts/make-presentation.mjs
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';

const W = 1280, H = 720;
const C = {
  bg: rgb(2 / 255, 8 / 255, 20 / 255),
  panel: rgb(10 / 255, 27 / 255, 51 / 255),
  white: rgb(1, 1, 1),
  ice: rgb(207 / 255, 227 / 255, 245 / 255),
  muted: rgb(168 / 255, 195 / 255, 220 / 255),
  mint: rgb(124 / 255, 247 / 255, 200 / 255),
};

const doc = await PDFDocument.create();
doc.setTitle('Drive With BipolarBear — Owner-Operators');
doc.setAuthor('Bipolar Bear Enterprises LLC');
const bold = await doc.embedFont(StandardFonts.HelveticaBold);
const reg = await doc.embedFont(StandardFonts.Helvetica);
const mono = await doc.embedFont(StandardFonts.Courier);
const logo = await doc.embedPng(await readFile('public/img/logo-on-dark.png'));
const jpg = async (p, w, h) => doc.embedJpg(await sharp(p).resize(w, h, { fit: 'cover' }).jpeg({ quality: 80 }).toBuffer());
const hero = await jpg('public/img/svc-dispatch.webp', 1280, 720);
const fuel = await jpg('public/img/svc-fuel.webp', 600, 720);
const blue = await jpg('public/img/svc-insurance.webp', 600, 720);

function page() {
  const p = doc.addPage([W, H]);
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: C.bg });
  return p;
}
function wrap(text, font, size, max) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(t, size) > max && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
function para(p, text, x, y, { font = reg, size = 18, color = C.ice, max = 500, lh = 1.45 } = {}) {
  wrap(text, font, size, max).forEach((l, i) => p.drawText(l, { x, y: y - i * size * lh, size, font, color }));
}
function footer(p, n) {
  p.drawImage(logo, { x: 60, y: 30, width: 170, height: 36 });
  p.drawText('MC# 1257747 • US DOT# 3650011   ·   +1 (601) 427 1757   ·   info@bipolar-bear.com', { x: 240, y: 46, size: 12, font: mono, color: C.muted });
  p.drawText(String(n).padStart(2, '0'), { x: W - 90, y: 46, size: 12, font: mono, color: C.mint });
}

// 1 — cover
{
  const p = page();
  p.drawImage(hero, { x: 0, y: 0, width: W, height: H, opacity: 0.55 });
  p.drawRectangle({ x: 0, y: 0, width: 760, height: H, color: C.bg, opacity: 0.72 });
  p.drawText('OWNER-OPERATORS', { x: 60, y: 560, size: 16, font: mono, color: C.mint });
  p.drawText('Drive With', { x: 60, y: 470, size: 56, font: bold, color: C.ice });
  p.drawText('BipolarBear', { x: 60, y: 385, size: 92, font: bold, color: C.white });
  para(p, 'Earn up to $13,000/week with non-forced dispatch, pre-booked loads and a dedicated dispatcher who works for you — 24/7.', 60, 320, { size: 22, max: 620 });
  p.drawText('Weekly gross $9,000–$13,000    ·    $2.50+ per mile', { x: 60, y: 200, size: 16, font: mono, color: C.mint });
  footer(p, 1);
}

// 2 — earnings + benefits
{
  const p = page();
  p.drawText('01 — EARNINGS & BENEFITS', { x: 60, y: 640, size: 14, font: mono, color: C.mint });
  p.drawText('Real miles. Real money.', { x: 60, y: 580, size: 48, font: bold, color: C.white });
  const stats = [
    ['$9–13K', 'Weekly gross'],
    ['$2.50+', 'Per mile'],
    ['12%', 'Company fee'],
    ['3,200–5,000', 'Miles / week'],
  ];
  stats.forEach(([n, l], i) => {
    const x = 60 + i * 292;
    p.drawRectangle({ x, y: 400, width: 272, height: 140, color: C.panel, borderColor: C.muted, borderWidth: 0.5, borderOpacity: 0.3 });
    p.drawText(n, { x: x + 22, y: 470, size: 38, font: bold, color: C.mint });
    p.drawText(l.toUpperCase(), { x: x + 22, y: 428, size: 13, font: mono, color: C.muted });
  });
  const benefits = ['Non-Forced Dispatch', 'Dedicated Dispatcher', 'Pre-Booked Loads', '24/7 Support', 'No Hidden Fees', 'Partner Network', 'Transparent Rates', 'Compliance Made Simple'];
  benefits.forEach((b, i) => {
    const x = 60 + (i % 4) * 292, y = 330 - Math.floor(i / 4) * 70;
    p.drawCircle({ x: x + 8, y: y + 7, size: 5, color: C.mint });
    p.drawText(b, { x: x + 24, y, size: 20, font: bold, color: C.ice });
  });
  footer(p, 2);
}

// 3 — services + contact
{
  const p = page();
  p.drawImage(fuel, { x: 680, y: 0, width: 300, height: H, opacity: 0.9 });
  p.drawImage(blue, { x: 980, y: 0, width: 300, height: H, opacity: 0.9 });
  p.drawText('02 — WHAT YOU GET', { x: 60, y: 640, size: 14, font: mono, color: C.mint });
  p.drawText('Everything handled.', { x: 60, y: 580, size: 48, font: bold, color: C.white });
  const svc = [
    ['Dispatch', 'Unlimited searches of high-priced loads through a network of more than 1,000+ brokers.'],
    ['HR & Driver Support', 'Your bridge to the company: questions and issues solved, always supported.'],
    ['Accounting, billing, & factoring', 'Billing paperwork, W9 tax records and load payoffs on settlement week.'],
    ['Fuel', 'No personal cash at the pump — charged back on your weekly payout with bonuses.'],
    ['Insurance', 'Wholesale-term rates, discounted liability and cargo insurance.'],
  ];
  svc.forEach(([t, d], i) => {
    const y = 500 - i * 74;
    p.drawText(t, { x: 60, y, size: 20, font: bold, color: C.ice });
    para(p, d, 60, y - 24, { size: 14, color: C.muted, max: 560 });
  });
  p.drawText('Apply: bipolar-bear.com/apply-now', { x: 60, y: 110, size: 18, font: mono, color: C.mint });
  footer(p, 3);
}

await writeFile('public/bipolarbear-owner-operators.pdf', await doc.save());
console.log('wrote public/bipolarbear-owner-operators.pdf');
