import type { Metadata } from 'next';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import Link from 'next/link';

import { getPublicConfig } from '@/lib/config';
import { getLocations } from '@/lib/cms/queries';
import { CmsEmptyState } from '@/components/cms-content';
import type { CoverageArea } from '@/lib/cms/types';
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
      'We provide premium transportation services across New York City and the surrounding areas. View our coverage map and service details by location.',
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
    <main className="interior-page" id="main-content">
      <section className="hero interior-hero" aria-labelledby="locations-title">
        <Container>
          <div className="interior-intro">
            <p className="eyebrow">
              <span>Coverage Areas</span>
            </p>
            <h1 id="locations-title">Service Areas</h1>
            <p className="hero-description">
              We proudly serve clients throughout New York City and the greater metropolitan area.
              Select a location to learn more about our services in your area.
            </p>
          </div>
        </Container>
      </section>

      <section className="section" aria-labelledby="coverage-heading">
        <Container>
          <h2 id="coverage-heading" className="section-heading">
            Our Coverage
          </h2>
          <div className="coverage-grid">
            {locations.length > 0 ? (
              locations.map((location: CoverageArea) => (
                <Link
                  key={location.slug}
                  href={`/locations/${location.slug}`}
                  className="coverage-card"
                >
                  <div className="coverage-map">
                    <svg viewBox="0 0 200 200" aria-hidden="true">
                      <circle
                        cx="100"
                        cy="100"
                        r="90"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        opacity="0.3"
                      />
                      <circle cx="100" cy="100" r="60" fill="currentColor" opacity="0.15" />
                      <circle cx="100" cy="100" r="8" fill="currentColor" />
                    </svg>
                  </div>
                  <div className="coverage-info">
                    <h3>{location.title}</h3>
                    <p>{location.summary}</p>
                    <div className="text-link">
                      View details <Icon name="arrow" width={16} height={16} />
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <CmsEmptyState label="coverage areas" status={status} />
            )}
          </div>
        </Container>
      </section>

      <section className="section inquiry-section" aria-labelledby="inquiry-heading">
        <Container>
          <div className="inquiry-header">
            <p className="eyebrow">REQUEST A QUOTE</p>
            <h2 id="inquiry-heading" className="section-heading">
              Get a Personalized Quote
            </h2>
            <p>
              Tell us about your route and travel needs. We&apos;ll get back to you with
              availability and pricing.
            </p>
          </div>
          <TransportationInquiryForm sourcePage="/locations" />
        </Container>
      </section>

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">Ready to Book?</p>
            <h2 id="cta-heading">Check Availability in Your Area</h2>
            <p>Our team is ready to serve you wherever you are in the NYC metro area.</p>
            <TrackLink
              href="/book"
              className="button nav-book"
              eventName="booking_click"
              eventParams={{ source_page: '/locations', button_location: 'footer_cta' }}
            >
              Book Now <Icon name="arrow" width={16} />
            </TrackLink>
          </div>
        </Container>
      </section>
    </main>
  );
}
