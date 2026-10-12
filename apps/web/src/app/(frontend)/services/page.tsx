import type { Metadata } from 'next';
import { Container } from '@/ui';
import { getPublicConfig } from '@/lib/config';
import { getServiceDirectory } from '@/lib/cms/page-queries';
import {
  ContentEmptyState,
  DirectoryHero,
  SectionHeading,
  ServiceCard,
} from '@/components/public-content';

export const revalidate = 300;

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
    <main className="interior-page content-directory" id="main-content">
      <DirectoryHero
        eyebrow="MADE FOR YOUR PLANS"
        title="Transportation Services"
        description="Explore published transportation services and choose the journey that matches your plans."
      />

      <section className="section services-section" aria-labelledby="services-grid-heading">
        <Container>
          <SectionHeading
            eyebrow="THOUGHTFUL TRANSPORTATION"
            title="Explore our services"
            description="Each published service includes approved details to help you plan with confidence."
          />
          {directory.items.length > 0 ? (
            <div className="public-card-grid public-service-grid">
              {directory.items.map((service) => (
                <ServiceCard key={service.slug} service={service} />
              ))}
            </div>
          ) : (
            <ContentEmptyState
              label="transportation services"
              status={directory.status}
              actionHref="/#contact"
              actionLabel="Contact Your Best Ride"
            />
          )}
        </Container>
      </section>
    </main>
  );
}
