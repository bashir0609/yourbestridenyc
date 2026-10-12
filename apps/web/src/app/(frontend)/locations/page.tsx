import type { Metadata } from 'next';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { getPublicConfig } from '@/lib/config';
import { getLocations } from '@/lib/cms/queries';
import {
  ContentEmptyState,
  DirectoryHero,
  LocationCard,
  SectionHeading,
} from '@/components/public-content';
import { TransportationInquiryForm } from '@/components/forms/TransportationInquiryForm';
import { TrackLink } from '@/components/analytics';

export const revalidate = 300;

export async function generateStaticParams() {
  return [{}];
}

async function getPageData() {
  const result = await getLocations();
  if (result.status === 'invalid' || result.status === 'unavailable') {
    throw new Error(`CMS request failed: ${result.status}`);
  }
  return result;
}

export async function generateMetadata(): Promise<Metadata> {
  const { siteUrl } = getPublicConfig();
  const canonical = siteUrl ? `${siteUrl}/locations` : undefined;

  return {
    title: 'Service Areas',
    description:
      'We provide premium transportation services across New York City and the surrounding areas. View our coverage and service details by location.',
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      title: 'Service Areas | YourBestRide',
      description:
        'We provide premium transportation services across New York City and the surrounding areas.',
    },
    twitter: {
      card: 'summary',
      title: 'Service Areas | YourBestRide',
      description:
        'We provide premium transportation services across New York City and the surrounding areas.',
    },
  };
}

export default async function LocationsPage() {
  const { items: locations, status } = await getPageData();

  return (
    <main className="interior-page content-directory" id="main-content">
      <DirectoryHero
        eyebrow="FROM HERE TO WHAT’S NEXT"
        title="Service Areas"
        description="Explore published service areas and review the transportation options associated with each location."
      />

      <section className="section locations-directory-section" aria-labelledby="coverage-heading">
        <Container>
          <SectionHeading
            eyebrow="YOUR ROUTE STARTS HERE"
            title="Explore our coverage"
            description="Select a published area to learn more. Contact us if your route is not listed."
          />
          {locations.length > 0 ? (
            <div className="public-card-grid public-location-grid">
              {locations.map((location) => (
                <LocationCard key={location.slug} location={location} />
              ))}
            </div>
          ) : (
            <ContentEmptyState
              label="service areas"
              status={status}
              actionHref="/contact"
              actionLabel="Ask About Your Route"
            />
          )}
        </Container>
      </section>

      <section className="section inquiry-section" aria-labelledby="inquiry-heading">
        <Container>
          <div className="inquiry-header">
            <p className="eyebrow">REQUEST A QUOTE</p>
            <h2 id="inquiry-heading">Tell us where you&apos;re going</h2>
            <p>Share your route and travel needs. We&apos;ll follow up with available options.</p>
          </div>
          <TransportationInquiryForm sourcePage="/locations" />
        </Container>
      </section>

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">READY TO RIDE?</p>
            <h2 id="cta-heading">Check Availability for Your Route</h2>
            <p>Arrange your journey through our trusted booking experience.</p>
          </div>
          <TrackLink
            href="/book"
            className="button nav-book"
            eventName="booking_click"
            eventParams={{ source_page: '/locations', button_location: 'footer_cta' }}
          >
            Book a Ride <Icon name="arrow" width={16} />
          </TrackLink>
        </Container>
      </section>
    </main>
  );
}
