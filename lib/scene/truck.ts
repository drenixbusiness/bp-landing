import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { iceMaterial, noise3 } from './ice';
import { roadTexture, trailerTexture } from './textures';
import { disposeObject } from './gltf';

export const ROAD_Y = 2.4;
export const SHELF_Z = -52;
export const LANES = [SHELF_Z + 1.9, SHELF_Z - 1.9]; // lane 0 drives +x, lane 1 drives -x
const TRAILER_LEN = 16.15;
const PROC_TRAILER_X = -6.95; // trailer front behind the procedural cab

/** A loaded tractor model normalised to: front bumper at x = 0, facing +x, wheels on y = 0, centred on z. */
export interface TractorModel {
  object: THREE.Object3D;
  /** Where the trailer's front face should sit (negative x). */
  trailerX: number;
  /** Headlight lens position (z is mirrored for the other side). */
  lamps: THREE.Vector3;
  /** The model has emissive lenses of its own, so only the soft halo is added. */
  ownLenses: boolean;
  /** Front indicator position on the outer edge of the headlight unit (z mirrored). */
  indicator: THREE.Vector3;
}

/** Normalise a glTF tractor (any forward axis along its longest horizontal extent) to the rig convention. */
export function normaliseTractor(src: THREE.Object3D, frontIsPositive: boolean, length = 7.6): TractorModel {
  const holder = new THREE.Group();
  const pivot = new THREE.Group();
  pivot.add(src);
  holder.add(pivot);
  src.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(src);
  const size = box.getSize(new THREE.Vector3());
  // longest horizontal axis → x
  if (size.z > size.x) pivot.rotation.y = frontIsPositive ? Math.PI / 2 : -Math.PI / 2;
  else if (!frontIsPositive) pivot.rotation.y = Math.PI;
  pivot.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(pivot);
  const len = box.max.x - box.min.x;
  const s = length / len;
  pivot.scale.setScalar(s);
  pivot.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(pivot);
  pivot.position.set(-box.max.x, -box.min.y, -(box.max.z + box.min.z) / 2);
  // fifth wheel sits ~80% back; trailer nose overhangs slightly ahead of it
  // the model's own headlight lenses (material "headlight_lens") glow; find them to anchor the halos
  holder.updateMatrixWorld(true);
  const lensBox = new THREE.Box3();
  holder.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && (Array.isArray(m.material) ? m.material : [m.material]).some((x) => x.name === 'headlight_lens')) lensBox.expandByObject(m);
  });
  const lamps = lensBox.isEmpty()
    ? new THREE.Vector3(-0.12, 1.18, 0.98)
    : new THREE.Vector3(lensBox.max.x + 0.02, (lensBox.min.y + lensBox.max.y) / 2, Math.max(0.3, lensBox.max.z - 0.22));
  const indicator = lensBox.isEmpty()
    ? new THREE.Vector3(-0.3, 1.15, 1.2)
    : new THREE.Vector3(lensBox.min.x + 0.12, (lensBox.min.y + lensBox.max.y) / 2, lensBox.max.z + 0.01);
  return { object: holder, trailerX: -length * 0.86, lamps, ownLenses: !lensBox.isEmpty(), indicator };
}

function box(w: number, h: number, d: number, x: number, y: number, z: number) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
}
function cyl(r: number, len: number, x: number, y: number, z: number, axis: 'x' | 'y' | 'z', seg = 14) {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === 'x') g.rotateZ(Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}
const merge = (gs: THREE.BufferGeometry[]) => {
  // strip to position/normal/uv so merge never fails on mismatched attributes
  const clean = gs.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    return n;
  });
  const m = mergeGeometries(clean, false)!;
  clean.forEach((g) => g.dispose());
  gs.forEach((g) => g.dispose());
  return m;
};

/** Shared geometry + materials for a Cascadia-style sleeper tractor with a 53' dry van. Faces +x. */
function buildTruckKit(aniso: number) {
  // cab silhouette (side profile, XY), extruded across the width
  const s = new THREE.Shape();
  s.moveTo(0.05, 0.55);
  s.lineTo(0.05, 1.35);
  s.quadraticCurveTo(0.0, 1.62, -0.35, 1.7);
  s.lineTo(-1.95, 1.98);
  s.lineTo(-2.25, 2.1);
  s.lineTo(-2.95, 3.02);
  s.quadraticCurveTo(-3.1, 3.12, -3.4, 3.12);
  s.lineTo(-3.9, 3.14);
  s.quadraticCurveTo(-4.4, 3.95, -4.8, 3.98);
  s.lineTo(-6.55, 3.98);
  s.lineTo(-6.6, 1.15);
  s.lineTo(-1.95, 1.15);
  s.lineTo(-0.62, 1.12);
  s.lineTo(-0.5, 0.55);
  s.closePath();
  const cab = new THREE.ExtrudeGeometry(s, { depth: 2.36, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2, curveSegments: 6 });
  cab.translate(0, 0, -1.18);

  const paint = merge([
    cab,
    box(3.6, 0.32, 0.1, -4.4, 0.85, 1.22), // side skirts
    box(3.6, 0.32, 0.1, -4.4, 0.85, -1.22),
  ]);

  const glass = merge([
    (() => {
      const g = new THREE.PlaneGeometry(2.2, 1.12);
      g.rotateY(Math.PI / 2);
      g.rotateZ(Math.atan2(0.7, 0.92));
      g.translate(-2.57, 2.58, 0);
      return g;
    })(),
    box(0.85, 0.6, 0.02, -3.25, 2.5, 1.27),
    box(0.85, 0.6, 0.02, -3.25, 2.5, -1.27),
  ]);

  const chrome = merge([
    box(0.08, 0.85, 1.2, 0.08, 1.2, 0), // grille
    box(0.25, 0.32, 2.5, 0.1, 0.55, 0), // bumper
    cyl(0.33, 1.3, -3.4, 0.82, 1.08, 'x'), // fuel tanks
    cyl(0.33, 1.3, -3.4, 0.82, -1.08, 'x'),
    cyl(0.085, 3.2, -6.75, 2.75, 1.05, 'y', 10), // exhaust stacks
    cyl(0.085, 3.2, -6.75, 2.75, -1.05, 'y', 10),
    box(0.06, 0.5, 0.05, -2.3, 2.55, 1.3), // mirrors
    box(0.06, 0.5, 0.05, -2.3, 2.55, -1.3),
  ]);

  // trailer geometry is authored with its front at x = 0; the rig places it behind the tractor
  const axle = (out: THREE.BufferGeometry[], x: number, dual: boolean) => {
    for (const side of [1, -1]) out.push(cyl(0.52, dual ? 0.58 : 0.32, x, 0.52, side * (dual ? 0.92 : 1.06), 'z', 18));
  };
  const wt: THREE.BufferGeometry[] = [];
  axle(wt, -1.25, false);
  axle(wt, -7.05, true);
  axle(wt, -8.3, true);
  const wheels = merge(wt);
  const wr: THREE.BufferGeometry[] = [];
  axle(wr, -TRAILER_LEN + 2.4, true);
  axle(wr, -TRAILER_LEN + 1.15, true);
  const trailerWheels = merge(wr);

  const frame = merge([
    box(8.7, 0.3, 1.0, -4.4, 0.95, 0),
    box(1.6, 0.12, 2.2, -7.6, 1.15, 0), // fifth wheel
  ]);
  const trailerFrame = merge([
    box(0.2, 1.0, 0.2, -3.2, 0.7, 0.9), // landing gear
    box(0.2, 1.0, 0.2, -3.2, 0.7, -0.9),
    box(3.0, 0.4, 2.3, -TRAILER_LEN + 1.8, 1.05, 0), // bogie
    box(0.15, 0.6, 2.4, -TRAILER_LEN + 0.1, 0.9, 0), // ICC bumper
  ]);

  const trailer = new THREE.BoxGeometry(TRAILER_LEN, 2.9, 2.6);
  trailer.translate(-TRAILER_LEN / 2, 1.2 + 1.45, 0);

  const paintMat = new THREE.MeshPhysicalMaterial({ color: '#1d5fb8', metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#0b1724', metalness: 0.9, roughness: 0.08, emissive: '#0a1a28', emissiveIntensity: 0.4, side: THREE.DoubleSide });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#d9e3ee', metalness: 1, roughness: 0.2 });
  const tyreMat = new THREE.MeshStandardMaterial({ color: '#111418', roughness: 0.85 });
  const frameMat = new THREE.MeshStandardMaterial({ color: '#1b2128', roughness: 0.7, metalness: 0.4 });
  const ttex = trailerTexture(aniso);
  const trailerSide = new THREE.MeshStandardMaterial({ map: ttex, roughness: 0.45, metalness: 0.15 });
  const trailerPlain = new THREE.MeshStandardMaterial({ color: '#e8eef5', roughness: 0.5, metalness: 0.15 });
  const trailerMats = [trailerPlain, trailerPlain, trailerPlain, trailerPlain, trailerSide, trailerSide];

  const geos = [paint, glass, chrome, wheels, frame, trailer, trailerWheels, trailerFrame];
  const mats = [paintMat, glassMat, chromeMat, tyreMat, frameMat, trailerSide, trailerPlain, ttex];
  return {
    make() {
      const tractor = new THREE.Group();
      tractor.add(new THREE.Mesh(paint, paintMat), new THREE.Mesh(glass, glassMat), new THREE.Mesh(chrome, chromeMat), new THREE.Mesh(wheels, tyreMat), new THREE.Mesh(frame, frameMat));
      const trailerG = new THREE.Group();
      trailerG.position.x = PROC_TRAILER_X;
      trailerG.add(new THREE.Mesh(trailer, trailerMats), new THREE.Mesh(trailerWheels, tyreMat), new THREE.Mesh(trailerFrame, frameMat));
      return { tractor, trailer: trailerG };
    },
    dispose() {
      geos.forEach((x) => x.dispose());
      mats.forEach((x) => x.dispose());
    },
  };
}

/**
 * Headlight light on the asphalt: two soft beams that start at the bumper and widen
 * forward (≈12° spread), fading with distance. Drawn once into a small canvas.
 * U runs forward (0 → 1 = 0 → 24 m), V across the road (0 → 1 = 4 m left → 4 m right).
 */
function headlightPoolTexture() {
  const W = 256, H = 128;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const img = g.createImageData(W, H);
  const LEN = 24, HALF_W = 4, LAMP = 0.95, SPREAD = Math.tan(0.21);
  for (let j = 0; j < H; j++) {
    const z = (j / (H - 1) - 0.5) * 2 * HALF_W;
    for (let i = 0; i < W; i++) {
      const x = (i / (W - 1)) * LEN;
      // near the bumper the pool is faint (lamps aim down the road), peaks a few metres out, then falls off
      const along = Math.min(1, x / 3.5) ** 1.5 * Math.exp(-Math.max(0, x - 3.5) / 9);
      let v = 0;
      for (const side of [-1, 1]) {
        const width = 0.35 + x * SPREAD;
        const d = (z - side * LAMP) / width;
        v += Math.exp(-d * d * 1.6);
      }
      const a = Math.min(1, along * v * 0.85);
      const k = (j * W + i) * 4;
      img.data[k] = 255;
      img.data[k + 1] = 236;
      img.data[k + 2] = 200;
      img.data[k + 3] = Math.round(a * 255);
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Give one rig's headlight its indicator section: the outer wrap-around end of the
 * "headlight_lens" turns amber and flashes with uHazard. The material is cloned so only
 * that rig flashes. The zone is defined in the tractor's normalised space (front +x, lateral z).
 */
function makeIndicatorLens(root: THREE.Object3D, model: TractorModel) {
  const uniforms = { uHazard: { value: 0 }, uToLocal: { value: new THREE.Matrix4() } };
  const zOuter = model.indicator.z - 0.01; // outer edge of the lens
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    if (!mats.some((x) => x.name === 'headlight_lens')) return;
    const mat = (mats[0] as THREE.MeshStandardMaterial).clone();
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms, { uZ0: { value: zOuter - 0.24 }, uZ1: { value: zOuter - 0.13 } });
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vHzWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvHzWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vHzWorld;\nuniform float uHazard, uZ0, uZ1;\nuniform mat4 uToLocal;')
        .replace(
          '#include <emissivemap_fragment>',
          [
            '#include <emissivemap_fragment>',
            'vec3 hzLocal = (uToLocal * vec4(vHzWorld, 1.0)).xyz;',
            'float hzZone = smoothstep(uZ0, uZ1, abs(hzLocal.z));',
            '// indicator section: dim amber glass when idle, bright amber while flashing',
            'totalEmissiveRadiance = mix(totalEmissiveRadiance, mix(vec3(0.22, 0.11, 0.02), vec3(3.4, 1.6, 0.18), uHazard), hzZone);',
            'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.55, 0.1), hzZone);',
          ].join('\n'),
        );
    };
    mat.customProgramCacheKey = () => 'indicator-lens';
    m.material = mat;
  });
  return { uniforms, holder: root };
}

export interface Traffic {
  group: THREE.Group;
  hero: THREE.Group;
  /** Swap the procedural cab for a loaded tractor on the hero rig, the traffic, or all rigs. */
  useModel(model: TractorModel, which: 'hero' | 'traffic' | 'all'): void;
  /** QA readout of the hazard flasher state */
  hazardDebug(): Record<string, number>;
  update(t: number, dt: number, heroX: number): void;
  dispose(): void;
}

export function createHighway(physical: boolean, aniso: number, glow: THREE.Texture, count: number): Traffic {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];

  // ice shelf with a jagged sea-facing cliff
  const L = 900;
  const shelfGeo = new THREE.BoxGeometry(L, 9, 18, 180, 3, 2);
  const p = shelfGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    if (y < 4.4) {
      const n = noise3(x * 0.08, y * 0.3, z * 0.2, 5) - 0.5;
      p.setZ(i, z + (z > 0 ? n * 3.2 : n * 2));
      p.setX(i, x + (noise3(x * 0.2, y, 3, 8) - 0.5) * 2.2);
    }
  }
  shelfGeo.computeVertexNormals();
  const shelfMat = iceMaterial(physical);
  const shelf = new THREE.Mesh(shelfGeo, shelfMat);
  shelf.position.set(0, ROAD_Y - 4.5, SHELF_Z);
  group.add(shelf);
  disposables.push(shelfGeo, shelfMat);

  // road + snow verges
  const rtex = roadTexture(aniso);
  rtex.repeat.set(L / 14, 1);
  const roadGeo = new THREE.PlaneGeometry(L, 8.6);
  roadGeo.rotateX(-Math.PI / 2);
  const roadMat = new THREE.MeshStandardMaterial({ map: rtex, roughness: 0.6, metalness: 0.05, color: '#62758c' }); // packed-snow asphalt, dark enough at night for headlights to read
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.position.set(0, ROAD_Y + 0.02, SHELF_Z);
  group.add(road);
  const vergeMat = new THREE.MeshStandardMaterial({ color: '#eef7ff', roughness: 0.9, emissive: '#10263c', emissiveIntensity: 0.3 });
  const vergeGeo = new THREE.BoxGeometry(L, 0.35, 1.2);
  for (const z of [SHELF_Z + 5.0, SHELF_Z - 5.0]) {
    const v = new THREE.Mesh(vergeGeo, vergeMat);
    v.position.set(0, ROAD_Y + 0.1, z);
    group.add(v);
  }
  disposables.push(rtex, roadGeo, roadMat, vergeMat, vergeGeo);

  // amber marker poles
  const spacing = 22;
  const nPoles = Math.floor(L / spacing) * 2;
  const poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6);
  poleGeo.translate(0, 0.65, 0);
  const poleMat = new THREE.MeshStandardMaterial({ color: '#2b2f36', roughness: 0.6 });
  const poles = new THREE.InstancedMesh(poleGeo, poleMat, nPoles);
  const tipPos = new Float32Array(nPoles * 3);
  const m = new THREE.Matrix4();
  for (let i = 0; i < nPoles; i++) {
    const x = -L / 2 + (i >> 1) * spacing + 6;
    const z = i & 1 ? SHELF_Z - 4.7 : SHELF_Z + 4.7;
    poles.setMatrixAt(i, m.makeTranslation(x, ROAD_Y, z));
    tipPos.set([x, ROAD_Y + 1.32, z], i * 3);
  }
  group.add(poles);
  const tipGeo = new THREE.BufferGeometry();
  tipGeo.setAttribute('position', new THREE.BufferAttribute(tipPos, 3));
  const tipMat = new THREE.PointsMaterial({ map: glow, color: '#ffae3a', size: 1.1, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  group.add(new THREE.Points(tipGeo, tipMat));
  disposables.push(poleGeo, poleMat, tipGeo, tipMat);

  // trucks
  const kit = buildTruckKit(aniso);
  disposables.push(kit);
  // headlights: the lamp itself glows (bright lens + a tight halo), no beams or road glare
  const lensGeo = new THREE.PlaneGeometry(0.34, 0.16);
  lensGeo.rotateY(Math.PI / 2); // face +x
  const lensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.3), toneMapped: false, side: THREE.DoubleSide });
  const haloMat = new THREE.SpriteMaterial({ map: glow, color: '#fff1d6', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.45 });
  const poolTex = headlightPoolTexture();
  const poolGeo = new THREE.PlaneGeometry(24, 8);
  poolGeo.rotateX(-Math.PI / 2);
  poolGeo.translate(12 + 0.2, 0, 0); // starts at the bumper, reaches 24 m ahead
  const poolMat = new THREE.MeshBasicMaterial({
    map: poolTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.8,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  disposables.push(lensGeo, lensMat, haloMat, poolTex, poolGeo, poolMat);

  // trailer lamps: round lenses mounted flush in the panels (nothing sticks out of the bodywork)
  const tailLensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 0.08, 0.05), toneMapped: false });
  const amberOffMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.17, 0.04), toneMapped: false });
  const amberLensMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.17, 0.04), toneMapped: false }); // hero, flashes
  const bezelMat = new THREE.MeshStandardMaterial({ color: '#1a1d22', roughness: 0.5, metalness: 0.6 });
  const lensDisk = new THREE.CircleGeometry(0.075, 20);
  const bezelDisk = new THREE.RingGeometry(0.075, 0.095, 20);
  const markerDisk = new THREE.CircleGeometry(0.035, 14);
  disposables.push(tailLensMat, amberOffMat, amberLensMat, bezelMat, lensDisk, bezelDisk, markerDisk);
  /** a lens disk lying flat on a panel, facing `normal` */
  const flushLamp = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, normal: THREE.Vector3, bezel = true) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); // CircleGeometry faces +z
    g.add(new THREE.Mesh(geo, mat));
    if (bezel) g.add(new THREE.Mesh(bezelDisk, bezelMat));
    return g;
  };
  const BACK = new THREE.Vector3(-1, 0, 0);
  const PROC_LAMPS = new THREE.Vector3(0.07, 1.12, 0.9);

  const models = new Set<THREE.Object3D>();
  let parkedFor = 0;
  let heroLens: ReturnType<typeof makeIndicatorLens> | null = null;
  type Rig = { obj: THREE.Group; lane: number; x: number; speed: number; v?: number; tractor: THREE.Group; trailer: THREE.Group; lamps: THREE.Object3D[]; indicators: THREE.Object3D[]; model?: THREE.Object3D };
  const rigs: Rig[] = [];
  for (let i = 0; i < count; i++) {
    const obj = new THREE.Group();
    const parts = kit.make();
    obj.add(parts.tractor, parts.trailer);
    const lamps: THREE.Object3D[] = [];
    for (const side of [1, -1]) {
      const lamp = new THREE.Group();
      lamp.position.set(PROC_LAMPS.x, PROC_LAMPS.y, PROC_LAMPS.z * side);
      lamp.add(new THREE.Mesh(lensGeo, lensMat));
      const halo = new THREE.Sprite(haloMat);
      halo.position.x = 0.04;
      halo.scale.setScalar(0.55);
      lamp.add(halo);
      obj.add(lamp);
      lamps.push(lamp);
      // rear cluster on the trailer's back panel: red tail + amber turn, flush with the doors
      const rear = -TRAILER_LEN - 0.006;
      const turnMat = i === 0 ? amberLensMat : amberOffMat;
      parts.trailer.add(flushLamp(lensDisk, tailLensMat, rear, 1.36, side * 1.08, BACK));
      parts.trailer.add(flushLamp(lensDisk, turnMat, rear, 1.36, side * 0.86, BACK));
      // amber side marker on the lower rail, flush with the side panel
      parts.trailer.add(flushLamp(markerDisk, turnMat, -TRAILER_LEN * 0.5, 1.32, side * 1.306, new THREE.Vector3(0, 0, side), false));
    }
    // hero owns the +x lane (scroll-driven); traffic flows the other way
    const indicators: THREE.Object3D[] = [];
    if (i === 0) {
      // procedural cab only: amber disks flush on the front corners (the GLB flashes part of its own lamp)
      for (const side of [1, -1]) {
        const front = flushLamp(markerDisk, amberLensMat, 0.075, 1.12, 1.12 * side, new THREE.Vector3(1, 0, 0.6 * side).normalize(), false);
        obj.add(front);
        indicators.push(front);
      }
    }
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.y = 0.05; // just above the road surface (rig origin sits on the road)
    pool.renderOrder = 2;
    obj.add(pool);
    const lane = i === 0 ? 0 : 1;
    const rig: Rig = { obj, lane, x: -300 + Math.random() * 600, speed: 14 + Math.random() * 8, tractor: parts.tractor, trailer: parts.trailer, lamps, indicators };
    obj.position.set(rig.x, ROAD_Y, LANES[lane]);
    obj.rotation.y = lane === 0 ? 0 : Math.PI;
    group.add(obj);
    rigs.push(rig);
  }
  // keep non-hero trucks from overlapping
  rigs.slice(1).forEach((r, i) => (r.x = -280 + ((i * 560) / Math.max(1, rigs.length - 1)) + Math.random() * 30));

  return {
    group,
    hero: rigs[0].obj,
    hazardDebug: () => {
      const p = rigs[0].indicators[0]?.getWorldPosition(new THREE.Vector3());
      return { hazardOpacity: +(heroLens ? heroLens.uniforms.uHazard.value : 0).toFixed(2), parkedFor: +parkedFor.toFixed(2), indX: +(p?.x ?? 0).toFixed(2), indY: +(p?.y ?? 0).toFixed(2), indZ: +(p?.z ?? 0).toFixed(2), heroX: +rigs[0].x.toFixed(2) };
    },
    useModel(model, which) {
      models.add(model.object);
      rigs.forEach((r, i) => {
        if (which === 'hero' && i !== 0) return;
        if (which === 'traffic' && i === 0) return;
        if (r.model) r.obj.remove(r.model);
        r.model = i === 0 && which !== 'traffic' ? model.object : model.object.clone();
        r.obj.add(r.model);
        r.tractor.visible = false;
        r.trailer.position.x = model.trailerX;
        r.indicators.forEach((l) => (l.visible = !model.ownLenses));
        if (i === 0 && which !== 'traffic' && model.ownLenses && r.model) heroLens = makeIndicatorLens(r.model, model);
        r.lamps.forEach((l, k) => {
          l.position.set(model.lamps.x, model.lamps.y, model.lamps.z * (k === 0 ? 1 : -1));
          // the model's own lenses glow; the procedural plate and halo would float off the bodywork
          l.visible = !model.ownLenses;
        });
      });
    },
    update(t, dt, heroX) {
      // hero is "parked" when the page isn't being scrolled: hazards flash (~75 per minute)
      const hero = rigs[0];
      const v = Math.abs(heroX - hero.x) / Math.max(dt, 1e-3);
      parkedFor = v < 0.4 ? parkedFor + dt : 0;
      const parked = Math.min(1, Math.max(0, (parkedFor - 0.6) / 0.3));
      const ph = (t % 0.8) / 0.8;
      const on = ph < 0.5 ? Math.min(1, ph / 0.04) : Math.max(0, 1 - (ph - 0.5) / 0.06);
      const k = parked * on;
      amberLensMat.color.setRGB(0.32 + 1.6 * k, 0.17 + 0.83 * k, 0.04 + 0.12 * k);
      if (heroLens) {
        heroLens.uniforms.uHazard.value = k;
        heroLens.uniforms.uToLocal.value.copy(heroLens.holder.matrixWorld).invert();
      }
      rigs.forEach((r, i) => {
        if (i === 0) {
          r.x = heroX;
        } else {
          // keep a safe gap behind the rig ahead in the same lane instead of driving through it
          const dir = r.lane === 0 ? 1 : -1;
          let gap = Infinity, leader: Rig | null = null;
          for (const o of rigs) {
            if (o === r || o.lane !== r.lane) continue;
            const d = (((o.x - r.x) * dir) % 660 + 660) % 660; // distance ahead, wrapping the loop
            if (d < gap) {
              gap = d;
              leader = o;
            }
          }
          const want = leader && gap < 60 ? Math.min(r.speed, (leader.v ?? leader.speed) * Math.max(0, (gap - 28) / 32)) : r.speed;
          r.v = (r.v ?? r.speed) + (want - (r.v ?? r.speed)) * Math.min(1, dt * 1.5);
          r.x += dir * r.v * dt;
          if (r.x > 330) r.x -= 660;
          if (r.x < -330) r.x += 660;
        }
        r.obj.position.x = r.x;
        // gentle suspension sway
        r.obj.position.y = ROAD_Y + Math.sin(t * 3 + i) * 0.012;
      });
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      models.forEach((m) => disposeObject(m));
      poles.dispose();
    },
  };
}
