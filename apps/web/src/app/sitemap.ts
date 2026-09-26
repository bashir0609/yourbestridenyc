import type { MetadataRoute } from 'next';
import { getPublicConfig } from '@/lib/config';
import { getSitemapRecords } from '@/lib/cms/page-queries';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl } = getPublicConfig();
  if (!siteUrl) return [];

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl}/book`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/services`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/fleet`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/drivers`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${siteUrl}/locations`, changeFrequency: 'weekly', priority: 0.8 },
  ];

  try {
    const records = await getSitemapRecords();
    const dynamicRoutes: MetadataRoute.Sitemap = records.map((record) => ({
      url: `${siteUrl}${record.path}`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
      ...(record.updatedAt ? { lastModified: new Date(record.updatedAt) } : {}),
    }));
    return [...staticRoutes, ...dynamicRoutes];
  } catch {
    return staticRoutes;
  }
}
