import * as THREE from 'three';
import { disposeObject, gltfLoader, tameMaterials } from './gltf';

export interface Bear {
  object: THREE.Object3D;
  readonly phase: number;
  update(t: number, dt: number): void;
  dispose(): void;
}

/** Procedural polar bear (fallback when no GLB is configured). Faces +z. ~2.3 m long. */
export function createProceduralBear(): Bear {
  const fur = new THREE.MeshStandardMaterial({ color: '#f6f2ea', roughness: 0.9, emissive: '#3a4c60', emissiveIntensity: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: '#0d0f12', roughness: 0.4 });
  const geos: THREE.BufferGeometry[] = [];
  const sphere = new THREE.SphereGeometry(1, 20, 14);
  geos.push(sphere);
  const blob = (parent: THREE.Object3D, x: number, y: number, z: number, sx: number, sy: number, sz: number, m = fur) => {
    const mesh = new THREE.Mesh(sphere, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    parent.add(mesh);
    return mesh;
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  blob(body, 0, 1.0, 0, 0.56, 0.52, 1.0); // torso
  blob(body, 0, 1.12, 0.45, 0.52, 0.5, 0.55); // shoulders
  blob(body, 0, 1.02, -0.6, 0.55, 0.5, 0.5); // hips
  blob(body, 0, 0.98, -1.02, 0.12, 0.12, 0.1); // tail

  const neck = new THREE.Group();
  neck.position.set(0, 1.16, 0.85);
  body.add(neck);
  blob(neck, 0, 0, 0.12, 0.34, 0.34, 0.4);
  const head = new THREE.Group();
  head.position.set(0, 0.0, 0.5);
  neck.add(head);
  blob(head, 0, 0, 0, 0.27, 0.25, 0.3);
  blob(head, 0, -0.06, 0.27, 0.15, 0.13, 0.22); // snout
  blob(head, 0, -0.02, 0.48, 0.055, 0.045, 0.04, dark); // nose
  blob(head, 0.12, 0.08, 0.2, 0.03, 0.03, 0.03, dark);
  blob(head, -0.12, 0.08, 0.2, 0.03, 0.03, 0.03, dark);
  blob(head, 0.17, 0.2, -0.05, 0.07, 0.07, 0.04); // ears
  blob(head, -0.17, 0.2, -0.05, 0.07, 0.07, 0.04);

  const legGeo = new THREE.CapsuleGeometry(0.15, 0.62, 4, 10);
  geos.push(legGeo);
  const legs: THREE.Group[] = [];
  const legAt = (x: number, z: number) => {
    const hip = new THREE.Group();
    hip.position.set(x, 0.92, z);
    body.add(hip);
    const leg = new THREE.Mesh(legGeo, fur);
    leg.position.y = -0.45;
    hip.add(leg);
    blob(hip, 0, -0.86, 0.06, 0.17, 0.08, 0.24); // paw
    legs.push(hip);
  };
  legAt(0.3, 0.62);
  legAt(-0.3, 0.62);
  legAt(0.3, -0.62);
  legAt(-0.3, -0.62);

  // walks an oval on the slab
  let phase = 0;
  return {
    object: root,
    get phase() {
      return phase;
    },
    update(t, dt) {
      const speed = 0.7;
      phase += dt * speed;
      const a = phase * 0.16;
      const rx = 5.2, rz = 2.2;
      root.position.set(Math.cos(a) * rx + 1.2, 1.36, Math.sin(a) * rz + 2.4);
      // tangent of the oval → heading
      const tx = -Math.sin(a) * rx, tz = Math.cos(a) * rz;
      root.rotation.y = Math.atan2(tx, tz);
      const w = phase * 4.4;
      legs[0].rotation.x = Math.sin(w) * 0.5;
      legs[3].rotation.x = Math.sin(w) * 0.5;
      legs[1].rotation.x = Math.sin(w + Math.PI) * 0.5;
      legs[2].rotation.x = Math.sin(w + Math.PI) * 0.5;
      body.position.y = Math.abs(Math.sin(w)) * 0.05;
      body.rotation.z = Math.sin(w) * 0.03;
      neck.rotation.x = 0.15 + Math.sin(w * 0.5) * 0.06;
      neck.rotation.y = Math.sin(t * 0.4) * 0.25;
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      fur.dispose();
      dark.dispose();
    },
  };
}

/** Load an animated GLB bear (meshopt/WebP allowed); resolves null on failure so the procedural bear stays. */
export async function loadGLBBear(url: string, opts: { facing?: number; envIntensity?: number; startPhase?: number } = {}): Promise<Bear | null> {
  try {
    const { load } = await gltfLoader();
    const gltf = await load(url);
    const root = gltf.scene;
    tameMaterials(root, opts.envIntensity ?? 1);
    root.traverse((o) => {
      // skinned bounds don't follow the animation; never cull the bear
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) o.frustumCulled = false;
      // white fur reads as grey under a night sky; let the albedo glow a touch
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (m && 'emissive' in m && m.map) {
        m.emissive.set('#9fb4c8');
        m.emissiveMap = m.map;
        m.emissiveIntensity = 0.35;
      }
    });
    const pivot = new THREE.Group();
    pivot.add(root);
    pivot.rotation.y = opts.facing ?? 0;
    pivot.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(pivot);
    const len = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
    pivot.scale.setScalar(2.3 / len);
    pivot.updateMatrixWorld(true);
    box = new THREE.Box3().setFromObject(pivot);
    pivot.position.y = -box.min.y;
    const mixer = new THREE.AnimationMixer(root);
    const clip = gltf.animations.find((c) => /walk/i.test(c.name)) ?? gltf.animations.find((c) => /idle/i.test(c.name)) ?? gltf.animations[0];
    if (clip) mixer.clipAction(clip).setEffectiveTimeScale(0.7).play();
    const holder = new THREE.Group();
    holder.add(pivot);
    let phase = opts.startPhase ?? 0;
    return {
      object: holder,
      get phase() {
        return phase;
      },
      update(_t, dt) {
        mixer.update(dt);
        phase += dt * 0.7;
        const a = phase * 0.16;
        holder.position.set(Math.cos(a) * 5.2 + 1.2, 1.36, Math.sin(a) * 2.2 + 2.4);
        holder.rotation.y = Math.atan2(-Math.sin(a) * 5.2, Math.cos(a) * 2.2);
      },
      dispose() {
        mixer.stopAllAction();
        disposeObject(root);
      },
    };
  } catch (e) {
    console.warn('[scene] bear model failed, keeping procedural bear', e);
    return null;
  }
}
