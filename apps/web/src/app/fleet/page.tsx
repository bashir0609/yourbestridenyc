import type { Metadata } from 'next';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { getFleetDirectory } from '@/lib/cms/page-queries';
import { getBusinessConfig } from '@/lib/cms/queries';
import { getPublicConfig } from '@/lib/config';
import { CmsImage, CmsEmptyState } from '@/components/cms-content';

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
  const { bookingUrl } = await getBusinessConfig();

  return (
    <main className="interior-page" id="main-content">
      <section className="hero interior-hero" aria-labelledby="fleet-title">
        <Container>
          <div className="interior-intro">
            <p className="eyebrow">
              <span>Premium Transportation</span>
            </p>
            <h1 id="fleet-title">Our Fleet</h1>
            <p className="hero-description">
              Every vehicle in our fleet is maintained to the highest standards of comfort, safety,
              and presentation. Choose the perfect ride for your journey.
            </p>
          </div>
        </Container>
      </section>

      <section className="section fleet-section" aria-labelledby="fleet-grid-heading">
        <Container>
          <h2 id="fleet-grid-heading" className="section-heading">
            Available Vehicles
          </h2>
          {directory.items.length > 0 ? (
            <div className="fleet-grid">
              {directory.items.map((vehicle) => (
                <Link key={vehicle.slug} href={`/fleet/${vehicle.slug}`} className="fleet-card">
                  <div className="fleet-art">
                    {vehicle.image ? (
                      <CmsImage image={vehicle.image} />
                    ) : (
                      <div className="vehicle-art-wrapper">
                        <VehicleArt
                          type={
                            vehicle.category?.toLowerCase() === 'suv'
                              ? 'suv'
                              : vehicle.category?.toLowerCase() === 'van'
                                ? 'van'
                                : 'sedan'
                          }
                        />
                      </div>
                    )}
                    <div className="fleet-type">
                      <span>{vehicle.category ?? 'Vehicle'}</span>
                      {vehicle.passengerCapacity && (
                        <span className="capacity">
                          <Icon name="users" width={16} height={16} />
                          {vehicle.passengerCapacity} passengers
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="card-body">
                    <h3>{vehicle.title}</h3>
                    <p>{vehicle.summary}</p>
                    <div className="text-link">
                      View details <Icon name="arrow" width={16} height={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <CmsEmptyState label="fleet vehicles" status={directory.status} />
          )}
        </Container>
      </section>

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">Ready to Book?</p>
            <h2 id="cta-heading">Reserve Your Vehicle</h2>
            <p>Select your preferred vehicle when booking through our partner.</p>
            {bookingUrl && (
              <a
                href={bookingUrl}
                className="button nav-book"
                target="_blank"
                rel="noopener noreferrer"
              >
                Book Now <Icon name="arrow" width={16} />
              </a>
            )}
          </div>
        </Container>
      </section>
    </main>
  );
}

function VehicleArt({ type = 'sedan' }: { type?: 'sedan' | 'suv' | 'van' }) {
  const top =
    type === 'van'
      ? 'M108 103 122 45Q125 37 139 37H260Q276 37 286 54L320 102'
      : type === 'suv'
        ? 'M105 105 143 53Q150 44 166 44H244Q258 44 270 58L311 105'
        : 'M101 108 148 67Q160 57 180 57H231Q249 57 268 77L303 109';
  const windows =
    type === 'van'
      ? 'M129 49H181V93H119ZM191 49H246V93H191ZM256 50 285 93H256Z'
      : type === 'suv'
        ? 'm149 58-30 36h63V56h-24ZM193 56v38h91l-26-31q-6-7-16-7Z'
        : 'm152 76-31 22h68V68h-13q-12 0-24 8ZM200 68v30h80l-23-20q-11-10-27-10Z';
  return (
    <svg
      viewBox="0 0 440 210"
      role="img"
      aria-label={`Illustrative ${type} silhouette, not an actual fleet vehicle`}
      className="vehicle-art"
    >
      <ellipse cx="221" cy="170" rx="185" ry="12" fill="#000" opacity=".09" />
      <path d={top} fill="#292d30" stroke="#777" strokeWidth="1.5" />
      <path d={windows} fill="#9faeaf" opacity=".7" />
      <path
        d="M47 110q2-7 22-8h30l26 4h180l39-3q30 1 44 16l12 28q2 11-9 14H47q-11-4-8-15Z"
        fill="#292d30"
        stroke="#777"
        strokeWidth="1.5"
      />
      <path
        d="M53 126h60l16 6h204l46-9M147 110l-1 41m102-41 1 41m-86-33h18m84 0h18"
        stroke="#727777"
        fill="none"
      />
      <path d="m43 132 45 2-7 9H41m341-13-28 3 4 10h31" fill="#e8d29a" />
      <path d="M109 160h198" stroke="#afafb0" strokeWidth="3" />
      {[105, 324].map((x) => (
        <g key={x}>
          <circle cx={x} cy="154" r="29" fill="#101112" />
          <circle cx={x} cy="154" r="20" fill="#a9adae" />
          <circle cx={x} cy="154" r="15" fill="#34383b" />
          <path
            d={`M${x} 138v32m-16-16h32m-27-11 22 22m-22 0 22-22`}
            stroke="#a9adae"
            strokeWidth="3"
          />
          <circle cx={x} cy="154" r="5" fill="#bfc1c1" />
        </g>
      ))}
    </svg>
  );
}
