/**
 * Polar bear locomotion on the ice slab (slab-local XZ, metres).
 *
 * Steering-behaviour walker (no point-to-point pivots):
 *  - ambles at a relaxed pace and wanders on smooth arcs (turn radius ≈ 2 m),
 *  - "feels" ahead with rays and curves away from the container, the beacon and the slab edge,
 *  - turns on the spot only when boxed in — and keeps stepping while it does,
 *  - stops now and then to sniff the ice or look around,
 *  - a hard push-out guarantees it never overlaps an obstacle.
 */

export interface Obstacle {
  kind: 'rect' | 'circle';
  x: number;
  z: number;
  /** rect: half extents along its local axes; circle: radius in hx */
  hx: number;
  hz?: number;
  /** rect rotation about Y (radians), same convention as Object3D.rotation.y */
  rot?: number;
}

export interface WalkerOptions {
  /** walkable ellipse (bear centre must stay inside) */
  cx: number;
  cz: number;
  rx: number;
  rz: number;
  obstacles: Obstacle[];
  /** body radius around each body sample point (metres) */
  clearance: number;
  /** half body length: nose / tail sample offset from the centre (metres) */
  halfLength?: number;
}

export interface WalkerState {
  x: number;
  z: number;
  heading: number;
  /** forward speed, m/s */
  speed: number;
  /** yaw rate, rad/s (signed) */
  omega: number;
  /** 0 = standing … 1 = full walk (includes stepping while turning in place) */
  gait: number;
  /** head yaw while standing (looking around) */
  look: number;
  /** 0..1 head lowered to the ice */
  sniff: number;
}

export const WALK_SPEED = 0.94; // m/s — polar bears amble at ~3.4 km/h to avoid overheating
/** metres travelled per full gait cycle for a 2.3 m bear */
export const STRIDE_METRES = 1.75;
const MAX_TURN = 0.55; // rad/s while walking → turn radius ≈ 1.8 m
const PIVOT_TURN = 0.7; // rad/s when turning on the spot

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (v: number, target: number, rate: number, dt: number) => v + (target - v) * Math.min(1, rate * dt);

export function createWalker(o: WalkerOptions, start?: Partial<WalkerState>) {
  const s: WalkerState = {
    x: start?.x ?? o.cx + 3,
    z: start?.z ?? o.cz + 1.5,
    heading: start?.heading ?? 0,
    speed: 0,
    omega: 0,
    gait: 0,
    look: 0,
    sniff: 0,
  };
  type Mode = 'walk' | 'stop' | 'pivot';
  let mode: Mode = 'stop';
  let timer = rand(1.2, 2.2); // time left in the current mode
  let stopKind: 'sniff' | 'look' = 'look';
  let wander = 0; // slowly drifting preferred turn bias
  let pivotDir = 1;
  let lookPhase = Math.random() * 6.28;

  const inObstacle = (x: number, z: number, r: number) =>
    o.obstacles.some((ob) => {
      if (ob.kind === 'circle') return Math.hypot(x - ob.x, z - ob.z) < ob.hx + r;
      const c = Math.cos(-(ob.rot ?? 0)), sn = Math.sin(-(ob.rot ?? 0));
      const dx = x - ob.x, dz = z - ob.z;
      const lx = dx * c + dz * sn, lz = -dx * sn + dz * c;
      return Math.abs(lx) < ob.hx + r && Math.abs(lz) < (ob.hz ?? 0) + r;
    });
  const inSlab = (x: number, z: number) => ((x - o.cx) / o.rx) ** 2 + ((z - o.cz) / o.rz) ** 2 <= 1;
  const half = o.halfLength ?? 1.0;
  /** the whole body (tail, centre, nose along the heading) fits on the slab without touching anything */
  const free = (x: number, z: number, heading = s.heading, r = o.clearance) => {
    const sx = Math.sin(heading) * half, sz = Math.cos(heading) * half;
    for (const k of [-1, -0.5, 0, 0.5, 1]) {
      const px = x + sx * k, pz = z + sz * k;
      if (!inSlab(px, pz) || inObstacle(px, pz, r)) return false;
    }
    return true;
  };

  /** free distance along a ray, with the body turned to face that way */
  const ray = (angle: number, max: number) => {
    for (let d = 0.2; d <= max; d += 0.2) {
      if (!free(s.x + Math.sin(angle) * d, s.z + Math.cos(angle) * d, angle)) return d - 0.2;
    }
    return max;
  };

  const pushOut = (px: number, pz: number) => {
    if (free(s.x, s.z)) return;
    for (let r = 0.04; r < 2; r += 0.04) {
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const x = s.x + Math.cos(a) * r, z = s.z + Math.sin(a) * r;
        if (free(x, z)) {
          s.x = x;
          s.z = z;
          return;
        }
      }
    }
    s.x = px;
    s.z = pz;
  };

  const startStop = () => {
    mode = 'stop';
    stopKind = Math.random() < 0.5 ? 'sniff' : 'look';
    timer = stopKind === 'sniff' ? rand(2, 4) : rand(2.5, 5.5);
  };

  return {
    state: s,
    update(dt: number) {
      dt = Math.min(dt, 0.1);
      timer -= dt;
      const look = 3.2;
      let targetSpeed = 0;
      let targetOmega = 0;

      if (mode === 'walk') {
        // wandering preference drifts slowly → long smooth arcs
        wander = Math.max(-0.5, Math.min(0.5, wander + (Math.random() - 0.5) * dt * 0.8));
        // sample candidate directions and pick the clearest one close to where we want to go
        let best = 0, bestScore = -Infinity, frontFree = look;
        for (const off of [-0.9, -0.6, -0.35, -0.15, 0, 0.15, 0.35, 0.6, 0.9]) {
          const dist = ray(s.heading + off, look);
          if (off === 0) frontFree = dist;
          const score = dist - Math.abs(off - wander) * 1.4;
          if (score > bestScore) {
            bestScore = score;
            best = off;
          }
        }
        if (frontFree < 0.7 && ray(s.heading + best, look) < 1.2) {
          // boxed in: stop and turn on the spot toward the most open side
          mode = 'pivot';
          pivotDir = ray(s.heading + 1.2, look) > ray(s.heading - 1.2, look) ? 1 : -1;
          timer = 4;
        }
        targetOmega = Math.max(-MAX_TURN, Math.min(MAX_TURN, best * 1.3));
        // ease off for tighter arcs and when something is close ahead
        const turnSlow = 1 - 0.45 * (Math.abs(targetOmega) / MAX_TURN);
        const nearSlow = Math.max(0.35, Math.min(1, frontFree / 1.6));
        targetSpeed = WALK_SPEED * turnSlow * nearSlow;
        if (timer <= 0) startStop();
      } else if (mode === 'pivot') {
        targetOmega = PIVOT_TURN * pivotDir;
        targetSpeed = 0.12;
        if (ray(s.heading, look) >= 2.2 || timer <= 0) {
          mode = 'walk';
          timer = rand(7, 16);
        }
      } else {
        // standing: sniff the ice or scan the horizon
        if (timer <= 0) {
          mode = ray(s.heading, look) < 1.2 ? 'pivot' : 'walk';
          pivotDir = Math.random() < 0.5 ? 1 : -1;
          timer = mode === 'walk' ? rand(7, 16) : 4;
        }
      }

      s.speed = approach(s.speed, targetSpeed, targetSpeed > s.speed ? 0.9 : 1.6, dt);
      s.omega = approach(s.omega, targetOmega, 2.2, dt);
      s.heading = wrap(s.heading + s.omega * dt);
      const px = s.x, pz = s.z;
      s.x += Math.sin(s.heading) * s.speed * dt;
      s.z += Math.cos(s.heading) * s.speed * dt;
      pushOut(px, pz);

      // head behaviour
      const standing = mode === 'stop';
      lookPhase += dt * 0.6;
      s.look = approach(s.look, standing && stopKind === 'look' ? Math.sin(lookPhase) * 0.5 : 0, 1.5, dt);
      s.sniff = approach(s.sniff, standing && stopKind === 'sniff' ? 1 : 0, 1.2, dt);
      // legs step while moving forward or turning in place
      s.gait = Math.min(1, (s.speed + Math.abs(s.omega) * 0.9) / WALK_SPEED);
    },
  };
}
