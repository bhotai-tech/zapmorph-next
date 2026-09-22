import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { CONVERTERS } from '@/lib/converters/catalog';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = [
    { path: '', priority: 1 },
    { path: '/converters', priority: 0.9 },
    { path: '/pricing', priority: 0.8 },
    { path: '/terms', priority: 0.2 },
    { path: '/privacy', priority: 0.2 },
    { path: '/refund-policy', priority: 0.2 },
  ];
  return [
    ...staticRoutes.map(({ path, priority }) => ({
      url: `${siteConfig.url}${path}`,
      lastModified: now,
      priority,
    })),
    ...CONVERTERS.map((converter) => ({
      url: `${siteConfig.url}/convert/${converter.slug}`,
      lastModified: now,
      priority: converter.popular ? 0.9 : 0.7,
    })),
  ];
}
