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
  return { object: holder, trailerX: -length * 0.86 };
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

/** Additive light cone pointing along +x from origin. */
function coneMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uInt: { value: 1 } },
    vertexShader: /* glsl */ `
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main(){
        vAlong = clamp(position.x / 18., 0., 1.);
        vec4 mv = modelViewMatrix * vec4(position,1.);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uInt;
      varying float vAlong; varying vec3 vN; varying vec3 vV;
      void main(){
        float edge = pow(abs(dot(normalize(vN), normalize(vV))), 1.6);
        float a = (1. - vAlong) * (1. - vAlong) * edge * .16 * uInt * smoothstep(0., .06, vAlong);
        gl_FragColor = vec4(vec3(1., .93, .78) * a, 1.);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

function poolTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(40, 64, 4, 90, 64, 150);
  grd.addColorStop(0, 'rgba(255,236,200,.9)');
  grd.addColorStop(0.4, 'rgba(255,226,180,.35)');
  grd.addColorStop(1, 'rgba(255,220,170,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 128);
  return new THREE.CanvasTexture(c);
}

export interface Traffic {
  group: THREE.Group;
  hero: THREE.Group;
  /** Swap the procedural cab for a loaded tractor on the hero rig, the traffic, or all rigs. */
  useModel(model: TractorModel, which: 'hero' | 'traffic' | 'all'): void;
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
  const roadMat = new THREE.MeshStandardMaterial({ map: rtex, roughness: 0.55, metalness: 0.05, color: '#a8bdd2' });
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
  const coneGeo = new THREE.ConeGeometry(3.2, 18, 18, 1, true);
  coneGeo.rotateZ(Math.PI / 2); // apex now at -x
  coneGeo.translate(9, 0, 0); // apex at the lamp, opening toward +x
  const coneMat = coneMaterial();
  const poolTex = poolTexture();
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.55, color: '#ffe8c4' });
  const poolGeo = new THREE.PlaneGeometry(22, 8);
  poolGeo.rotateX(-Math.PI / 2);
  poolGeo.translate(9, 0, 0);
  const headMat = new THREE.SpriteMaterial({ map: glow, color: '#fff3dc', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const tailMat = new THREE.SpriteMaterial({ map: glow, color: '#ff3a2a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 });
  disposables.push(coneGeo, coneMat, poolTex, poolMat, poolGeo, headMat, tailMat);

  const models = new Set<THREE.Object3D>();
  type Rig = { obj: THREE.Group; lane: number; x: number; speed: number; tractor: THREE.Group; trailer: THREE.Group; model?: THREE.Object3D };
  const rigs: Rig[] = [];
  for (let i = 0; i < count; i++) {
    const obj = new THREE.Group();
    const parts = kit.make();
    obj.add(parts.tractor, parts.trailer);
    for (const zs of [0.95, -0.95]) {
      const h = new THREE.Sprite(headMat);
      h.position.set(0.25, 0.95, zs);
      h.scale.setScalar(1.6);
      obj.add(h);
      const tl = new THREE.Sprite(tailMat);
      tl.position.set(-TRAILER_LEN - 0.05, 1.3, zs * 1.2);
      tl.scale.setScalar(0.7);
      parts.trailer.add(tl);
    }
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(0.3, 0.95, 0);
    cone.rotation.z = -0.07;
    obj.add(cone);
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.set(0.2, 0.04, 0);
    obj.add(pool);
    // hero owns the +x lane (scroll-driven); traffic flows the other way
    const lane = i === 0 ? 0 : 1;
    const rig: Rig = { obj, lane, x: -300 + Math.random() * 600, speed: 14 + Math.random() * 8, tractor: parts.tractor, trailer: parts.trailer };
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
      });
    },
    update(t, dt, heroX) {
      rigs.forEach((r, i) => {
        if (i === 0) {
          r.x = heroX;
        } else {
          r.x += (r.lane === 0 ? 1 : -1) * r.speed * dt;
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
