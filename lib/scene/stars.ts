import * as THREE from 'three';
import { eqVec } from './sky';

/** Polaris (α UMi), J2000: RA 2h 31m 49s, Dec +89° 15′ 51″. */
const POLARIS = { ra: 2.5303, dec: 89.264 };

/** Real sky: Hipparcos stars down to V ≈ 6 (naked-eye limit), packed by scripts/make-stars.mjs into public/assets/stars.bin. */
export const STARS_URL = '/assets/stars.bin?v=1';

export const POLARIS_EQ = eqVec(POLARIS.ra, POLARIS.dec);

/** B-V → effective temperature (Ballesteros 2012) → linear RGB (Tanner Helland fit), desaturated. */
function bvToRgb(bv: number): [number, number, number] {
  const t = 4600 * (1 / (0.92 * bv + 1.7) + 1 / (0.92 * bv + 0.62));
  const k = t / 100;
  let r: number, g: number, b: number;
  if (k <= 66) {
    r = 255;
    g = 99.47 * Math.log(k) - 161.12;
  } else {
    r = 329.7 * Math.pow(k - 60, -0.1332);
    g = 288.12 * Math.pow(k - 60, -0.0755);
  }
  if (k >= 66) b = 255;
  else if (k <= 19) b = 0;
  else b = 138.52 * Math.log(k - 10) - 305.04;
  const c = [r, g, b].map((v) => Math.min(255, Math.max(0, v)) / 255);
  const l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  return c.map((v) => v + (l - v) * 0.45).map((v) => v / Math.max(l, 0.35) * 0.8) as [number, number, number];
}

/**
 * The real night sky from the catalog (positions, magnitudes and colours), brightest first;
 * `maxMag` trims the faint end on weak devices. Polaris is drawn separately by createPolarisMarker
 * so it is the one star that clearly stands out.
 */
export function createStars(maxMag: number, dpr: number) {
  const R = 1000;
  const geo = new THREE.BufferGeometry();
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 1.1);
  const fill = (raw: ArrayBuffer) => {
    const q = new Uint16Array(raw);
    let N = q.length / 4;
    for (let i = 0; i < N; i++) if (q[i * 4 + 2] / 1000 - 2 > maxMag) N = i; // sorted bright → faint
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const size = new Float32Array(N);
    const phase = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const ra = (q[i * 4] / 65535) * 24;
      const dec = (q[i * 4 + 1] / 65535) * 180 - 90;
      const mag = q[i * 4 + 2] / 1000 - 2;
      const bv = q[i * 4 + 3] / 10000 - 0.5;
      const dir = eqVec(ra, dec);
      pos.set([dir.x * R, dir.y * R, dir.z * R], i * 3);
      // compressed flux: the brightest stars (Sirius, Vega…) stay below Polaris' marker
      const flux = Math.pow(10, -0.4 * (Math.max(mag, 0.5) - 6));
      const [r, g, b] = bvToRgb(bv);
      const lum = Math.min(1.25, 0.3 + Math.pow(flux, 0.42) * 0.22);
      col.set([r * lum, g * lum, b * lum], i * 3);
      size[i] = 1.35 + Math.min(Math.pow(flux, 0.28), 4.5) * 0.55;
      phase[i] = Math.random() * 100;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  };
  // empty until the catalog arrives (≈40 KB)
  for (const [k, n] of [['position', 3], ['color', 3], ['aSize', 1], ['aPhase', 1]] as const) geo.setAttribute(k, new THREE.BufferAttribute(new Float32Array(0), n));
  const ready = fetch(STARS_URL)
    .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
    .then(fill)
    .catch(() => {});

  const uniforms = { uTime: { value: 0 }, uDpr: { value: dpr }, uVis: { value: 1 } };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aPhase; attribute vec3 color;
      uniform float uTime, uDpr, uVis;
      varying vec3 vCol; varying float vA;
      void main(){
        vec3 wd = normalize(mat3(modelMatrix) * position);
        float alt = asin(clamp(wd.y, -1., 1.));
        float horizon = 1. - smoothstep(0., .5, alt);
        float tw = 1. + (.06 + .42*horizon) * sin(uTime*(2.3 + fract(aPhase)*4.1) + aPhase) * sin(uTime*1.3 + aPhase*.7);
        vA = smoothstep(.0, .157, alt) * uVis * tw; // fade below ~9°
        vCol = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * 2.2 * uDpr;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vA;
      void main(){
        vec2 p = gl_PointCoord - .5;
        float r2 = dot(p,p) * 4.;
        float core = exp(-r2 * 9.);
        float halo = exp(-r2 * 2.2) * .18;
        float a = (core + halo) * vA;
        if(a < .003) discard;
        gl_FragColor = vec4(vCol * a, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const points = new THREE.Points(geo, mat);
  points.matrixAutoUpdate = false;
  points.frustumCulled = false;
  points.renderOrder = -9;
  return { points, uniforms, ready };
}

/** Four thin diffraction rays (one long cross + a fainter diagonal one), white on transparent. */
function raysTexture() {
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  g.translate(S / 2, S / 2);
  const ray = (len: number, w: number, a: number) => {
    const grd = g.createLinearGradient(0, 0, len, 0);
    grd.addColorStop(0, `rgba(255,255,255,${a})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(0, -w);
    g.lineTo(len, 0);
    g.lineTo(0, w);
    g.closePath();
    g.fill();
  };
  for (let k = 0; k < 4; k++) {
    g.save();
    g.rotate((k * Math.PI) / 2);
    ray(S / 2, 2.2, 0.95);
    g.rotate(Math.PI / 4);
    ray(S / 4, 1.2, 0.35);
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Polaris — the one star that stands out: a bright white-gold core, a warm halo and slow
 * diffraction rays (all other stars are capped below it).
 */
export function createPolarisMarker(glow: THREE.Texture) {
  const group = new THREE.Group();
  const mat = (map: THREE.Texture, color: THREE.ColorRepresentation, opacity: number) =>
    new THREE.SpriteMaterial({ map, color, transparent: true, opacity, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
  const sprite = new THREE.Sprite(mat(glow, 0xffdca0, 0.7)); // halo
  sprite.scale.setScalar(46);
  sprite.renderOrder = -8;
  const core = new THREE.Sprite(mat(glow, 0xfff6e4, 1));
  core.scale.setScalar(10);
  core.renderOrder = -8;
  const raysTex = raysTexture();
  const rays = new THREE.Sprite(mat(raysTex, 0xfff0d2, 0.8));
  rays.scale.setScalar(96);
  rays.renderOrder = -8;
  group.add(sprite, rays, core);

  return { group, sprite, core, rays, raysTex };
}
