'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { chapterAt, sceneStore } from '@/lib/sceneStore';
import type { PolarScene } from '@/lib/scene';

const NO_SCENE = ['/catalog'];

/** True when WebGL is missing or runs on a CPU rasteriser (SwiftShader, llvmpipe, Microsoft Basic Render). */
function softwareGL() {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(name);
  } catch {
    return true;
  }
}

function progress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? window.scrollY / max : 0;
}

/** Progress through a list of sections: index of the section crossing mid-screen + fraction through it. */
function sectionProgress(selector: string, count: number) {
  const els = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (!els.length) return progress();
  const mid = window.innerHeight * 0.5;
  let idx = 0, frac = 0;
  for (let i = 0; i < els.length; i++) {
    const r = els[i].getBoundingClientRect();
    if (r.top <= mid) {
      idx = i;
      frac = Math.min(1, Math.max(0, (mid - r.top) / Math.max(r.height, 1)));
    }
  }
  const n = Math.min(els.length, count);
  return n > 1 ? Math.min(1, (idx + frac * 0.6) / (n - 1)) : 0;
}

export default function SceneHost() {
  const pathname = usePathname();
  const enabled = !NO_SCENE.includes(pathname);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [veil, setVeil] = useState(sceneStore.get().veil ?? 0);

  useEffect(() => {
    const off = sceneStore.subscribe((c) => setVeil(c.veil ?? 0));
    return () => {
      off();
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let scene: PolarScene | null = null;
    let cancelled = false;
    let raf = 0;

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const push = () => {
      raf = 0;
      if (!scene) return;
      const c = sceneStore.get();
      const p = c.sections ? sectionProgress(c.sections, c.chapters.length) : progress();
      scene.set({ chap: chapterAt(c.chapters, p), scroll: progress() });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(push);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !scene) return;
      scene.set({ px: (e.clientX / window.innerWidth) * 2 - 1, py: -((e.clientY / window.innerHeight) * 2 - 1) });
    };
    const unsub = sceneStore.subscribe(() => onScroll());

    const boot = async () => {
      try {
        const forced = new URLSearchParams(location.search).get('scene-tier');
        // no GPU (software rasteriser) → keep the CSS night sky instead of a slideshow
        if (!forced && softwareGL()) return;
        const { mountPolarScene } = await import('@/lib/scene');
        if (cancelled) return;
        const mounted = await mountPolarScene(canvas, {
          reduce,
          tier: forced === '0' || forced === '1' || forced === '2' ? (Number(forced) as 0 | 1 | 2) : undefined,
          onReady: () => !cancelled && setReady(true),
          onFallback: () => !cancelled && setReady(false),
        });
        if (cancelled) {
          mounted.dispose();
          return;
        }
        scene = mounted;
        document.documentElement.dataset.sceneTier = String(scene.tier);
        if (location.search.includes('scene-debug')) (window as Window & { __polar?: PolarScene }).__polar = scene;
        push();
      } catch {
        setReady(false); // CSS night-sky fallback stays visible
      }
    };
    // let the page load, paint and hydrate first, then build the scene when the main thread is idle
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    const hasRic = typeof w.requestIdleCallback === 'function';
    let idle = 0;
    const schedule = () => {
      idle = hasRic ? w.requestIdleCallback!(() => boot(), { timeout: 1500 }) : window.setTimeout(boot, 300);
    };
    if (document.readyState === 'complete') schedule();
    else window.addEventListener('load', schedule, { once: true });

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    return () => {
      cancelled = true;
      window.removeEventListener('load', schedule);
      if (hasRic) w.cancelIdleCallback?.(idle);
      else clearTimeout(idle);
      cancelAnimationFrame(raf);
      unsub();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onPointer);
      scene?.dispose();
      setReady(false);
    };
  }, [enabled]);

  if (!enabled) return <div className="scene-static" aria-hidden="true" />;
  return (
    <div className="scene" aria-hidden="true">
      <div className="scene-fallback" />
      <canvas ref={canvasRef} className={`scene-canvas${ready ? ' is-ready' : ''}`} />
      <div className="scene-veil" style={{ opacity: veil }} />
    </div>
  );
}
