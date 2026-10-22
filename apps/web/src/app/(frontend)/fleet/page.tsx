import type { Metadata } from 'next';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { getFleetDirectory } from '@/lib/cms/page-queries';
import { getPublicConfig } from '@/lib/config';
import {
  ContentEmptyState,
  DirectoryHero,
  FleetCard,
  SectionHeading,
} from '@/components/public-content';
import { TransportationInquiryForm } from '@/components/forms/TransportationInquiryForm';
import { TrackLink } from '@/components/analytics';

export const revalidate = 300;

export async function generateStaticParams() {
  return [{ page: '1' }];
}

async function getPageData(page = 1) {
  const result = await getFleetDirectory(page);
  if (result.status === 'invalid' || result.status === 'unavailable') {
    throw new Error(`CMS request failed: ${result.status}`);
  }
  return result;
}

export async function generateMetadata(): Promise<Metadata> {
  const { siteUrl } = getPublicConfig();
  const canonical = siteUrl ? `${siteUrl}/fleet` : undefined;

  return {
    title: 'Our Fleet',
    description:
      'Explore our premium fleet of luxury vehicles for medical transportation, airport transfers, corporate travel, and private journeys.',
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      title: 'Our Fleet | YourBestRide',
      description:
        'Explore our premium fleet of luxury vehicles for medical transportation, airport transfers, corporate travel, and private journeys.',
    },
    twitter: {
      card: 'summary',
      title: 'Our Fleet | YourBestRide',
      description: 'Explore our premium fleet of luxury vehicles.',
    },
  };
}

export default async function FleetPage() {
  const directory = await getPageData(1);

  return (
    <main className="interior-page content-directory" id="main-content">
      <DirectoryHero
        eyebrow="PREMIUM TRANSPORTATION"
        title="Our Fleet"
        description="Explore published vehicle options and review verified passenger and luggage information before arranging your journey."
      />

      <section className="section fleet-section" aria-labelledby="fleet-grid-heading">
        <Container>
          <SectionHeading
            eyebrow="ROOM FOR YOUR JOURNEY"
            title="Available vehicles"
            description="Choose a vehicle to see its published details, amenities, and photographs."
          />
          {directory.items.length > 0 ? (
            <div className="public-card-grid public-fleet-grid">
              {directory.items.map((vehicle) => (
                <FleetCard key={vehicle.slug} vehicle={vehicle} />
              ))}
            </div>
          ) : (
            <ContentEmptyState
              label="fleet vehicles"
              status={directory.status}
              actionHref="/book"
              actionLabel="Ask About Vehicle Options"
            />
          )}
        </Container>
      </section>

      <section className="section inquiry-section" id="fleet-inquiry" aria-labelledby="inquiry-heading">
        <Container>
          <div className="inquiry-header">
            <p className="eyebrow">REQUEST A QUOTE</p>
            <h2 id="inquiry-heading">Tell us about your journey</h2>
            <p>
              Share your trip details and preferred vehicle. We&apos;ll follow up with available
              options.
            </p>
          </div>
          <TransportationInquiryForm sourcePage="/fleet" />
        </Container>
      </section>

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">READY TO RIDE?</p>
            <h2 id="cta-heading">Reserve Your Ride</h2>
            <p>Select your preferred vehicle when booking through our partner.</p>
          </div>
          <TrackLink
            href="/book"
            className="button nav-book"
            eventName="booking_click"
            eventParams={{ source_page: '/fleet', button_location: 'footer_cta' }}
          >
            Book a Ride <Icon name="arrow" width={16} />
          </TrackLink>
        </Container>
      </section>
    </main>
  );
}
