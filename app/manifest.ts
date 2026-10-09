import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bipolar Bear Enterprises LLC',
    short_name: 'Bipolar Bear',
    description: 'Nationwide freight solutions — dispatch, logbook, billing & factoring, fuel and insurance.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020814',
    theme_color: '#020814',
    icons: [
      { src: '/icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
