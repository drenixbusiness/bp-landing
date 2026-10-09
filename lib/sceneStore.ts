/** Page → scene configuration. Mutated by <SceneConfig>, read by <SceneHost> every scroll tick. */
export interface PageSceneConfig {
  /** Chapter values the page walks through as scroll progress goes 0 → 1 (piecewise linear). */
  chapters: number[];
  /** Optional selector: map chapters to these sections instead of uniform scroll. */
  sections?: string;
  /** Extra dark veil over the scene (0..1). */
  veil?: number;
}

type Listener = (c: PageSceneConfig) => void;

let config: PageSceneConfig = { chapters: [0.5, 6.5] };
const listeners = new Set<Listener>();

export const sceneStore = {
  get: () => config,
  set(c: PageSceneConfig) {
    config = c;
    listeners.forEach((l) => l(c));
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Piecewise-linear lookup of a chapter list at progress p ∈ [0,1]. */
export function chapterAt(list: number[], p: number) {
  if (list.length === 1) return list[0];
  const x = Math.min(Math.max(p, 0), 1) * (list.length - 1);
  const i = Math.min(Math.floor(x), list.length - 2);
  return list[i] + (list[i + 1] - list[i]) * (x - i);
}
