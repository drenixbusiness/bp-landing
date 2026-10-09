import { ExternalLink, MapPin } from 'lucide-react';
import { COMPANY } from '@/lib/content';

/**
 * Our office on a CARTO dark basemap, re-tinted to the site's ice palette. Pure SVG (no map
 * library): light enough for weak phones. The viewBox is in Web-Mercator pixels at zoom Z and
 * `slice` makes it cover any aspect ratio, always centred on the office.
 */

const Z = 14;
const WORLD = 256 * 2 ** Z;
const { lat, lon } = COMPANY.address;
const s = Math.sin((lat * Math.PI) / 180);
const P = { x: ((lon + 180) / 360) * WORLD, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * WORLD };

const W = 900;
const H = 440;
const VB = { x: Math.round(P.x - W / 2), y: Math.round(P.y - H / 2) };

// tiles covering the frame, with margin for very wide / tall boxes
const tiles: { x: number; y: number }[] = [];
for (let tx = Math.floor((VB.x - 200) / 256); tx <= Math.floor((VB.x + W + 200) / 256); tx++)
  for (let ty = Math.floor((VB.y - 260) / 256); ty <= Math.floor((VB.y + H + 260) / 256); ty++) tiles.push({ x: tx, y: ty });

const KEY = process.env.NEXT_PUBLIC_CARTO_KEY;
const tileUrl = (x: number, y: number) => `https://${'abcd'[(x + y) % 4]}.basemaps.cartocdn.com/dark_all/${Z}/${x}/${y}@2x.png${KEY ? `?key=${KEY}` : ''}`;

export default function OfficeMap() {
  const a = COMPANY.address;
  return (
    <figure className="office-map glass card-dark">
      <svg viewBox={`${VB.x} ${VB.y} ${W} ${H}`} preserveAspectRatio="xMidYMid slice" role="img" aria-labelledby="office-map-title">
        <title id="office-map-title">{`Map: ${a.street}, ${a.city}`}</title>
        <defs>
          {/* luminance → navy … ice blue, so the basemap matches the site */}
          <filter id="om-ice" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0" />
            <feComponentTransfer>
              <feFuncR type="table" tableValues="0.03 0.26 0.72" />
              <feFuncG type="table" tableValues="0.07 0.44 0.92" />
              <feFuncB type="table" tableValues="0.14 0.6 1" />
            </feComponentTransfer>
          </filter>
          <radialGradient id="om-vignette" cx="50%" cy="50%" r="70%">
            <stop offset="50%" stopColor="#020814" stopOpacity="0" />
            <stop offset="100%" stopColor="#020814" stopOpacity="0.85" />
          </radialGradient>
        </defs>
        <g filter="url(#om-ice)">
          {tiles.map((t) => (
            <image key={`${t.x}-${t.y}`} href={tileUrl(t.x, t.y)} x={t.x * 256} y={t.y * 256} width="256" height="256" />
          ))}
        </g>
        <rect x={VB.x - 300} y={VB.y - 300} width={W + 600} height={H + 600} fill="url(#om-vignette)" />

        <g transform={`translate(${P.x} ${P.y})`} className="om-pin">
          <circle r="40" className="om-pulse" />
          <circle r="40" className="om-pulse om-pulse-2" />
          <circle r="9" className="om-dot" />
        </g>
      </svg>

      <figcaption className="om-card glass card-dark">
        <span className="om-icon">
          <MapPin size={18} aria-hidden="true" />
        </span>
        <span className="om-text">
          <span className="kicker">Our office · {a.place}</span>
          <strong>{a.street}</strong>
          <span>
            {a.city}, {a.country}
          </span>
        </span>
        <a href={COMPANY.mapsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost om-link">
          <span>Directions</span>
          <ExternalLink size={15} aria-hidden="true" />
        </a>
      </figcaption>
      <p className="om-credit">
        © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>
      </p>
    </figure>
  );
}
