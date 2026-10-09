// Builds public/assets/stars.bin from the Hipparcos-based star list of d3-celestial:
//   https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data/stars.6.json
// run: node scripts/make-stars.mjs stars.6.json public/assets/stars.bin
import fs from 'node:fs';
const [src, out] = process.argv.slice(2);
const f = JSON.parse(fs.readFileSync(src)).features.filter((s) => s.id !== 11767); // Polaris is drawn on its own
f.sort((a, b) => a.properties.mag - b.properties.mag);
const buf = new Uint16Array(f.length * 4);
f.forEach((s, i) => {
  const [lon, dec] = s.geometry.coordinates;
  const ra = (lon + 360) % 360;
  const bv = Number.isFinite(parseFloat(s.properties.bv)) ? parseFloat(s.properties.bv) : 0.6;
  const q = (v) => Math.max(0, Math.min(65535, Math.round(v)));
  buf.set([q((ra / 360) * 65535), q(((dec + 90) / 180) * 65535), q((s.properties.mag + 2) * 1000), q((bv + 0.5) * 10000)], i * 4);
});
fs.writeFileSync(out, Buffer.from(buf.buffer));
console.log(f.length, 'stars,', buf.byteLength, 'bytes');
