import * as THREE from 'three';

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

/** Soft radial glow used for star halos, headlights and beacons. */
export function glowTexture(size = 128) {
  const [c, g] = canvas(size, size);
  const r = size / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.12, 'rgba(255,255,255,.85)');
  grd.addColorStop(0.35, 'rgba(255,255,255,.22)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const logoCache = new Map<string, Promise<HTMLImageElement | null>>();
/** 'dark' = white wordmark for dark surfaces, 'color' = original navy logo for light surfaces. */
export function loadLogo(variant: 'dark' | 'color'): Promise<HTMLImageElement | null> {
  const src = variant === 'dark' ? '/img/logo-on-dark.png?v=2' : '/img/logo-color.png';
  if (!logoCache.has(src)) {
    logoCache.set(
      src,
      new Promise((res) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = () => res(null);
        img.src = src;
      }),
    );
  }
  return logoCache.get(src)!;
}

/** 20ft shipping container side: corrugated ribs + logo. */
export function containerTexture(aniso: number) {
  const [c, g] = canvas(1024, 512);
  const paint = () => {
    g.fillStyle = '#1a4f8f';
    g.fillRect(0, 0, 1024, 512);
    for (let x = 0; x < 1024; x += 32) {
      const grd = g.createLinearGradient(x, 0, x + 32, 0);
      grd.addColorStop(0, 'rgba(255,255,255,.10)');
      grd.addColorStop(0.45, 'rgba(255,255,255,0)');
      grd.addColorStop(0.55, 'rgba(0,0,0,.18)');
      grd.addColorStop(1, 'rgba(0,0,0,.02)');
      g.fillStyle = grd;
      g.fillRect(x, 0, 32, 512);
    }
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(0, 0, 1024, 18);
    g.fillRect(0, 494, 1024, 18);
    // rust/grime streaks
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(20,30,50,${Math.random() * 0.08})`;
      g.fillRect(Math.random() * 1024, 18, 2 + Math.random() * 6, Math.random() * 200);
    }
  };
  paint();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  loadLogo('dark').then((img) => {
    if (!img) return;
    const w = 640, h = (w * img.height) / img.width;
    g.globalAlpha = 0.95;
    g.drawImage(img, 512 - w / 2, 256 - h / 2, w, h);
    g.globalAlpha = 1;
    tex.needsUpdate = true;
  });
  return tex;
}

/** 53' trailer side: white panel, blue logo. */
export function trailerTexture(aniso: number) {
  const [c, g] = canvas(2048, 512);
  g.fillStyle = '#eef3f8';
  g.fillRect(0, 0, 2048, 512);
  for (let x = 0; x < 2048; x += 64) {
    g.fillStyle = 'rgba(30,50,80,.07)';
    g.fillRect(x, 0, 3, 512);
  }
  g.fillStyle = 'rgba(30,50,80,.18)';
  g.fillRect(0, 488, 2048, 24);
  g.fillStyle = '#1a4f8f';
  g.fillRect(0, 440, 2048, 22);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = aniso;
  loadLogo('color').then((img) => {
    if (!img) return;
    const w = 1300, h = (w * img.height) / img.width;
    g.drawImage(img, 1024 - w / 2, 220 - h / 2, w, h);
    tex.needsUpdate = true;
  });
  return tex;
}

/** Road surface: packed snow tyre tracks + dashed centre line. Repeats along U. */
export function roadTexture(aniso: number) {
  const [c, g] = canvas(512, 128);
  g.fillStyle = '#7f93a8';
  g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${Math.random() > 0.5 ? '255,255,255' : '20,30,45'},${Math.random() * 0.07})`;
    g.fillRect(Math.random() * 512, Math.random() * 128, 2 + Math.random() * 30, 1 + Math.random() * 2);
  }
  // darker tyre tracks
  g.fillStyle = 'rgba(25,38,55,.35)';
  for (const y of [18, 40, 86, 108]) g.fillRect(0, y - 5, 512, 10);
  g.fillStyle = 'rgba(255,196,90,.9)';
  g.fillRect(0, 62, 300, 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = aniso;
  return tex;
}

/* ---------------- Snowflake atlas: 4x2 cells of 256px ---------------- */

type Rnd = () => number;
function rng(seed: number): Rnd {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sixfold(g: CanvasRenderingContext2D, cx: number, cy: number, arm: (g: CanvasRenderingContext2D) => void) {
  for (let k = 0; k < 6; k++) {
    g.save();
    g.translate(cx, cy);
    g.rotate((k * Math.PI) / 3);
    arm(g);
    g.restore();
  }
}

function strokePass(g: CanvasRenderingContext2D, draw: () => void, width: number) {
  // translucent crystal: soft wide edge + crisp bright core
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(200,230,255,.35)';
  g.lineWidth = width * 2.4;
  g.shadowColor = 'rgba(190,230,255,.9)';
  g.shadowBlur = width * 2;
  draw();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,255,255,.95)';
  g.lineWidth = width;
  draw();
}

function dendrite(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, r: Rnd, fern = false) {
  const branches = fern ? 9 : 3 + Math.floor(r() * 3);
  const spec: { at: number; len: number; twig: boolean }[] = [];
  for (let i = 0; i < branches; i++) {
    const at = 0.22 + (i / branches) * 0.68 + r() * 0.04;
    const len = (fern ? 0.32 : 0.18 + r() * 0.28) * (1 - at * 0.55) * R;
    spec.push({ at, len, twig: !fern && r() > 0.35 });
  }
  const w = Math.max(2, R * 0.035);
  const arm = (gg: CanvasRenderingContext2D) => {
    gg.beginPath();
    gg.moveTo(0, 0);
    gg.lineTo(0, -R);
    for (const b of spec) {
      const y = -b.at * R;
      for (const s of [-1, 1]) {
        const ex = s * Math.sin(Math.PI / 3) * b.len;
        const ey = y - Math.cos(Math.PI / 3) * b.len;
        gg.moveTo(0, y);
        gg.lineTo(ex, ey);
        if (b.twig) {
          const tx = 0.55;
          const mx = ex * tx, my = y + (ey - y) * tx;
          gg.moveTo(mx, my);
          gg.lineTo(mx + s * b.len * 0.12, my - b.len * 0.32);
        }
      }
    }
    gg.stroke();
  };
  strokePass(g, () => sixfold(g, cx, cy, arm), w);
  // small central hexagon
  g.fillStyle = 'rgba(230,245,255,.55)';
  hexPath(g, cx, cy, R * 0.09);
  g.fill();
}

function hexPath(g: CanvasRenderingContext2D, cx: number, cy: number, R: number) {
  g.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + Math.PI / 6;
    const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
    if (k) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.closePath();
}

function plate(g: CanvasRenderingContext2D, cx: number, cy: number, R: number, sectored: boolean) {
  const grd = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  grd.addColorStop(0, 'rgba(220,240,255,.18)');
  grd.addColorStop(1, 'rgba(220,240,255,.42)');
  g.fillStyle = grd;
  hexPath(g, cx, cy, R);
  g.fill();
  const w = Math.max(2, R * 0.03);
  strokePass(g, () => {
    hexPath(g, cx, cy, R);
    g.stroke();
    hexPath(g, cx, cy, R * 0.62);
    g.stroke();
    if (sectored) {
      sixfold(g, cx, cy, (gg) => {
        gg.beginPath();
        gg.moveTo(0, 0);
        gg.lineTo(0, -R * 0.98);
        for (let i = 1; i < 5; i++) {
          const y = -R * (0.2 + i * 0.15);
          gg.moveTo(0, y);
          gg.lineTo(-R * 0.1, y + R * 0.08);
          gg.moveTo(0, y);
          gg.lineTo(R * 0.1, y + R * 0.08);
        }
        gg.stroke();
      });
    }
  }, w);
}

export function snowAtlas(aniso: number) {
  const [c, g] = canvas(1024, 512);
  g.clearRect(0, 0, 1024, 512);
  const cell = 256;
  const R = cell * 0.43;
  for (let i = 0; i < 8; i++) {
    const cx = (i % 4) * cell + cell / 2;
    const cy = Math.floor(i / 4) * cell + cell / 2;
    if (i < 5) dendrite(g, cx, cy, R, rng(17 + i * 101));
    else if (i === 5) plate(g, cx, cy, R * 0.78, false);
    else if (i === 6) plate(g, cx, cy, R * 0.85, true);
    else dendrite(g, cx, cy, R, rng(999), true);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = aniso;
  return tex;
}
