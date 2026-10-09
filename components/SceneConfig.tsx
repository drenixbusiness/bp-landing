'use client';

import { useEffect } from 'react';
import { sceneStore, type PageSceneConfig } from '@/lib/sceneStore';

export default function SceneConfig(props: PageSceneConfig) {
  const key = JSON.stringify(props);
  useEffect(() => {
    sceneStore.set(JSON.parse(key));
  }, [key]);
  return null;
}
