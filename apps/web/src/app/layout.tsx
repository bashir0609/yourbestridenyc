import type { Metadata, Viewport } from 'next';
import { Inter, Montserrat } from 'next/font/google';
import { Navbar } from '@/components/navigation';
import { Footer } from '@/components/footer';
import { getPublicConfig } from '@/lib/config';
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
  const title = settings.title ?? 'YourBestRide | Every journey deserves a little more';
  const description =
    settings.description ??
    'Explore YourBestRide transportation options for appointments, airport transfers, business travel, and private journeys. Plan your next ride.';
  return {
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
    title: { default: title, template: '%s | YourBestRide' },
    description,
    applicationName: 'YourBestRide',
    robots: siteUrl ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: { type: 'website', siteName: 'YourBestRide', title, description, locale: 'en_US' },
    twitter: { card: 'summary', title, description },
    icons: { icon: '/icon.svg' },
  };
}

export const viewport: Viewport = { themeColor: '#0B0B0B' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body id="top" className={`${inter.variable} ${montserrat.variable}`}>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
