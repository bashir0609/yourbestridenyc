import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { Navbar } from '@/components/navigation';
import { Footer } from '@/components/footer';
import {
  GoogleAnalytics,
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from '@/components/analytics';
import { getPublicConfig } from '@/lib/config';
import { localBusinessJsonLd, OFFICIAL_BUSINESS } from '@/lib/business-info';
import { getSiteSettings } from '@/lib/cms/queries';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const { siteUrl } = getPublicConfig();
  const settings = await getSiteSettings();
  const title =
    settings.title ?? `${OFFICIAL_BUSINESS.name} | Every journey deserves a little more`;
  const description =
    settings.description ??
    'Explore YourBestRide transportation options for appointments, airport transfers, business travel, and private journeys. Plan your next ride.';
  return {
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
    title: { default: title, template: '%s | YourBestRide' },
    description,
    applicationName: OFFICIAL_BUSINESS.name,
    robots: siteUrl ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: OFFICIAL_BUSINESS.name,
      title,
      description,
      locale: 'en_US',
    },
    twitter: { card: 'summary', title, description },
    icons: { icon: '/icon.svg' },
  };
}

export const viewport: Viewport = { themeColor: '#0B0B0B' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { siteUrl } = getPublicConfig();
  const jsonLd = JSON.stringify(localBusinessJsonLd(siteUrl)).replaceAll('<', '\\u003c');
  return (
    <html lang="en">
      <head>
        <GoogleTagManager />
      </head>
      <body id="top" className={`${inter.variable} ${montserrat.variable}`}>
        <GoogleTagManagerNoScript />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Navbar />
        {children}
        <Footer />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
