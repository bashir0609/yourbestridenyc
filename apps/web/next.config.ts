import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';
import { siteOrigin } from './src/lib/config';

const mediaOrigin = siteOrigin(process.env.CMS_MEDIA_URL);
const media = mediaOrigin ? new URL(mediaOrigin) : undefined;

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    maximumRedirects: 0,
    remotePatterns: media
      ? [
          {
            protocol: 'https',
            hostname: media.hostname,
            port: media.port,
            pathname: '/media/**',
            search: '',
          },
        ]
      : [],
  },
  transpilePackages: ['@yourbestride/ui', '@yourbestride/types'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
