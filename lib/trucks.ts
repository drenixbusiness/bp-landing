import fallback from '@/data/trucks.json';

/** Google Sheet with the truck list (must stay "anyone with the link can view"). */
export const TRUCK_SHEET_ID = '15HFoE6tLjXJaQUG03zhjhcImBqgRGXkYIhNwqjn-6Zo';
const SHEET_CSV = `https://docs.google.com/spreadsheets/d/${TRUCK_SHEET_ID}/export?format=csv&gid=0`;

/** Photos live at img.bipolar-bear.com/assets/truck-{row}-{n}.webp (row = sheet row, 1-based, without header). */
export const TRUCK_IMAGE_BASE = 'https://img.bipolar-bear.com/assets/';
export const PHOTOS_PER_TRUCK = 4;

export interface Truck {
  id: string;
  year: number;
  model: string;
  condition: string;
  pay: string;
  location: string;
  locationName: string;
  status: string;
  features: string[];
  photos: string[];
}

const MODEL_NAMES: Record<string, string> = {
  FRTH: 'Freightliner',
  FRHT: 'Freightliner',
  FREIGHTLINER: 'Freightliner',
  VOLVO: 'Volvo',
  PETERBILT: 'Peterbilt',
  PETE: 'Peterbilt',
  KENWORTH: 'Kenworth',
  KW: 'Kenworth',
  INTERNATIONAL: 'International',
  INTL: 'International',
  MACK: 'Mack',
  WESTERN: 'Western Star',
};

const STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky',
  LA: 'Louisiana', ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
  NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island',
  SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, CRLF). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim()));
}

/** "30% 70cpm" → "30% Gross / $0.70 CPM"; anything else is shown as typed. */
function formatPay(raw: string) {
  const m = raw.match(/(\d+(?:\.\d+)?)\s*%\s*(\d+(?:\.\d+)?)\s*c(?:pm|ents?)/i);
  if (!m) return raw.trim();
  return `${m[1]}% Gross / $${(Number(m[2]) / 100).toFixed(2)} CPM`;
}

const photosFor = (id: string) => Array.from({ length: PHOTOS_PER_TRUCK }, (_, i) => `${TRUCK_IMAGE_BASE}truck-${id}-${i + 1}.webp`);

export function rowsToTrucks(rows: string[][]): Truck[] {
  const [head, ...body] = rows;
  if (!head) return [];
  const col = (name: RegExp) => head.findIndex((h) => name.test(h.trim()));
  const c = {
    year: col(/year/i),
    model: col(/model/i),
    condition: col(/condition/i),
    pay: col(/pay/i),
    location: col(/location/i),
    status: col(/status/i),
    info: col(/info|note/i),
  };
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
  return body.map((r, i) => {
    const id = String(i + 1);
    const rawModel = get(r, c.model);
    const location = get(r, c.location).toUpperCase();
    return {
      id,
      year: Number(get(r, c.year)) || 0,
      model: MODEL_NAMES[rawModel.toUpperCase()] ?? rawModel,
      condition: get(r, c.condition),
      pay: formatPay(get(r, c.pay)),
      location,
      locationName: STATES[location] ?? location,
      status: get(r, c.status) || 'Available',
      features: get(r, c.info)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      photos: photosFor(id),
    };
  });
}

/** Live list from the sheet (cached 5 min); falls back to the bundled snapshot if the sheet is unreachable. */
export async function getTrucks(): Promise<Truck[]> {
  try {
    const res = await fetch(SHEET_CSV, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(String(res.status));
    const trucks = rowsToTrucks(parseCsv(await res.text()));
    if (trucks.length) return trucks;
    throw new Error('empty sheet');
  } catch (e) {
    console.warn('[catalog] using bundled truck snapshot:', e);
    return fallback as Truck[];
  }
}
