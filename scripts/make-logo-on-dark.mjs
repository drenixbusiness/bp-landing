// public/img/logo-color.png → logo-on-dark.{png,webp}: the round badge keeps its colours, the
// navy wordmark turns white and its white letter counters become transparent.
// run: node scripts/make-logo-on-dark.mjs
import sharp from 'sharp';

const BADGE_END = 162; // px: the badge ends at x≈157, the wordmark starts at x≈166
const { data, info } = await sharp('public/img/logo-color.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

// navy reference = darkest opaque wordmark colour
let navy = 765;
for (let y = 0; y < H; y++)
  for (let x = BADGE_END; x < W; x++) {
    const i = (y * W + x) * 4;
    if (data[i + 3] > 250) navy = Math.min(navy, data[i] + data[i + 1] + data[i + 2]);
  }

for (let y = 0; y < H; y++)
  for (let x = BADGE_END; x < W; x++) {
    const i = (y * W + x) * 4;
    const t = Math.min(1, Math.max(0, (data[i] + data[i + 1] + data[i + 2] - navy) / (765 - navy))); // 0 navy … 1 white
    data[i] = data[i + 1] = data[i + 2] = 255;
    data[i + 3] = Math.round(data[i + 3] * (1 - t));
  }

const img = sharp(data, { raw: { width: W, height: H, channels: 4 } });
await img.clone().png({ compressionLevel: 9 }).toFile('public/img/logo-on-dark.png');
await img.clone().webp({ quality: 92, alphaQuality: 100 }).toFile('public/img/logo-on-dark.webp');
console.log('navy sum', navy, '→ logo-on-dark.png/.webp', W, 'x', H);
