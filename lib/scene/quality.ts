export type Tier = 0 | 1 | 2; // 0 = low, 1 = mid, 2 = high

export interface Quality {
  tier: Tier;
  maxDpr: number;
  stars: number;
  snowFar: number;
  snowNear: number;
  floes: number;
  trucks: number;
  physical: boolean;
  skyOctaves: number;
  reflectSize: [number, number];
}

type Nav = Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };

/** Rough device class from cheap signals; refined at runtime by the FPS governor. */
export function detectTier(gl?: WebGLRenderingContext | WebGL2RenderingContext | null): Tier {
  if (typeof navigator === 'undefined') return 1;
  const nav = navigator as Nav;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent) || matchMedia('(pointer: coarse)').matches;
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory ?? 8;
  const save = !!nav.connection?.saveData;
  let renderer = '';
  if (gl) {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
  }
  const weakGpu = /SwiftShader|llvmpipe|Software|Mali-4|Mali-T|Adreno \(TM\) [345]\d\d|PowerVR SGX|Intel\(R\) HD Graphics [2-5]\d{2,3}\b/i.test(renderer);
  if (save || weakGpu || cores <= 2 || mem <= 2) return 0;
  if (mobile) return cores >= 8 && mem >= 6 ? 1 : 0;
  if (cores <= 4 || mem <= 4 || /Intel/i.test(renderer)) return 1;
  return 2;
}

export function qualityFor(tier: Tier, small: boolean): Quality {
  const q: Quality[] = [
    { tier: 0, maxDpr: 1, stars: 7000, snowFar: 1600, snowNear: 420, floes: 30, trucks: 3, physical: false, skyOctaves: 3, reflectSize: [256, 64] },
    { tier: 1, maxDpr: 1.5, stars: 12000, snowFar: 3200, snowNear: 900, floes: 55, trucks: 4, physical: true, skyOctaves: 4, reflectSize: [384, 96] },
    { tier: 2, maxDpr: 1.75, stars: 22000, snowFar: 5200, snowNear: 1400, floes: 80, trucks: 6, physical: true, skyOctaves: 5, reflectSize: [512, 128] },
  ];
  const out = { ...q[tier] };
  if (small) {
    out.maxDpr = Math.min(out.maxDpr, 1.5);
    out.stars = Math.min(out.stars, 12000);
  }
  return out;
}
