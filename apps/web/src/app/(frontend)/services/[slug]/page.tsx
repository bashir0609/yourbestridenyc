import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { getServicePage, getSitemapRecords } from '@/lib/cms/page-queries';
import { getPublicConfig } from '@/lib/config';
import { CmsImage } from '@/components/cms-content';
import type { ServicePage as PublicServicePage } from '@/lib/cms/types';
import { TransportationInquiryForm } from '@/components/forms/TransportationInquiryForm';
import { TrackLink } from '@/components/analytics';
import { DetailBreadcrumb, LocationCard, SectionHeading } from '@/components/public-content';

export const revalidate = 300;

export async function generateStaticParams() {
  const records = await getSitemapRecords();
  const serviceRecords = records.filter((record) => record.path.startsWith('/services/'));
  return serviceRecords.map((record) => ({ slug: record.path.replace('/services/', '') }));
}

async function getPageData(slug: string) {
  const result = await getServicePage(slug);
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
  if (!page) return { title: 'Service Not Found' };
  const canonical = siteUrl ? `${siteUrl}/services/${slug}` : undefined;
  return {
    title: page.seo?.title ?? page.title,
    description: page.seo?.description ?? page.summary,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'website',
      title: page.seo?.title ?? page.title,
      description: page.seo?.description ?? page.summary,
      ...(page.seo?.image
        ? { images: [{ url: page.seo.image.url, alt: page.seo.image.alt }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: page.seo?.title ?? page.title,
      description: page.seo?.description ?? page.summary,
    },
  };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageData(slug);
  if (!page) notFound();

  return (
    <main className="interior-page content-detail service-detail" id="main-content">
      <section className="content-detail-hero" aria-labelledby="service-title">
        <Container>
          <DetailBreadcrumb href="/services" label="Our Services" current={page.title} />
          <div
            className={`content-detail-hero-grid${page.image ? '' : ' content-detail-text-only'}`}
          >
            <div className="content-detail-intro">
              <p className="eyebrow">THOUGHTFUL TRANSPORTATION</p>
              <h1 id="service-title">{page.title}</h1>
              <p className="content-detail-summary">{page.summary}</p>
              <div className="detail-primary-actions">
                <TrackLink
                  href="/book"
                  className="button button-gold"
                  eventName="booking_click"
                  eventParams={{
                    source_page: `/services/${page.slug}`,
                    button_location: 'service_hero',
                    service_page: `/services/${page.slug}`,
                  }}
                >
                  {page.bookingCTA?.label ?? 'Book a Ride'} <Icon name="arrow" width={16} />
                </TrackLink>
                <a href="#service-inquiry" className="button detail-secondary-action">
                  Request Information
                </a>
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
              </div>
            )}
          </div>
        </Container>
      </section>

      {(page.overview.length > 0 || page.features.length > 0) && (
        <section className="section content-detail-main" aria-labelledby="overview-heading">
          <Container className="content-detail-grid">
            {page.overview.length > 0 && (
              <div className="content-detail-copy">
                <p className="eyebrow">THE SERVICE</p>
                <h2 id="overview-heading">Service overview</h2>
                <RichContent blocks={page.overview} />
              </div>
            )}
            {page.features.length > 0 && (
              <aside className="content-detail-panel" aria-labelledby="features-heading">
                <h2 id="features-heading">Service features</h2>
                <ul className="detail-check-list">
                  {page.features.map((feature) => (
                    <li key={feature}>
                      <Icon name="check" width={19} height={19} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </Container>
        </section>
      )}

      {page.benefits.length > 0 && (
        <section className="section detail-supporting-section" aria-labelledby="benefits-heading">
          <Container>
            <SectionHeading
              eyebrow="WHY THIS JOURNEY"
              title="Service benefits"
              description="Only benefits published for this service are shown."
            />
            <div className="detail-feature-grid">
              {page.benefits.map((benefit) => (
                <article key={benefit.title} className="detail-feature-card">
                  <span aria-hidden="true">
                    <Icon name="check" width={20} height={20} />
                  </span>
                  <h3>{benefit.title}</h3>
                  {benefit.description && <p>{benefit.description}</p>}
                </article>
              ))}
            </div>
          </Container>
        </section>
      )}

      {page.locations.length > 0 && (
        <section className="section service-detail-locations" aria-labelledby="locations-heading">
          <Container>
            <SectionHeading
              eyebrow="WHERE WE TRAVEL"
              title="Published service areas"
              description="Select an area to review its published transportation information."
            />
            <div className="public-card-grid public-location-grid">
              {page.locations.map((location) => (
                <LocationCard key={location.slug} location={location} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {page.faqs.length > 0 && <FaqSection faqs={page.faqs} />}

      <section
        id="service-inquiry"
        className="section inquiry-section"
        aria-labelledby="inquiry-heading"
      >
        <Container>
          <div className="inquiry-header">
            <p className="eyebrow">REQUEST INFORMATION</p>
            <h2 id="inquiry-heading">Tell us about your journey</h2>
            <p>Share your trip details and we&apos;ll follow up with available options.</p>
          </div>
          <TransportationInquiryForm sourcePage={`/services/${page.slug}`} />
        </Container>
      </section>

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">READY TO RIDE?</p>
            <h2 id="cta-heading">Plan Your Journey Today</h2>
            <p>Arrange your ride through our trusted booking experience.</p>
          </div>
          <TrackLink
            href="/book"
            className="button nav-book"
            eventName="booking_click"
            eventParams={{
              source_page: `/services/${page.slug}`,
              button_location: 'footer_cta',
              service_page: `/services/${page.slug}`,
            }}
          >
            {page.bookingCTA?.label ?? 'Book a Ride'} <Icon name="arrow" width={16} />
          </TrackLink>
        </Container>
      </section>
    </main>
  );
}

function RichContent({ blocks }: { blocks: PublicServicePage['overview'] }) {
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

function FaqSection({ faqs }: { faqs: PublicServicePage['faqs'] }) {
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
