import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

let loaderP: Promise<{ load(url: string): Promise<GLTF> }> | null = null;

/** One shared GLTFLoader with the meshopt decoder, imported lazily. */
export function gltfLoader() {
  if (!loaderP) {
    loaderP = Promise.all([import('three/examples/jsm/loaders/GLTFLoader.js'), import('three/examples/jsm/libs/meshopt_decoder.module.js')]).then(
      ([{ GLTFLoader }, { MeshoptDecoder }]) => {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(MeshoptDecoder);
        return { load: (url: string) => loader.loadAsync(url) };
      },
    );
  }
  return loaderP;
}

/**
 * Make imported PBR materials cheap and night-friendly:
 * no transmission pass (it re-renders the whole scene), tinted glass instead.
 */
export function tameMaterials(root: THREE.Object3D, envIntensity: number) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats as THREE.MeshPhysicalMaterial[]) {
      if (!m || !('envMapIntensity' in m)) continue;
      m.envMapIntensity = envIntensity;
      if (m.transmission > 0) {
        m.transmission = 0;
        m.transparent = true;
        m.opacity = 0.55;
        m.color?.set('#0e1e2e');
        m.roughness = 0.05;
        m.metalness = 0.6;
        m.depthWrite = false;
      }
      if (m.map) m.map.anisotropy = 4;
    }
  });
}

export function disposeObject(root: THREE.Object3D) {
  const seen = new Set<unknown>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (!seen.has(mesh.geometry)) {
      seen.add(mesh.geometry);
      mesh.geometry.dispose();
    }
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (seen.has(m)) continue;
      seen.add(m);
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    }
  });
}
