import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { getLocationPage, getLocationServices, getSitemapRecords } from '@/lib/cms/page-queries';
import { getBusinessConfig } from '@/lib/cms/queries';
import { getPublicConfig } from '@/lib/config';

export async function generateStaticParams() {
  const records = await getSitemapRecords();
  const locationRecords = records.filter((r) => r.path.startsWith('/locations/'));
  return locationRecords.map((r) => ({ slug: r.path.replace('/locations/', '') }));
}

async function getPageData(slug: string) {
  const result = await getLocationPage(slug);
  if (!result.ok) {
    throw new Error(`CMS request failed: ${result.reason}`);
  }
  return result.data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { siteUrl } = getPublicConfig();
  const page = await getPageData(slug);

  if (!page) {
    return { title: 'Location Not Found' };
  }

  const canonical = siteUrl ? `${siteUrl}/locations/${slug}` : undefined;

  return {
    title: page.seo?.title ?? `${page.title} Transportation Services`,
    description: page.seo?.description ?? page.summary,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      title: page.seo?.title ?? `${page.title} Transportation Services | YourBestRide`,
      description: page.seo?.description ?? page.summary,
      ...(page.seo?.image
        ? { images: [{ url: page.seo.image.url, alt: page.seo.image.alt }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: page.seo?.title ?? `${page.title} Transportation Services`,
      description: page.seo?.description ?? page.summary,
    },
  };
}

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getPageData(slug);

  if (!page) {
    notFound();
  }

  const servicesResult = await getLocationServices(page.id);
  const services = servicesResult.items;
  const { bookingUrl } = await getBusinessConfig();

  return (
    <main className="interior-page" id="main-content">
      <section className="hero interior-hero" aria-labelledby="location-title">
        <Container>
          <div className="interior-intro">
            <p className="eyebrow">
              <span>Service Area</span>
            </p>
            <h1 id="location-title">{page.title}</h1>
            <p className="hero-description">{page.summary}</p>
          </div>
        </Container>
      </section>

      <section className="section" aria-labelledby="introduction-heading">
        <Container>
          <div className="interior-intro">
            <h2 id="introduction-heading" className="section-heading">
              About This Area
            </h2>
            <div className="rich-text">
              {page.introduction.map((block, index) => (
                <RichBlock key={index} block={block} />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {page.coverageAreas.length > 0 && (
        <section className="section" aria-labelledby="coverage-heading">
          <Container>
            <h2 id="coverage-heading" className="section-heading">
              Neighborhoods Served
            </h2>
            <ul className="coverage-areas-list">
              {page.coverageAreas.map((area, index) => (
                <li key={index}>
                  <Icon name="mapPin" width={18} height={18} />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {services.length > 0 && (
        <section className="section" aria-labelledby="services-heading">
          <Container>
            <h2 id="services-heading" className="section-heading">
              Available Services
            </h2>
            <div className="service-grid">
              {services.map((service) => (
                <Link
                  key={service.slug}
                  href={`/services/${service.slug}`}
                  className="service-card-link"
                >
                  <div className="service-card">
                    <div className="service-card-top">
                      <div className="icon-tile">
                        <Icon name={serviceIcon(service.slug)} width={28} height={28} />
                      </div>
                      <span className="card-index">{service.title}</span>
                    </div>
                    <h3>{service.title}</h3>
                    <p>{service.summary}</p>
                    <div className="text-link">
                      View service <Icon name="arrow" width={16} height={16} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {page.faqs.length > 0 && (
        <section className="section" aria-labelledby="faqs-heading">
          <Container>
            <h2 id="faqs-heading" className="section-heading">
              Frequently Asked Questions
            </h2>
            <dl className="faq-list">
              {page.faqs.map((faq, index) => (
                <div key={index} className="faq-item">
                  <dt>{faq.question}</dt>
                  <dd>{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </Container>
        </section>
      )}

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">Ready to Book?</p>
            <h2 id="cta-heading">Schedule Your Ride in {page.title}</h2>
            <p>
              Our team is ready to provide premium transportation services throughout this area.
            </p>
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

function RichBlock({ block }: { block: { kind: string; text: string } }) {
  const Tag =
    block.kind === 'heading'
      ? 'h3'
      : block.kind === 'quote'
        ? 'blockquote'
        : block.kind === 'list-item'
          ? 'li'
          : 'p';
  if (block.kind === 'list-item') {
    return <li>{block.text}</li>;
  }
  return <Tag>{block.text}</Tag>;
}

function serviceIcon(slug: string): 'medical' | 'airport' | 'corporate' | 'private' {
  const iconMap: Record<string, 'medical' | 'airport' | 'corporate' | 'private'> = {
    'medical-transportation': 'medical',
    'airport-transportation': 'airport',
    'corporate-transportation': 'corporate',
    'private-transportation': 'private',
  };
  return iconMap[slug] ?? 'private';
}
