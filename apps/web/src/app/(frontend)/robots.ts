import type { MetadataRoute } from 'next';
import { getPublicConfig } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = getPublicConfig();
  return siteUrl
    ? {
        rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/legal/'] },
        sitemap: `${siteUrl}/sitemap.xml`,
        host: siteUrl,
      }
    : { rules: { userAgent: '*', disallow: '/' } };
}
