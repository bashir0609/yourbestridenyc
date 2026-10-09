import type { Metadata } from 'next';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { getDriverDirectory } from '@/lib/cms/page-queries';

import { getPublicConfig } from '@/lib/config';
import { CmsImage, CmsEmptyState } from '@/components/cms-content';
import { DriverApplicationForm } from '@/components/forms/DriverApplicationForm';
import { TrackLink } from '@/components/analytics';

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
    <main className="interior-page" id="main-content">
      <section className="hero interior-hero" aria-labelledby="drivers-title">
        <Container>
          <div className="interior-intro">
            <p className="eyebrow">
              <span>Our People</span>
            </p>
            <h1 id="drivers-title">Our Drivers</h1>
            <p className="hero-description">
              Every driver on our team is carefully vetted, professionally trained, and committed to
              providing the highest standard of service. Get to know the people behind the wheel.
            </p>
          </div>
        </Container>
      </section>

      <section className="section people-section" aria-labelledby="drivers-grid-heading">
        <Container>
          <h2 id="drivers-grid-heading" className="section-heading">
            Meet the Team
          </h2>
          {directory.items.length > 0 ? (
            <div className="driver-grid">
              {directory.items.map((driver) => (
                <Link
                  key={driver.slug}
                  href={`/drivers/${driver.slug}`}
                  className="driver-card-link"
                >
                  <div className="driver-card">
                    {driver.image ? (
                      <CmsImage image={driver.image} />
                    ) : (
                      <div className="profile-art">
                        <Icon name="user" width={44} height={44} />
                        <span>TEAM PROFILE · PHOTO NOT PROVIDED</span>
                      </div>
                    )}
                    <div className="card-body">
                      <h3>{driver.name}</h3>
                      <p>{driver.summary}</p>
                      <div className="text-link">
                        View profile <Icon name="arrow" width={16} height={16} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <CmsEmptyState label="driver profiles" status={directory.status} />
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
