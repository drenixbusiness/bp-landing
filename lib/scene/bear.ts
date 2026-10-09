import * as THREE from 'three';
import { disposeObject, gltfLoader, tameMaterials } from './gltf';
import { STRIDE_METRES, type WalkerState } from './walker';

/** Slab-local ground height of the snow crust. */
const SLAB_TOP = 1.36;

export interface Bear {
  object: THREE.Object3D;
  /** QA readout */
  debug?(): Record<string, number | string>;
  update(t: number, dt: number): void;
  dispose(): void;
}

/** Procedural polar bear (fallback when no GLB is configured). Faces +z. ~2.3 m long. */
export function createProceduralBear(walk: WalkerState): Bear {
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

  // gait phase advances with distance walked, so feet never slide
  let w = 0;
  return {
    object: root,
    update(_t, dt) {
      root.position.set(walk.x, SLAB_TOP, walk.z);
      root.rotation.y = walk.heading;
      w += (((walk.speed + Math.abs(walk.omega) * 0.9) * dt) / STRIDE_METRES) * Math.PI * 2;
      const amp = 0.5 * walk.gait;
      // 4-beat polar bear walk: RF → LH → LF → RH (legs: 0 LF, 1 RF, 2 LH, 3 RH)
      legs[1].rotation.x = Math.sin(w) * amp;
      legs[2].rotation.x = Math.sin(w - Math.PI / 2) * amp;
      legs[0].rotation.x = Math.sin(w - Math.PI) * amp;
      legs[3].rotation.x = Math.sin(w - Math.PI * 1.5) * amp;
      body.position.y = Math.abs(Math.sin(w)) * 0.04 * walk.gait;
      body.rotation.z = Math.sin(w) * 0.035 * walk.gait;
      // head low and swinging while walking, raised and scanning while standing
      neck.rotation.x = 0.22 * walk.gait - 0.05 * (1 - walk.gait) + 0.5 * walk.sniff + Math.sin(w) * 0.05 * walk.gait;
      neck.rotation.y = walk.look + Math.sin(w * 0.5) * 0.08 * walk.gait;
    },
    dispose() {
      geos.forEach((g) => g.dispose());
      fur.dispose();
      dark.dispose();
    },
  };
}

/** Load an animated GLB bear (meshopt/WebP allowed); resolves null on failure so the procedural bear stays. */
export async function loadGLBBear(url: string, walk: WalkerState, opts: { facing?: number; envIntensity?: number } = {}): Promise<Bear | null> {
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
    // The bundled clip is not a walk (one hind leg barely moves), so the gait is driven
    // procedurally on the skeleton: lateral-sequence walk, ~60% stance / 40% swing,
    // knees fold during swing, phase advances with distance travelled (no foot sliding).
    const rig = buildGaitRig(root, root.getWorldScale(new THREE.Vector3()).x);
    const holder = new THREE.Group();
    holder.add(pivot);
    let cyc = 0;
    return {
      object: holder,
      debug: () => ({ type: 'glb', rig: rig ? 'skeleton' : 'none', wx: +holder.getWorldPosition(new THREE.Vector3()).x.toFixed(2), wz: +holder.getWorldPosition(new THREE.Vector3()).z.toFixed(2), heading: +walk.heading.toFixed(2), speed: +walk.speed.toFixed(2), omega: +walk.omega.toFixed(2), gait: +walk.gait.toFixed(2), sniff: +walk.sniff.toFixed(2), cycle: +(cyc % 1).toFixed(2) }),
      update(_t, dt) {
        cyc += ((walk.speed + Math.abs(walk.omega) * 0.9) * dt) / STRIDE_METRES;
        const body = rig?.pose(cyc, walk);
        // centre of mass sways toward the supporting side (bear-local +x = its left)
        const side = body?.lateral ?? 0;
        holder.position.set(walk.x + Math.cos(walk.heading) * side, SLAB_TOP + (body?.bob ?? 0), walk.z - Math.sin(walk.heading) * side);
        holder.rotation.y = walk.heading;
      },
      dispose() {
        disposeObject(root);
      },
    };
  } catch (e) {
    console.warn('[scene] bear model failed, keeping procedural bear', e);
    return null;
  }
}

/* ---------------- procedural gait on the polar bear skeleton ---------------- */
/*
 * Polar bear walk (lumbering, plantigrade, pigeon-toed), 4-beat sequence RF → LH → LF → RH.
 *
 * Legs are driven by two-bone IK toward paw targets on the ice rather than by fixed joint
 * angles: the rig's legs are not built alike (the left hind has an extra backward segment),
 * so identical angles made that leg look broken. With IK every paw follows the same path:
 *  - stance (≈62%): the paw stays planted on the ice while the body passes over it,
 *  - swing: it lifts, travels forward on a shallow arc (fore paws swing slightly outward)
 *    and lands flat, toes turned in,
 * and the knees/elbows keep bending the way the model was built (rest bend plane).
 * Chest/hips roll and the body sways over the supporting legs; the paws are compensated
 * so they don't slide.
 */

interface LegDef {
  /** hip / shoulder bone */
  upper: string;
  /** knee / elbow bone (everything below it moves rigidly with it) */
  lower: string;
  /** bone whose head is the wrist/ankle point that IK places on the target */
  end: string;
  /** phase offset within the gait cycle (0..1) */
  offset: number;
  /** +1 = left (+x), −1 = right */
  side: 1 | -1;
  fore: boolean;
}

// Model faces +z, +x is the bear's left. Left hind: Bone.022 is a backward segment, so the chain ends at Bone.023.
const LEGS: LegDef[] = [
  { upper: 'Bone.012', lower: 'Bone.013', end: 'Bone.014', offset: 0.0, side: -1, fore: true }, // RF
  { upper: 'Bone.020', lower: 'Bone.021', end: 'Bone.023', offset: 0.25, side: 1, fore: false }, // LH
  { upper: 'Bone.008', lower: 'Bone.009', end: 'Bone.010', offset: 0.5, side: 1, fore: true }, // LF
  { upper: 'Bone.016', lower: 'Bone.017', end: 'Bone.018', offset: 0.75, side: -1, fore: false }, // RH
];
const DUTY = 0.62; // fraction of the cycle a paw is planted
const LIFT_M = 0.13; // paw clearance at mid-swing (metres)
const PIGEON_TOE = 0.18; // fore paws turned in (rad)

function buildGaitRig(root: THREE.Object3D, metresPerUnit: number) {
  root.updateMatrixWorld(true);
  const rootInv = root.matrixWorld.clone().invert();
  const rootQInv = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const find = (name: string) => root.getObjectByName(name) ?? root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(name)) ?? null;
  /** bone head position in root space */
  const pos = (b: THREE.Object3D, out = new THREE.Vector3()) => b.getWorldPosition(out).applyMatrix4(rootInv);
  /** bone orientation in root space */
  const rq = (b: THREE.Object3D, out = new THREE.Quaternion()) => out.copy(rootQInv).multiply(b.getWorldQuaternion(new THREE.Quaternion()));
  /** set a bone's local rotation so that its root-space orientation equals q */
  const setRootQ = (b: THREE.Object3D, q: THREE.Quaternion) => {
    const parentQ = b.parent ? rq(b.parent) : new THREE.Quaternion();
    b.quaternion.copy(parentQ.invert().multiply(q));
    b.updateMatrixWorld(true);
  };

  type Leg = {
    d: LegDef;
    A: THREE.Object3D;
    B: THREE.Object3D;
    C: THREE.Object3D;
    restA: THREE.Quaternion;
    restB: THREE.Quaternion;
    restC: THREE.Quaternion;
    restCRoot: THREE.Quaternion;
    foot0: THREE.Vector3; // planted paw position at rest (root space)
    l1: number;
    l2: number;
    bendSide: THREE.Vector3; // rest bend direction relative to the hip→paw line
  };
  const legs: Leg[] = [];
  for (const d of LEGS) {
    const A = find(d.upper), B = find(d.lower), C = find(d.end);
    if (!A || !B || !C) return null;
    const pA = pos(A), pB = pos(B), pC = pos(C);
    const line = pC.clone().sub(pA).normalize();
    const bendSide = pB.clone().sub(pA).sub(line.clone().multiplyScalar(pB.clone().sub(pA).dot(line))).normalize();
    legs.push({
      d, A, B, C,
      restA: A.quaternion.clone(),
      restB: B.quaternion.clone(),
      restC: C.quaternion.clone(),
      restCRoot: rq(C),
      foot0: pC.clone(),
      l1: pA.distanceTo(pB),
      l2: pB.distanceTo(pC),
      bendSide,
    });
  }

  // The model's rest pose is caught mid-stride (one fore paw far ahead, the left hind far back),
  // so each pair of legs gets a symmetric neutral stance: mirrored left/right, averaged fore/aft.
  for (const fore of [true, false]) {
    const pair = legs.filter((l) => l.d.fore === fore);
    const z = pair.reduce((acc, l) => acc + l.foot0.z, 0) / pair.length;
    const y = Math.min(...pair.map((l) => l.foot0.y));
    const x = pair.reduce((acc, l) => acc + Math.abs(l.foot0.x), 0) / pair.length;
    for (const l of pair) l.foot0.set(x * l.d.side, y, z);
  }

  type Joint = { bone: THREE.Object3D; rest: THREE.Quaternion; axisX: THREE.Vector3; axisY: THREE.Vector3; axisZ: THREE.Vector3 };
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
  const joint = (name: string): Joint | null => {
    const bone = find(name);
    if (!bone) return null;
    const inv = rq(bone).invert();
    return { bone, rest: bone.quaternion.clone(), axisX: X.clone().applyQuaternion(inv), axisY: Y.clone().applyQuaternion(inv), axisZ: Z.clone().applyQuaternion(inv) };
  };
  const hips = joint('Bone.002');
  const chest = joint('Bone.004');
  const neck = joint('Bone.005');
  const head = joint('Bone.006');
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  /** rotate about root axes: rx pitch (+ tips a forward-pointing bone down), ry yaw, rz roll (+ raises the bear's left) */
  const set = (j: Joint | null, rx: number, ry = 0, rz = 0) => {
    if (!j) return;
    qa.setFromAxisAngle(j.axisX, rx);
    if (ry) qa.multiply(qb.setFromAxisAngle(j.axisY, ry));
    if (rz) qa.multiply(qb.setFromAxisAngle(j.axisZ, rz));
    j.bone.quaternion.copy(j.rest).multiply(qa);
  };
  const smooth = (x: number) => x * x * (3 - 2 * x);
  const unit = 1 / metresPerUnit; // metres → root units

  // scratch
  const pA = new THREE.Vector3(), pB = new THREE.Vector3(), pC = new THREE.Vector3(), t = new THREE.Vector3();
  const dir = new THREE.Vector3(), bend = new THREE.Vector3(), newB = new THREE.Vector3();
  const q = new THREE.Quaternion(), q2 = new THREE.Quaternion(), u1 = new THREE.Vector3(), u2 = new THREE.Vector3();

  /** two-bone IK: place C's head at target, bending in the leg's rest bend plane */
  const solve = (L: Leg, target: THREE.Vector3) => {
    L.A.quaternion.copy(L.restA);
    L.B.quaternion.copy(L.restB);
    L.C.quaternion.copy(L.restC);
    L.A.updateMatrixWorld(true);
    pos(L.A, pA);
    pos(L.B, pB);
    t.copy(target);
    // keep the target reachable
    dir.copy(t).sub(pA);
    let dist = dir.length();
    const maxR = (L.l1 + L.l2) * 0.995, minR = Math.abs(L.l1 - L.l2) * 1.01 + 1e-4;
    dist = Math.min(maxR, Math.max(minR, dist));
    dir.normalize();
    t.copy(pA).addScaledVector(dir, dist);
    // knee position: law of cosines, on the rest side of the hip→paw line
    const a = (L.l1 * L.l1 - L.l2 * L.l2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, L.l1 * L.l1 - a * a));
    bend.copy(L.bendSide).sub(dir.clone().multiplyScalar(L.bendSide.dot(dir)));
    if (bend.lengthSq() < 1e-8) bend.set(0, 0, L.d.fore ? -1 : 1);
    bend.normalize();
    newB.copy(pA).addScaledVector(dir, a).addScaledVector(bend, h);
    // rotate the upper bone so the knee lands on newB
    q.setFromUnitVectors(u1.copy(pB).sub(pA).normalize(), u2.copy(newB).sub(pA).normalize());
    setRootQ(L.A, q2.copy(q).multiply(rq(L.A)));
    // rotate the lower bone so the paw lands on the target
    pos(L.B, pB);
    pos(L.C, pC);
    q.setFromUnitVectors(u1.copy(pC).sub(pB).normalize(), u2.copy(t).sub(pB).normalize());
    setRootQ(L.B, q2.copy(q).multiply(rq(L.B)));
  };

  const load = { LF: 0, RF: 0, LH: 0, RH: 0 };
  const extend = { LH: 0, RH: 0 };
  const phase: { u: number; swing: number; lift: number }[] = LEGS.map(() => ({ u: 0, swing: 0, lift: 0 }));
  const footQ = new THREE.Quaternion(), toeQ = new THREE.Quaternion();

  return {
    pose(cycle: number, walk: WalkerState) {
      const { gait, look, sniff } = walk;
      // the bear moves every frame: refresh the world → root-space transforms
      root.updateWorldMatrix(true, true);
      rootInv.copy(root.matrixWorld).invert();
      rootQInv.copy(root.getWorldQuaternion(new THREE.Quaternion())).invert();
      // 1) where is every paw in its cycle?
      legs.forEach((L, i) => {
        const u = (((cycle + L.d.offset) % 1) + 1) % 1;
        const p = phase[i];
        p.u = u;
        if (u < DUTY) {
          const k = u / DUTY;
          p.swing = 1 - 2 * k; // +1 = paw ahead of its rest spot, −1 = behind
          p.lift = 0;
          const key = ((L.d.side > 0 ? 'L' : 'R') + (L.d.fore ? 'F' : 'H')) as keyof typeof load;
          load[key] = Math.sin(Math.PI * k) * gait;
          if (!L.d.fore) extend[key as 'LH' | 'RH'] = k * k * gait;
        } else {
          const k = (u - DUTY) / (1 - DUTY);
          p.swing = -1 + 2 * smooth(k);
          p.lift = Math.sin(Math.PI * k);
          const key = ((L.d.side > 0 ? 'L' : 'R') + (L.d.fore ? 'F' : 'H')) as keyof typeof load;
          load[key] = 0;
          if (!L.d.fore) extend[key as 'LH' | 'RH'] = 0;
        }
      });

      // 2) torso: shoulder of the loaded fore leg rises, pelvis dips away from the extending hind leg
      const w = cycle * Math.PI * 2;
      const chestRoll = 0.06 * (load.LF - load.RF);
      const hipRoll = -0.045 * (extend.LH - extend.RH);
      set(hips, 0, Math.sin(w) * 0.025 * gait, hipRoll);
      set(chest, 0, -Math.sin(w) * 0.035 * gait + walk.omega * 0.1, chestRoll - hipRoll);
      set(neck, 0.3 + 0.14 * gait + 0.4 * sniff + Math.sin(w * 2) * 0.05 * gait, look * 0.7 + Math.sin(w) * 0.1 * gait + walk.omega * 0.18);
      set(head, 0.06 + 0.25 * sniff - Math.sin(w * 2) * 0.03 * gait, look * 0.4);
      root.updateMatrixWorld(true);

      // body sway / bob (applied to the holder by the caller); paws are compensated so they stay planted
      const lateral = 0.06 * (load.LF + load.LH - load.RF - load.RH) * 0.5;
      const bob = Math.max(load.LF, load.RF) * 0.025;

      // 3) legs: IK each paw to its spot on the ice
      const sweep = ((STRIDE_METRES * DUTY) / 2) * unit; // half the distance the body travels during stance
      legs.forEach((L, i) => {
        const p = phase[i];
        const target = t.copy(L.foot0);
        target.z += p.swing * sweep * gait;
        target.y += (p.lift * LIFT_M * gait - bob) * unit;
        target.x -= lateral * unit;
        if (L.d.fore) target.x += p.lift * 0.06 * L.d.side * gait * unit; // swing arcs outward
        solve(L, target.clone());
        // plantigrade: paw keeps its rest (flat) orientation; in swing the toes droop a little,
        // fore paws land turned in (pigeon-toed)
        footQ.copy(L.restCRoot);
        toeQ.setFromAxisAngle(X, p.lift * 0.35 * gait);
        footQ.premultiply(toeQ);
        if (L.d.fore) footQ.premultiply(toeQ.setFromAxisAngle(Y, -PIGEON_TOE * L.d.side));
        setRootQ(L.C, footQ);
      });
      return { lateral, bob };
    },
  };
}
