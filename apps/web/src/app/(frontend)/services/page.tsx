import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, Container } from '@/ui';
import { CmsEmptyState, CmsImage } from '@/components/cms-content';
import { Icon } from '@/components/icon';
import { getPublicConfig } from '@/lib/config';
import { getServiceDirectory } from '@/lib/cms/page-queries';

async function getPageData() {
  const result = await getServiceDirectory(1);
  if (result.status === 'invalid' || result.status === 'unavailable') {
    throw new Error(`CMS request failed: ${result.status}`);
  }
  return result;
}

export function generateMetadata(): Metadata {
  const { siteUrl } = getPublicConfig();
  const canonical = siteUrl ? `${siteUrl}/services` : undefined;
  const description =
    'Explore transportation services available from YourBestRide for appointments, airport travel, corporate needs, and private journeys.';

  return {
    title: 'Transportation Services',
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      title: 'Transportation Services | YourBestRide',
      description,
      ...(canonical ? { url: canonical } : {}),
    },
    twitter: {
      card: 'summary',
      title: 'Transportation Services | YourBestRide',
      description,
    },
  };
}

export default async function ServicesPage() {
  const directory = await getPageData();

  return (
    <main className="interior-page" id="main-content">
      <section className="hero interior-hero" aria-labelledby="services-page-title">
        <Container>
          <div className="interior-intro">
            <p className="eyebrow">
              <span>Premium Transportation</span>
            </p>
            <h1 id="services-page-title">Transportation Services</h1>
            <p className="hero-description">
              Explore our published transportation services and choose the journey that matches your
              plans.
            </p>
          </div>
        </Container>
      </section>

      <section className="section services-section" aria-labelledby="services-grid-heading">
        <Container>
          <h2 id="services-grid-heading" className="section-heading">
            Explore Our Services
          </h2>
          {directory.items.length > 0 ? (
            <div className="service-grid">
              {directory.items.map((service, index) => (
                <Card key={service.slug} className="service-card">
                  {service.image && <CmsImage image={service.image} />}
                  <div className="service-card-top">
                    <span className="icon-tile" aria-hidden="true">
                      <Icon name="private" width={25} height={25} />
                    </span>
                    <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.summary}</p>
                  <Link href={`/services/${service.slug}`} className="text-link">
                    View service <Icon name="arrow" width={18} />
                  </Link>
                </Card>
              ))}
            </div>
          ) : (
            <CmsEmptyState label="services" status={directory.status} />
          )}
        </Container>
      </section>
    </main>
  );
}
