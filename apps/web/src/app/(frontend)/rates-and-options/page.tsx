import type { Metadata } from 'next';
import { Container } from '@/ui';
import { DirectoryHero } from '@/components/public-content';
import { getRatesAndOptionsContent } from '@/lib/cms/pricing-queries';
import { getPublicConfig } from '@/lib/config';
import { TransportationInquiryForm } from '@/components/forms/TransportationInquiryForm';
import { RatesAndOptionsTabs } from '@/components/rates-and-options/RatesAndOptionsTabs';

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { siteUrl } = getPublicConfig();
  const canonical = siteUrl ? `${siteUrl}/rates-and-options` : undefined;

  return {
    title: 'Rates & Options | Transparent Chauffeured Transportation Pricing',
    description:
      'Compare transparent luxury chauffeured transportation rates across NYC airports, hourly charters, mileage options, and executive vehicle classes.',
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      title: 'Rates & Options | YourBestRide Chauffeured Transportation',
      description:
        'Compare transparent luxury chauffeured transportation rates across NYC airports, hourly charters, mileage options, and executive vehicle classes.',
    },
    twitter: {
      card: 'summary',
      title: 'Rates & Options | YourBestRide',
      description:
        'Explore transparent luxury chauffeured transportation rates and vehicle options.',
    },
  };
}

interface RatesAndOptionsPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function RatesAndOptionsPage({ searchParams }: RatesAndOptionsPageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const rawLocation =
    typeof resolvedParams.location === 'string'
      ? resolvedParams.location
      : Array.isArray(resolvedParams.location)
        ? resolvedParams.location[0]
        : undefined;
  const rawTab =
    typeof resolvedParams.tab === 'string'
      ? resolvedParams.tab
      : Array.isArray(resolvedParams.tab)
        ? resolvedParams.tab[0]
        : undefined;
  const rawVehicleClass =
    typeof resolvedParams.vehicleClass === 'string'
      ? resolvedParams.vehicleClass
      : Array.isArray(resolvedParams.vehicleClass)
        ? resolvedParams.vehicleClass[0]
        : undefined;

  const content = await getRatesAndOptionsContent();

  return (
    <main className="interior-page rates-and-options-page" id="main-content">
      <DirectoryHero
        eyebrow="TRANSPARENT COMMERCIAL TARIFFS"
        title="Rates & Options"
        description="Review published airport flat rates, hourly charter benchmarks, and standardized vehicle class options across the New York metropolitan region."
      />

      <section className="section rates-section" aria-labelledby="rates-heading">
        <Container>
          <RatesAndOptionsTabs
            vehicleClasses={content.vehicleClasses}
            fixedRoutes={content.fixedRoutes}
            hourlyCharters={content.hourlyCharters}
            mileagePolicies={content.mileagePolicies}
            applicableFees={content.applicableFees}
            settings={content.settings}
            initialTab={rawTab}
            initialLocation={rawLocation}
            initialVehicleClass={rawVehicleClass}
          />
        </Container>
      </section>

      {/* Quote Inquiry Section */}
      <section
        className="section inquiry-section"
        id="rates-inquiry"
        aria-labelledby="inquiry-heading"
      >
        <Container>
          <div className="inquiry-header">
            <p className="eyebrow">CUSTOM QUOTATION</p>
            <h2 id="inquiry-heading">Request a custom rate or corporate itinerary</h2>
            <p>
              Have a multi-vehicle itinerary, regional trip, or bespoke corporate requirement? Share
              your trip details and our team will provide a tailored quote.
            </p>
          </div>
          <TransportationInquiryForm sourcePage="/rates-and-options" />
        </Container>
      </section>
    </main>
  );
}
