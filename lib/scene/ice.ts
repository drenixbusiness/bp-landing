import * as THREE from 'three';
import { containerTexture } from './textures';

/* ---- tiny deterministic 3D value noise for geometry displacement ---- */
function hash3(x: number, y: number, z: number, s: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function noise3(x: number, y: number, z: number, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash3(xi + dx, yi + dy, zi + dz, s);
  return l(
    l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v),
    w,
  );
}

interface BergOpts {
  radius: number;
  detail: number;
  seed: number;
  scale?: [number, number, number];
  spire?: { x: number; z: number; h: number; w: number };
  flatTop?: number;
  rough?: number;
}

export function bergGeometry(o: BergOpts) {
  const g = new THREE.IcosahedronGeometry(o.radius, o.detail);
  const p = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  const [sx, sy, sz] = o.scale ?? [1, 1, 1];
  const rough = o.rough ?? 0.38;
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const f = 1 + rough * (noise3(n.x * 1.6 + 3, n.y * 1.6, n.z * 1.6, o.seed) - 0.5) * 2 + 0.16 * (noise3(n.x * 4, n.y * 4, n.z * 4, o.seed + 7) - 0.5) * 2;
    v.multiplyScalar(f);
    v.set(v.x * sx, v.y * sy, v.z * sz);
    if (o.spire && v.y > 0) {
      const d2 = (v.x - o.spire.x) ** 2 + (v.z - o.spire.z) ** 2;
      v.y += o.spire.h * Math.exp(-d2 / (o.spire.w * o.spire.w)) * (v.y / (o.radius * sy));
    }
    if (o.flatTop !== undefined && v.y > o.flatTop) v.y = o.flatTop + (v.y - o.flatTop) * 0.06;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

export function iceMaterial(physical: boolean) {
  const base = {
    color: new THREE.Color('#b9dcf2'),
    roughness: 0.34,
    metalness: 0,
    emissive: new THREE.Color('#0a4a68'),
    emissiveIntensity: 0.22,
    flatShading: true,
  };
  return physical ? new THREE.MeshPhysicalMaterial({ ...base, clearcoat: 1, clearcoatRoughness: 0.18 }) : new THREE.MeshStandardMaterial(base);
}

/** Slab-local positions shared with the bear's walker (keep in sync with the meshes below). */
export const SLAB_LAYOUT = {
  container: { x: -2.2, z: -1.2, rot: -0.18 },
  pole: { x: 7.4, z: -2.4 },
};

export function createIce(physical: boolean, floeCount: number, aniso: number) {
  const group = new THREE.Group();
  const mat = iceMaterial(physical);
  const disposables: { dispose(): void }[] = [mat];
  const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0, m: THREE.Material = mat) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    group.add(mesh);
    disposables.push(geo);
    return mesh;
  };

  // hero berg with spire, a smaller chunk, two distant tabular shelves
  add(bergGeometry({ radius: 20, detail: 3, seed: 1, scale: [1.25, 0.95, 0.9], spire: { x: -6, z: 2, h: 34, w: 7 } }), -78, -4, -128, 0.4);
  add(bergGeometry({ radius: 8, detail: 2, seed: 2, scale: [1.3, 0.8, 1] }), 52, -1.5, -98, 1.1);
  add(bergGeometry({ radius: 40, detail: 2, seed: 3, scale: [2.4, 0.45, 0.8], flatTop: 11, rough: 0.25 }), -260, -6, -360, 0.1);
  add(bergGeometry({ radius: 40, detail: 2, seed: 4, scale: [2.8, 0.5, 0.9], flatTop: 15, rough: 0.25 }), 230, -6, -420, -0.15);

  // drifting floes
  const floeGeo = bergGeometry({ radius: 1, detail: 1, seed: 9, scale: [1.4, 0.32, 1.1], flatTop: 0.22, rough: 0.3 });
  disposables.push(floeGeo);
  const floes = new THREE.InstancedMesh(floeGeo, mat, floeCount);
  const floeData: { x: number; z: number; s: number; r: number; ph: number; vx: number }[] = [];
  for (let i = 0; i < floeCount; i++) {
    let x = 0, z = 0;
    do {
      x = (Math.random() - 0.5) * 260;
      z = -40 + Math.random() * 110 - (Math.random() < 0.35 ? 60 : 0);
      // floes drift along x, so keep whole z-bands clear of the slab and the ice shelf
    } while (Math.abs(z + 12) < 11 || (z < -38 && z > -66));
    floeData.push({ x, z, s: 0.6 + Math.random() * Math.random() * 3.2, r: Math.random() * 6.28, ph: Math.random() * 6.28, vx: (Math.random() - 0.5) * 0.25 });
  }
  floes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(floes);

  // tabular slab carrying the container, bear and beacon
  const slab = new THREE.Group();
  slab.position.set(17, 0, -12);
  group.add(slab);
  const shape = new THREE.Shape();
  const pts = 14;
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const r = 1 + 0.12 * (noise3(Math.cos(a) * 2, Math.sin(a) * 2, 0, 31) - 0.5) * 2;
    const x = Math.cos(a) * 9.5 * r, y = Math.sin(a) * 6 * r;
    if (i) shape.lineTo(x, y);
    else shape.moveTo(x, y);
  }
  const slabGeo = new THREE.ExtrudeGeometry(shape, { depth: 2.6, bevelEnabled: true, bevelSize: 0.5, bevelThickness: 0.35, bevelSegments: 1, steps: 1 });
  slabGeo.rotateX(-Math.PI / 2);
  slabGeo.translate(0, -1.6, 0);
  const slabMesh = new THREE.Mesh(slabGeo, mat);
  slab.add(slabMesh);
  disposables.push(slabGeo);
  // snow crust on top
  const snowMat = new THREE.MeshStandardMaterial({ color: '#f4fbff', roughness: 0.85, emissive: '#16304a', emissiveIntensity: 0.25 });
  const crustGeo = new THREE.ShapeGeometry(shape, 6);
  crustGeo.rotateX(-Math.PI / 2);
  crustGeo.scale(0.97, 1, 0.97);
  const crust = new THREE.Mesh(crustGeo, snowMat);
  crust.position.y = 1.36;
  slab.add(crust);
  disposables.push(crustGeo, snowMat);

  // container (20ft)
  const ctex = containerTexture(aniso);
  const side = new THREE.MeshStandardMaterial({ map: ctex, roughness: 0.55, metalness: 0.35 });
  const plain = new THREE.MeshStandardMaterial({ color: '#174a86', roughness: 0.6, metalness: 0.3 });
  const cgeo = new THREE.BoxGeometry(6.06, 2.59, 2.44);
  const container = new THREE.Mesh(cgeo, [plain, plain, plain, plain, side, side]);
  container.position.set(SLAB_LAYOUT.container.x, 1.36 + 1.3, SLAB_LAYOUT.container.z);
  container.rotation.y = SLAB_LAYOUT.container.rot;
  slab.add(container);
  const capGeo = bergGeometry({ radius: 1, detail: 2, seed: 44, scale: [3.1, 0.18, 1.3], rough: 0.12 });
  const cap = new THREE.Mesh(capGeo, snowMat);
  cap.position.set(0, 1.32, 0);
  container.add(cap);
  disposables.push(cgeo, side, plain, ctex, capGeo);

  // beacon pole
  const poleMat = new THREE.MeshStandardMaterial({ color: '#2a3442', roughness: 0.5, metalness: 0.6 });
  const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.2, 8);
  const pole = new THREE.Mesh(poleGeo, poleMat);
  pole.position.set(SLAB_LAYOUT.pole.x, 1.36 + 2.1, SLAB_LAYOUT.pole.z);
  slab.add(pole);
  const lampMat = new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#ff7a1a', emissiveIntensity: 2 });
  const lampGeo = new THREE.SphereGeometry(0.18, 12, 8);
  const lamp = new THREE.Mesh(lampGeo, lampMat);
  lamp.position.set(0, 2.2, 0);
  pole.add(lamp);
  disposables.push(poleMat, poleGeo, lampMat, lampGeo);

  return {
    group,
    slab,
    lamp,
    lampMat,
    floes,
    update(t: number) {
      const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
      for (let i = 0; i < floeData.length; i++) {
        const f = floeData[i];
        const x = ((f.x + f.vx * t + 140) % 280 + 280) % 280 - 140;
        p.set(x, Math.sin(t * 0.8 + f.ph) * 0.06 * f.s - 0.04, f.z);
        e.set(Math.sin(t * 0.6 + f.ph) * 0.03, f.r + t * 0.01 * (f.vx > 0 ? 1 : -1), Math.cos(t * 0.7 + f.ph) * 0.03);
        q.setFromEuler(e);
        s.setScalar(f.s);
        floes.setMatrixAt(i, m.compose(p, q, s));
      }
      floes.instanceMatrix.needsUpdate = true;
      const blink = Math.pow(Math.max(0, Math.sin(t * 3.4)), 6);
      lampMat.emissiveIntensity = 0.6 + blink * 5;
      return blink;
    },
    dispose() {
      disposables.forEach((d) => d.dispose());
      floes.dispose();
    },
  };
}
