import * as THREE from 'three';
import { createSky, createReflectionRT, skyMatrix, NGP_EQ, GC_EQ } from './sky';
import { createStars, createPolarisMarker, POLARIS_EQ } from './stars';
import { createOcean } from './ocean';
import { createIce } from './ice';
import { createHighway, LANES, normaliseTractor, ROAD_Y, type TractorModel } from './truck';
import { gltfLoader, tameMaterials } from './gltf';
import { createProceduralBear, loadGLBBear, type Bear } from './bear';
import { createSnow } from './snow';
import { glowTexture, snowAtlas } from './textures';
import { detectTier, qualityFor, type Tier } from './quality';

export interface SceneState {
  chap: number; // camera chapter 0..6 (fractional)
  scroll: number; // page progress 0..1
  px: number; // pointer -1..1
  py: number;
  hor: number; // extra horizontal film offset (-1..1)
  day: number; // 0 night → 1 day
  snow: number; // 0..1 flake amount
  aur: number; // aurora intensity
}

export interface MountOptions {
  reduce?: boolean;
  snow?: number;
  aurora?: number;
  /**
   * GLB assets (meshopt + WebP). Procedural models render until these arrive, and stay if they fail.
   * `false` disables model loading entirely.
   */
  assets?: Partial<typeof DEFAULT_ASSETS> | false;
  /** Force a quality tier (QA / testing); auto-detected otherwise. */
  tier?: Tier;
  onReady?: () => void;
  onFallback?: (reason: string) => void;
}

export interface PolarScene {
  set(p: Partial<SceneState>): void;
  dispose(): void;
  readonly tier: Tier;
  /** Draw stats for QA (triangles, calls, memory). */
  info(): Record<string, number>;
}

const DEFAULT_ASSETS = {
  bear: '/assets/polar-bear.glb',
  bearLo: '/assets/polar-bear-lo.glb',
  truck: '/assets/truck-cascadia.glb',
  truckLo: '/assets/truck-cascadia-lo.glb',
};
// model-specific orientation fixes
const TRUCK_FRONT_POSITIVE = true;
const BEAR_FACING = 0;

type Key = { tx: number; ty: number; tz: number; az: number; el: number; dist: number; fo: number };
const quintic = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function chapterKeys(heroX: number, bear: THREE.Vector3): Key[] {
  const lz = LANES[0];
  return [
    { tx: 0, ty: 7, tz: -40, az: 0.05, el: 0.06, dist: 62, fo: 0 }, // 0 hero wide
    { tx: heroX - 2.4, ty: ROAD_Y + 1.9, tz: lz, az: 0.82, el: 0.1, dist: 11.5, fo: -0.16 }, // 1 cab close-up
    { tx: heroX - 11, ty: ROAD_Y + 1.6, tz: lz, az: 0.1, el: 0.07, dist: 33, fo: -0.1 }, // 2 full rig side
    { tx: heroX - 10, ty: ROAD_Y + 1, tz: lz, az: -0.55, el: 0.6, dist: 46, fo: 0 }, // 3 high rig
    { tx: 18, ty: 60, tz: -160, az: -0.32, el: -0.2, dist: 200, fo: 0 }, // 4 sky (aurora + Polaris)
    { tx: 60, ty: 140, tz: -210, az: -0.46, el: -0.42, dist: 250, fo: 0 }, // 5 deeper sky
    { tx: bear.x, ty: bear.y + 0.9, tz: bear.z, az: 0.62, el: 0.2, dist: 9.5, fo: -0.14 }, // 6 bear close-up
  ];
}

/** Give the main thread back between heavy build steps so page input/LCP never wait on WebGL setup. */
let markT = 0;
/** performance.measure per build step (visible in DevTools → Performance → Timings). */
const mark = (name: string) => {
  const now = performance.now();
  if (markT) performance.measure?.('polar:' + name, { start: markT, end: now });
  markT = now;
};

const yieldMain = () =>
  new Promise<void>((res) => {
    const sch = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
    if (sch?.yield) sch.yield().then(res);
    else setTimeout(res, 0);
  });

export async function mountPolarScene(canvas: HTMLCanvasElement, opts: MountOptions = {}): Promise<PolarScene> {
  markT = performance.now();
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false, stencil: false });
  } catch (e) {
    opts.onFallback?.('webgl');
    throw e;
  }
  const small = Math.min(window.innerWidth, window.innerHeight) < 700;
  const tier = opts.tier ?? detectTier(renderer.getContext());
  const Q = qualityFor(tier, small);
  const aniso = Math.min(tier === 2 ? 8 : 4, renderer.capabilities.getMaxAnisotropy());

  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const dprSteps = [Q.maxDpr, Math.min(Q.maxDpr, 1.25), 1, 0.85, 0.7].filter((v, i, a) => a.indexOf(v) === i);
  let dprIdx = 0;
  const deviceDpr = window.devicePixelRatio || 1;
  const currentDpr = () => Math.min(deviceDpr, dprSteps[dprIdx]);
  renderer.setPixelRatio(currentDpr());

  const scene = new THREE.Scene();
  const fogNight = new THREE.Color(0x061120), fogDay = new THREE.Color(0xa9c6dc);
  scene.fog = new THREE.Fog(0x061120, 60, 420);
  scene.background = new THREE.Color(0x020814);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2400);
  camera.filmGauge = 35;
  scene.add(camera);

  const glow = glowTexture();
  const atlas = snowAtlas(aniso);

  // sky, stars, Polaris
  mark('build-0');
  await yieldMain();
  const sky = createSky(Q.skyOctaves);
  scene.add(sky.mesh);
  const refl = createReflectionRT(Q.reflectSize[0], Q.reflectSize[1], sky.uniforms);
  mark('build-1');
  await yieldMain();
  const stars = createStars(Q.stars, Math.min(deviceDpr, Q.maxDpr));
  scene.add(stars.points);
  const polaris = createPolarisMarker(glow);
  scene.add(polaris.group);
  document.fonts?.ready.then(() => {
    const c = polaris.labelTex.image as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    g.clearRect(0, 0, c.width, c.height);
    g.font = '500 26px "JetBrains Mono", ui-monospace, monospace';
    g.fillStyle = 'rgba(234,246,255,.82)';
    g.textBaseline = 'middle';
    g.fillText('POLARIS  α UMi', 8, 32);
    polaris.labelTex.needsUpdate = true;
  });

  mark('build-2');
  await yieldMain();
  const ocean = createOcean(refl.rt.texture, tier === 0 ? 3 : 4);
  scene.add(ocean.mesh);

  // lighting
  const hemi = new THREE.HemisphereLight(0x9fd2ff, 0x061224, 0.4);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xbcd6ff, 0.9);
  key.position.set(-60, 80, 40);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7cf7c8, 0.6);
  rim.position.set(30, 40, -200);
  scene.add(rim);
  const fill = new THREE.PointLight(0x9fc8ff, 6, 40, 1.6);
  camera.add(fill);

  mark('build-3');
  await yieldMain();
  const ice = createIce(Q.physical, Q.floes, aniso);
  scene.add(ice.group);
  const beaconGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xff8a2a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  beaconGlow.scale.setScalar(3);
  ice.lamp.add(beaconGlow);

  mark('build-4');
  await yieldMain();
  const traffic = createHighway(Q.physical, aniso, glow, Q.trucks);
  scene.add(traffic.group);

  let bear: Bear = createProceduralBear();
  ice.slab.add(bear.object);

  mark('build-5');
  await yieldMain();
  const snow = createSnow(atlas, Q.snowFar, Q.snowNear);
  scene.add(snow.group);
  mark('build-snow');
  await yieldMain();

  // ---------- state ----------
  const S: SceneState = { chap: 0, scroll: 0, px: 0, py: 0, hor: 0, day: 0, snow: opts.snow ?? 1, aur: opts.aurora ?? 1.3 };
  const cur = { tx: 0, ty: 7, tz: -40, az: 0.05, el: 0.06, dist: 62, fo: 0, chap: 0, heroX: -26, day: 0, snow: S.snow, aur: S.aur, px: 0, py: 0 };
  let first = true;
  let snap = false; // jump straight to the target state (debug / reduced motion)
  const skyM = new THREE.Matrix4();
  const tmpV = new THREE.Vector3();
  const bearW = new THREE.Vector3();
  let w = 0, h = 0, viewH = 0;

  const resize = () => {
    const nw = window.innerWidth;
    const nh = Math.max(window.innerHeight, document.documentElement.clientHeight);
    // ignore small height jitters from mobile URL bars
    if (nw === w && Math.abs(nh - h) < 120 && !first) return;
    w = nw;
    h = nh;
    viewH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 52 : 40;
    camera.updateProjectionMatrix();
    if (reduce) renderOnce();
    // sky reflections on paint/chrome: high tier only, built when the page is idle
    if (tier === 2) {
      const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      const run = () => {
        if (disposed) return;
        makeEnv();
        mark('env');
        if (reduce) renderOnce();
      };
      if (ric) ric(run, { timeout: 4000 });
      else setTimeout(run, 1500);
    }
  };

  const reduce = !!opts.reduce;
  const clock = new THREE.Clock();
  let t = reduce ? 42 : 0;
  let frame = 0;
  let raf = 0;
  let disposed = false;
  let running = false;

  // FPS governor
  let acc = 0, accN = 0, lastAdjust = 0, skipOdd = false, skipToggle = false;
  const govern = (dt: number) => {
    acc += dt;
    accN++;
    if (accN < 45) return;
    const avg = acc / accN;
    acc = 0;
    accN = 0;
    if (t - lastAdjust < 1.5) return;
    if (avg > 0.024 && dprIdx < dprSteps.length - 1) {
      dprIdx++;
      renderer.setPixelRatio(currentDpr());
      renderer.setSize(w, h, false);
      snow.setCounts(Math.round(Q.snowFar * (1 - dprIdx * 0.15)), Math.round(Q.snowNear * (1 - dprIdx * 0.15)));
      lastAdjust = t;
    } else if (avg > 0.036 && dprIdx === dprSteps.length - 1) {
      skipOdd = true; // cap to ~30fps rather than stutter
      lastAdjust = t;
    } else if (avg < 0.0125 && dprIdx > 0 && t - lastAdjust > 5) {
      dprIdx--;
      renderer.setPixelRatio(currentDpr());
      renderer.setSize(w, h, false);
      lastAdjust = t;
    }
  };

  function update(dt: number) {
    const k = first || snap ? 1 : 1 - Math.exp(-dt * 2.6);
    const kf = first || snap ? 1 : 1 - Math.exp(-dt * 6);
    snap = false;
    cur.chap += (S.chap - cur.chap) * k;
    cur.heroX += (-26 + S.scroll * 52 - cur.heroX) * k;
    cur.day += (S.day - cur.day) * k;
    cur.snow += (S.snow - cur.snow) * k;
    cur.aur += (S.aur - cur.aur) * k;
    cur.px += (S.px - cur.px) * kf;
    cur.py += (S.py - cur.py) * kf;

    // sky rotation around Polaris
    const lst = (17.3 / 24) * Math.PI * 2 + t * 0.0015;
    skyMatrix(lst, skyM);
    sky.uniforms.uTime.value = t;
    sky.uniforms.uAur.value = cur.aur;
    sky.uniforms.uDay.value = cur.day;
    sky.uniforms.uNGP.value.copy(NGP_EQ).applyMatrix4(skyM);
    sky.uniforms.uGC.value.copy(GC_EQ).applyMatrix4(skyM);

    // camera chapter blend
    bearW.copy(bear.object.position);
    ice.slab.localToWorld(bearW);
    const keys = chapterKeys(cur.heroX, bearW);
    const c = Math.min(Math.max(cur.chap, 0), keys.length - 1);
    const i0 = Math.min(Math.floor(c), keys.length - 2);
    const f = quintic(c - i0);
    const A = keys[i0], B = keys[i0 + 1];
    const mix = (a: number, b: number) => a + (b - a) * f;
    const tx = mix(A.tx, B.tx), ty = mix(A.ty, B.ty), tz = mix(A.tz, B.tz);
    const az = mix(A.az, B.az) + cur.px * 0.035;
    const el = mix(A.el, B.el) + cur.py * 0.02;
    // interpolate distance geometrically so close-ups and wide shots blend evenly
    // portrait phones see far less horizontally: back the camera off so subjects stay framed
    const portraitFit = camera.aspect < 1 ? Math.min(1.8, 0.82 / Math.max(camera.aspect, 0.42)) : 1;
    const dist = Math.exp(mix(Math.log(A.dist), Math.log(B.dist))) * Math.max(1, portraitFit);
    const fo = mix(A.fo, B.fo) + S.hor * 0.15;
    camera.position.set(tx + dist * Math.sin(az) * Math.cos(el), ty + dist * Math.sin(el), tz + dist * Math.cos(az) * Math.cos(el));
    if (camera.position.y < 1.2) camera.position.y = 1.2;
    camera.lookAt(tx, ty, tz);
    const wideScreen = camera.aspect > 1.1;
    camera.filmOffset = wideScreen ? fo * camera.getFilmWidth() : 0;
    camera.updateProjectionMatrix();

    // camera-following layers
    sky.mesh.position.copy(camera.position);
    stars.points.matrix.copy(skyM).setPosition(camera.position);
    stars.points.matrixWorldNeedsUpdate = true;
    stars.uniforms.uTime.value = t;
    stars.uniforms.uVis.value = 1 - cur.day;
    tmpV.copy(POLARIS_EQ).applyMatrix4(skyM).multiplyScalar(950).add(camera.position);
    polaris.group.position.copy(tmpV);
    polaris.sprite.material.opacity = 0.55 * (1 - cur.day);
    polaris.label.material.opacity = 0.9 * (1 - cur.day);
    ocean.mesh.position.set(Math.round(camera.position.x / 50) * 50, 0, Math.round(camera.position.z / 50) * 50);
    ocean.uniforms.uTime.value = t;
    ocean.uniforms.uDay.value = cur.day;

    // night ⇄ day
    const d = cur.day;
    (scene.fog as THREE.Fog).color.copy(fogNight).lerp(fogDay, d);
    ocean.uniforms.uFog.value.copy((scene.fog as THREE.Fog).color);
    hemi.intensity = 0.4 + d * 1.2;
    key.intensity = 0.9 + d * 1.6;
    const pulse = 0.5 + 0.5 * Math.sin(t * 0.35) * Math.sin(t * 0.13 + 1);
    rim.intensity = (0.35 + 0.5 * pulse) * cur.aur * (1 - d);
    renderer.toneMappingExposure = 0.95 - d * 0.25;

    // actors
    const blink = ice.update(t);
    (beaconGlow.material as THREE.SpriteMaterial).opacity = 0.25 + blink * 0.9;
    traffic.update(t, dt, cur.heroX);
    bear.update(t, dt);

    const scale = (viewH * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    snow.update(t, camera.position, scale, cur.snow, d, 160 * renderer.getPixelRatio());
  }

  function renderOnce() {
    update(1 / 60);
    refl.render(renderer);
    renderer.render(scene, camera);
  }

  let firstFrameMarked = false;
  function loop() {
    if (disposed || !running) return;
    raf = requestAnimationFrame(loop);
    if (skipOdd) {
      skipToggle = !skipToggle;
      if (skipToggle) return;
    }
    const dt = Math.min(clock.getDelta(), 0.1);
    t += dt;
    update(dt);
    if (frame % (tier === 0 ? 5 : 3) === 0 || first) refl.render(renderer);
    renderer.render(scene, camera);
    if (first) {
      first = false;
      if (!firstFrameMarked) {
        firstFrameMarked = true;
        mark('first-frame');
      }
      opts.onReady?.();
    }
    frame++;
    govern(dt);
  }

  const start = () => {
    if (running || disposed || reduce) return;
    running = true;
    clock.getDelta();
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };
  const onVis = () => (document.hidden ? stop() : start());
  const onLost = (e: Event) => {
    e.preventDefault();
    stop();
    opts.onFallback?.('context-lost');
  };

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', onVis);
  canvas.addEventListener('webglcontextlost', onLost);

  // ---------- environment: PMREM of our own night sky, so paint/chrome/ice reflect the aurora ----------
  let envRT: THREE.WebGLRenderTarget | null = null;
  const makeEnv = () => {
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(sky.mesh.geometry, sky.mesh.material));
    const next = pm.fromScene(envScene, 0.04, 0.1, 2000);
    pm.dispose();
    envRT?.dispose();
    envRT = next;
    scene.environment = next.texture;
  };

  // ---------- GLB models: load after the first frame, smallest set on phones / weak GPUs ----------
  const A = opts.assets === false ? null : { ...DEFAULT_ASSETS, ...(opts.assets || {}) };
  const lite = tier === 0 || small;
  const saveData = !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const compileThen = async (obj: THREE.Object3D) => {
    if (typeof renderer.compileAsync === 'function') await renderer.compileAsync(obj, camera, scene).catch(() => undefined);
  };
  const loadTractor = async (url: string): Promise<TractorModel | null> => {
    try {
      const { load } = await gltfLoader();
      const gltf = await load(url);
      tameMaterials(gltf.scene, 1.6);
      gltf.scene.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o as THREE.Mesh).frustumCulled = true) : null));
      const model = normaliseTractor(gltf.scene, TRUCK_FRONT_POSITIVE);
      await compileThen(model.object);
      return model;
    } catch (e) {
      console.warn('[scene] truck model failed, keeping procedural cab', e);
      return null;
    }
  };
  const loadModels = async () => {
    if (!A || saveData) return;
    mark('pre-models');
    const truck = await loadTractor(lite ? A.truckLo : A.truck);
    mark('truck');
    if (disposed) return;
    if (truck) traffic.useModel(truck, lite ? 'all' : 'hero');
    const b = await loadGLBBear(lite ? A.bearLo : A.bear, { facing: BEAR_FACING, envIntensity: 1.2, startPhase: bear.phase });
    mark('bear');
    if (disposed) return b?.dispose();
    if (b) {
      await compileThen(b.object);
      ice.slab.remove(bear.object);
      bear.dispose();
      bear = b;
      ice.slab.add(b.object);
    }
    if (!lite && truck) {
      const lo = await loadTractor(A.truckLo);
      if (lo && !disposed) traffic.useModel(lo, 'traffic');
    }
    if (reduce) renderOnce();
  };

  // compile every program off the main thread first (KHR_parallel_shader_compile) so load never janks
  mark('build-final');
  update(1 / 60);
  const compileAll = async () => {
    if (typeof renderer.compileAsync === 'function') {
      await renderer.compileAsync(scene, camera).catch(() => undefined);
      // program variants depend on the active render target, so compile the reflection pass bound to its target
      renderer.setRenderTarget(refl.rt);
      const reflCompiled = renderer.compileAsync(refl.scene, refl.camera).catch(() => undefined);
      renderer.setRenderTarget(null);
      await reflCompiled;
    }
    // upload textures one by one so no single frame pays for all of them
    const textures = new Set<THREE.Texture>();
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      for (const mat of m ? (Array.isArray(m) ? m : [m]) : []) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) textures.add(v);
        const u = (mat as THREE.ShaderMaterial).uniforms;
        if (u) for (const k in u) if (u[k].value instanceof THREE.Texture) textures.add(u[k].value);
      }
    });
    for (const t of textures) {
      if (disposed) return;
      if (!(t as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) renderer.initTexture(t);
      await yieldMain();
    }
  };
  const compiled = compileAll();
  compiled.then(() => {
    if (disposed) return;
    mark('compile');
    // models stream in once the scene is already on screen
    setTimeout(() => !disposed && loadModels(), reduce ? 0 : 600);
    if (reduce) {
      first = true;
      renderOnce();
      first = false;
      opts.onReady?.();
    } else {
      start();
    }
  });

  return {
    tier,
    info: () => ({ ...renderer.info.render, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, dpr: renderer.getPixelRatio() }),
    set(p) {
      if ((p as { snap?: boolean }).snap || reduce) snap = true;
      Object.assign(S, p);
      if (reduce) renderOnce();
    },
    dispose() {
      disposed = true;
      stop();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
      canvas.removeEventListener('webglcontextlost', onLost);
      bear.dispose();
      ice.dispose();
      traffic.dispose();
      snow.dispose();
      refl.dispose();
      envRT?.dispose();
      sky.mesh.geometry.dispose();
      (sky.mesh.material as THREE.Material).dispose();
      stars.points.geometry.dispose();
      (stars.points.material as THREE.Material).dispose();
      polaris.labelTex.dispose();
      polaris.sprite.material.dispose();
      polaris.label.material.dispose();
      ocean.mesh.geometry.dispose();
      (ocean.mesh.material as THREE.Material).dispose();
      (beaconGlow.material as THREE.Material).dispose();
      glow.dispose();
      atlas.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
