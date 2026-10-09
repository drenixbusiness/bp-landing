import * as THREE from 'three';
import { eqVec, GC_EQ, NGP_EQ } from './sky';

/** [name, RA (h), Dec (deg), V mag, B-V] — bright, recognisable northern stars at true J2000 positions. */
const CATALOG: [string, number, number, number, number][] = [
  ['Polaris', 2.5303, 89.264, 1.98, 0.6],
  ['Kochab', 14.8451, 74.155, 2.08, 1.47],
  ['Pherkad', 15.3455, 71.834, 3.05, 0.05],
  ['Yildun', 17.5369, 86.586, 4.36, 0.02],
  ['eps UMi', 16.7662, 82.037, 4.21, 0.89],
  ['zet UMi', 15.7343, 77.795, 4.32, 0.04],
  ['eta UMi', 16.2918, 75.755, 4.95, 0.37],
  ['Dubhe', 11.0621, 61.751, 1.79, 1.07],
  ['Merak', 11.0307, 56.382, 2.37, -0.02],
  ['Phecda', 11.8972, 53.695, 2.44, 0.04],
  ['Megrez', 12.2571, 57.033, 3.31, 0.08],
  ['Alioth', 12.9005, 55.96, 1.77, -0.02],
  ['Mizar', 13.3988, 54.925, 2.27, 0.02],
  ['Alcor', 13.4204, 54.988, 4.01, 0.17],
  ['Alkaid', 13.7923, 49.313, 1.86, -0.19],
  ['Schedar', 0.6751, 56.537, 2.24, 1.17],
  ['Caph', 0.1529, 59.15, 2.28, 0.34],
  ['gam Cas', 0.9451, 60.717, 2.15, -0.15],
  ['Ruchbah', 1.4302, 60.235, 2.68, 0.13],
  ['Segin', 1.9066, 63.67, 3.35, -0.15],
  ['Alderamin', 21.3097, 62.585, 2.45, 0.22],
  ['Alfirk', 21.4777, 70.561, 3.23, -0.22],
  ['Errai', 23.6558, 77.632, 3.21, 1.03],
  ['zet Cep', 22.1809, 58.201, 3.35, 1.57],
  ['iot Cep', 22.828, 66.201, 3.52, 1.05],
  ['del Cep', 22.4862, 58.415, 4.07, 0.6],
  ['Eltanin', 17.9434, 51.489, 2.24, 1.52],
  ['Rastaban', 17.5072, 52.301, 2.79, 0.98],
  ['Thuban', 14.0731, 64.376, 3.65, -0.05],
  ['eta Dra', 16.3999, 61.514, 2.74, 0.91],
  ['iot Dra', 15.4155, 58.966, 3.29, 1.16],
  ['Altais', 19.2093, 67.661, 3.07, 1.0],
  ['zet Dra', 17.1465, 65.715, 3.17, -0.12],
  ['Giausar', 11.5233, 69.331, 3.84, 1.62],
  ['kap Dra', 12.5581, 69.788, 3.87, -0.13],
  ['chi Dra', 18.3509, 72.733, 3.57, 0.49],
  ['Grumium', 17.8921, 56.873, 3.75, 1.18],
  ['Capella', 5.2782, 45.998, 0.08, 0.8],
  ['Vega', 18.6156, 38.784, 0.03, 0.0],
  ['Deneb', 20.6905, 45.28, 1.25, 0.09],
  ['Arcturus', 14.261, 19.182, -0.05, 1.23],
  ['Mirfak', 3.4054, 49.861, 1.79, 0.48],
  ['Algol', 3.1361, 40.956, 2.12, -0.05],
  ['Aldebaran', 4.5987, 16.509, 0.87, 1.54],
  ['Betelgeuse', 5.9195, 7.407, 0.45, 1.85],
  ['Rigel', 5.2423, -8.202, 0.13, -0.03],
  ['Bellatrix', 5.4189, 6.35, 1.64, -0.22],
  ['Mintaka', 5.5334, -0.299, 2.23, -0.22],
  ['Alnilam', 5.6036, -1.202, 1.69, -0.18],
  ['Alnitak', 5.6793, -1.943, 1.77, -0.21],
  ['Saiph', 5.7959, -9.67, 2.09, -0.17],
  ['Meissa', 5.5856, 9.934, 3.39, -0.16],
  ['Sirius', 6.7525, -16.716, -1.46, 0.0],
  ['Procyon', 7.655, 5.225, 0.34, 0.42],
  ['Castor', 7.5767, 31.888, 1.58, 0.03],
  ['Pollux', 7.7553, 28.026, 1.14, 1.0],
  ['Regulus', 10.1395, 11.967, 1.35, -0.11],
  ['Altair', 19.8464, 8.868, 0.76, 0.22],
  ['Spica', 13.4199, -11.161, 0.97, -0.23],
  ['Alcyone', 3.7914, 24.105, 2.87, -0.09],
  ['Atlas', 3.8193, 24.053, 3.62, -0.08],
  ['Electra', 3.7479, 24.113, 3.7, -0.11],
  ['Maia', 3.7638, 24.368, 3.87, -0.07],
  ['Merope', 3.7721, 23.948, 4.18, -0.06],
  ['Taygeta', 3.7535, 24.467, 4.3, -0.11],
  ['Pleione', 3.8197, 24.137, 5.05, -0.08],
];

export const POLARIS_EQ = eqVec(CATALOG[0][1], CATALOG[0][2]);

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

function randomBV() {
  // main-sequence heavy distribution, a few blue giants and red giants
  const u = Math.random();
  if (u < 0.12) return -0.25 + Math.random() * 0.3;
  if (u < 0.85) return 0.1 + Math.random() * 1.0;
  return 1.1 + Math.random() * 0.7;
}

export function createStars(count: number, dpr: number) {
  const N = count + CATALOG.length;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const size = new Float32Array(N);
  const phase = new Float32Array(N);

  const gc = GC_EQ.clone(), ngp = NGP_EQ.clone();
  const gc2 = new THREE.Vector3().crossVectors(ngp, gc);
  const v = new THREE.Vector3();
  const R = 1000;
  const put = (i: number, dir: THREE.Vector3, mag: number, bv: number) => {
    pos.set([dir.x * R, dir.y * R, dir.z * R], i * 3);
    const flux = Math.pow(10, -0.4 * (mag - 6));
    const [r, g, b] = bvToRgb(bv);
    const lum = Math.min(1.7, 0.12 + Math.pow(flux, 0.55) * 0.42);
    col.set([r * lum, g * lum, b * lum], i * 3);
    size[i] = 1.5 + Math.pow(flux, 0.3) * 0.9;
    phase[i] = Math.random() * 100;
  };

  for (let i = 0; i < count; i++) {
    let mag = 7.4 + Math.log10(Math.max(Math.random(), 1e-5)) / 0.48;
    mag = Math.max(mag, 1.2);
    if (mag > 5 && Math.random() < 0.45) {
      // concentrate faint stars along the galactic plane
      const l = Math.random() * Math.PI * 2;
      const gauss = (Math.random() + Math.random() + Math.random() - 1.5) * 0.16;
      v.copy(gc).multiplyScalar(Math.cos(gauss) * Math.cos(l)).addScaledVector(gc2, Math.cos(gauss) * Math.sin(l)).addScaledVector(ngp, Math.sin(gauss));
    } else {
      const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
      v.set(r * Math.cos(a), r * Math.sin(a), z);
    }
    put(i, v.normalize(), mag, randomBV());
  }
  CATALOG.forEach(([, ra, dec, mag, bv], j) => put(count + j, eqVec(ra, dec), mag, bv));

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R * 1.1);

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
  return { points, uniforms };
}

/** Polaris: warm glow sprite + small mono label. */
export function createPolarisMarker(glow: THREE.Texture) {
  const group = new THREE.Group();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xffe6b8, transparent: true, opacity: 0.55, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  sprite.scale.setScalar(26);
  sprite.renderOrder = -8;
  group.add(sprite);

  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.font = '500 26px "JetBrains Mono", ui-monospace, monospace';
  g.fillStyle = 'rgba(234,246,255,.82)';
  g.textBaseline = 'middle';
  g.fillText('POLARIS  α UMi', 8, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, fog: false }));
  label.center.set(-0.08, 0.5);
  label.scale.set(104, 13, 1);
  label.renderOrder = -7;
  group.add(label);
  return { group, sprite, label, labelTex: tex };
}
