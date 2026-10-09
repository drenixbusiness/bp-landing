'use client';

import { useEffect } from 'react';
import { SITE_CHAPTERS, sceneStore } from '@/lib/sceneStore';

/** Pages only choose an optional readability veil; the camera path is the same site-wide. */
export default function SceneConfig({ veil = 0 }: { veil?: number }) {
  const key = JSON.stringify({ chapters: SITE_CHAPTERS, veil });
  useEffect(() => {
    sceneStore.set(JSON.parse(key));
  }, [key]);
  return null;
}
