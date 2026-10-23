import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { getLocationPage, getLocationServices, getSitemapRecords } from '@/lib/cms/page-queries';
import { getLocationRoutePricing } from '@/lib/cms/pricing-queries';
import { LocationPricingSection } from '@/components/locations/LocationPricingSection';
import { getPublicConfig } from '@/lib/config';
import type { LocationPage } from '@/lib/cms/types';
import { TrackLink } from '@/components/analytics';
import { CmsImage } from '@/components/cms-content';
import { DetailBreadcrumb, SectionHeading, ServiceCard } from '@/components/public-content';

export const revalidate = 300;

export async function generateStaticParams() {
  const records = await getSitemapRecords();
  const locationRecords = records.filter((record) => record.path.startsWith('/locations/'));
  return locationRecords.map((record) => ({ slug: record.path.replace('/locations/', '') }));
}

async function getPageData(slug: string) {
  const result = await getLocationPage(slug);
  if (!result.ok) throw new Error(`CMS request failed: ${result.reason}`);
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
  if (!page) return { title: 'Location Not Found' };
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
  if (!page) notFound();

  const [servicesResult, routePrices] = await Promise.all([
    getLocationServices(page.id),
    getLocationRoutePricing(page.id, page.slug),
  ]);
  const services = [...page.relatedServices, ...servicesResult.items].filter(
    (service, index, entries) => entries.findIndex((item) => item.slug === service.slug) === index,
  );

  return (
    <main className="interior-page content-detail location-detail" id="main-content">
      <section className="content-detail-hero" aria-labelledby="location-title">
        <Container>
          <DetailBreadcrumb href="/locations" label="Service Areas" current={page.title} />
          <div
            className={`content-detail-hero-grid${page.image ? '' : ' content-detail-text-only'}`}
          >
            <div className="content-detail-intro">
              <p className="eyebrow">SERVICE AREA</p>
              <h1 id="location-title">{page.title}</h1>
              <p className="content-detail-summary">{page.summary}</p>
              <div className="detail-primary-actions">
                <TrackLink
                  href="/book"
                  className="button button-gold"
                  eventName="booking_click"
                  eventParams={{
                    source_page: `/locations/${page.slug}`,
                    button_location: 'location_hero',
                  }}
                >
                  Book a Ride <Icon name="arrow" width={16} />
                </TrackLink>
                <Link
                  href={`/rates-and-options?location=${page.slug}&tab=airport`}
                  className="button button-secondary"
                >
                  View Route Pricing
                </Link>
                <Link href="/locations" className="button detail-secondary-action">
                  Back to Service Areas
                </Link>
              </div>
            </div>
            {page.image && (
              <div className="content-detail-media">
                <CmsImage
                  image={page.image}
                  preserveAspectRatio
                  className="content-detail-photo"
                  sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 48vw, 600px"
                  priority
                />
                <div className="location-detail-media-label">
                  <Icon name="mapPin" width={20} height={20} />
                  <span>{page.title}</span>
                </div>
              </div>
            )}
          </div>
        </Container>
      </section>

      {(page.introduction.length > 0 || page.coverageAreas.length > 0) && (
        <section className="section content-detail-main" aria-labelledby="introduction-heading">
          <Container className="content-detail-grid">
            {page.introduction.length > 0 && (
              <div className="content-detail-copy">
                <p className="eyebrow">ABOUT THE AREA</p>
                <h2 id="introduction-heading">Transportation in {page.title}</h2>
                <RichContent blocks={page.introduction} />
              </div>
            )}
            {page.coverageAreas.length > 0 && (
              <aside className="content-detail-panel" aria-labelledby="coverage-heading">
                <h2 id="coverage-heading">Neighborhoods served</h2>
                <ul className="detail-area-list">
                  {page.coverageAreas.map((area) => (
                    <li key={area}>
                      <Icon name="mapPin" width={18} height={18} />
                      <span>{area}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </Container>
        </section>
      )}

      {services.length > 0 && (
        <section className="section detail-supporting-section" aria-labelledby="services-heading">
          <Container>
            <SectionHeading
              eyebrow="AVAILABLE IN THIS AREA"
              title="Published services"
              description="Only services associated with this published location are shown."
              actionHref="/services"
              actionLabel="Explore All Services"
            />
            <div className="public-card-grid public-service-grid">
              {services.map((service) => (
                <ServiceCard key={service.slug} service={service} />
              ))}
            </div>
          </Container>
        </section>
      )}

      <LocationPricingSection
        locationTitle={page.title}
        locationSlug={page.slug}
        routes={routePrices}
      />

      {page.faqs.length > 0 && <FaqSection faqs={page.faqs} />}

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">READY TO RIDE?</p>
            <h2 id="cta-heading">Plan Your Ride in {page.title}</h2>
            <p>Arrange your journey through our trusted booking experience.</p>
          </div>
          <TrackLink
            href="/book"
            className="button nav-book"
            eventName="booking_click"
            eventParams={{
              source_page: `/locations/${page.slug}`,
              button_location: 'footer_cta',
            }}
          >
            Book a Ride <Icon name="arrow" width={16} />
          </TrackLink>
        </Container>
      </section>
    </main>
  );
}

function RichContent({ blocks }: { blocks: LocationPage['introduction'] }) {
  return (
    <div className="rich-text">
      {blocks.map((block, index) => (
        <RichBlock key={`${block.kind}-${index}`} block={block} />
      ))}
    </div>
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
  if (block.kind === 'list-item') return <li>{block.text}</li>;
  return <Tag>{block.text}</Tag>;
}

function FaqSection({ faqs }: { faqs: LocationPage['faqs'] }) {
  return (
    <section className="section detail-faq-section" aria-labelledby="faqs-heading">
      <Container className="content-detail-grid">
        <div>
          <p className="eyebrow">GOOD TO KNOW</p>
          <h2 id="faqs-heading">Frequently asked questions</h2>
        </div>
        <dl className="faq-list">
          {faqs.map((faq) => (
            <div key={faq.question} className="faq-item">
              <dt>{faq.question}</dt>
              <dd>{faq.answer}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
