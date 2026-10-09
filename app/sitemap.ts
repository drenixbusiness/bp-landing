import type { MetadataRoute } from 'next';

const BASE = 'https://bipolar-bear.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/service', '/owner-operators', '/apply-now', '/catalog', '/privacy-policy'].map((p) => ({
    url: `${BASE}${p}`,
    changeFrequency: 'monthly',
    priority: p === '' ? 1 : 0.7,
  }));
}
