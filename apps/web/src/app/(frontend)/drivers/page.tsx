import type { Metadata } from 'next';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { getDriverDirectory } from '@/lib/cms/page-queries';

import { getPublicConfig } from '@/lib/config';
import {
  ContentEmptyState,
  DirectoryHero,
  DriverCard,
  SectionHeading,
} from '@/components/public-content';
import { DriverApplicationForm } from '@/components/forms/DriverApplicationForm';
import { TrackLink } from '@/components/analytics';

export const revalidate = 300;

export async function generateStaticParams() {
  return [{ page: '1' }];
}

async function getPageData(page = 1) {
  const result = await getDriverDirectory(page);
  if (result.status === 'invalid' || result.status === 'unavailable') {
    throw new Error(`CMS request failed: ${result.status}`);
  }
  return result;
}

export async function generateMetadata(): Promise<Metadata> {
  const { siteUrl } = getPublicConfig();
  const canonical = siteUrl ? `${siteUrl}/drivers` : undefined;

  return {
    title: 'Our Drivers',
    description:
      'Meet our professional drivers — experienced, multilingual, and dedicated to your safety and comfort.',
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      title: 'Our Drivers | YourBestRide',
      description:
        'Meet our professional drivers — experienced, multilingual, and dedicated to your safety and comfort.',
    },
    twitter: {
      card: 'summary',
      title: 'Our Drivers | YourBestRide',
      description:
        'Meet our professional drivers — experienced, multilingual, and dedicated to your safety and comfort.',
    },
  };
}

export default async function DriversPage() {
  const directory = await getPageData(1);

  return (
    <main className="interior-page content-directory" id="main-content">
      <DirectoryHero
        eyebrow="OUR PEOPLE"
        title="Our Drivers"
        description="Meet the approved professional profiles published by Your Best Ride and get to know the people behind the journey."
      />

      <section className="section people-section" aria-labelledby="drivers-grid-heading">
        <Container>
          <SectionHeading
            eyebrow="THE PEOPLE BEHIND THE JOURNEY"
            title="Meet the team"
            description="Only published, website-approved driver profiles appear here."
          />
          {directory.items.length > 0 ? (
            <div className="public-card-grid public-driver-grid">
              {directory.items.map((driver) => (
                <DriverCard key={driver.slug} driver={driver} />
              ))}
            </div>
          ) : (
            <ContentEmptyState
              label="driver profiles"
              status={directory.status}
              actionHref="/book"
              actionLabel="Plan Your Ride"
            />
          )}
        </Container>
      </section>

      <section className="section application-section" aria-labelledby="application-heading">
        <Container>
          <div className="application-header">
            <p className="eyebrow">JOIN OUR TEAM</p>
            <h2 id="application-heading" className="section-heading">
              Become a Driver with YourBestRide
            </h2>
            <p>
              We&apos;re always looking for professional drivers who share our commitment to
              excellence. Submit your application for review.
            </p>
          </div>
          <DriverApplicationForm sourcePage="/drivers" />
        </Container>
      </section>

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">Ready to Book?</p>
            <h2 id="cta-heading">Plan Your Journey</h2>
            <p>
              Our professional drivers are ready to provide you with a premium transportation
              experience.
            </p>
            <TrackLink
              href="/book"
              className="button nav-book"
              eventName="booking_click"
              eventParams={{ source_page: '/drivers', button_location: 'footer_cta' }}
            >
              Book Now <Icon name="arrow" width={16} />
            </TrackLink>
          </div>
        </Container>
      </section>
    </main>
  );
}
