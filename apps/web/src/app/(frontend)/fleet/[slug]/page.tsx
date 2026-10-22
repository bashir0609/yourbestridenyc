import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { getFleetPage, getSitemapRecords } from '@/lib/cms/page-queries';

import { getPublicConfig } from '@/lib/config';
import { CmsImage } from '@/components/cms-content';
import { TrackLink } from '@/components/analytics';
import { DetailBreadcrumb } from '@/components/public-content';

export const revalidate = 300;

export async function generateStaticParams() {
  const records = await getSitemapRecords();
  const fleetRecords = records.filter((r) => r.path.startsWith('/fleet/'));
  return fleetRecords.map((r) => ({ slug: r.path.replace('/fleet/', '') }));
}

async function getPageData(slug: string) {
  const result = await getFleetPage(slug);
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
    return { title: 'Vehicle Not Found' };
  }

  const canonical = siteUrl ? `${siteUrl}/fleet/${slug}` : undefined;

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

export default async function FleetDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageData(slug);

  if (!page) {
    notFound();
  }

  const primaryImage = page.gallery[0];
  const additionalImages = page.gallery.slice(1);
  const hasDetails = page.description.length > 0;

  return (
    <main className="interior-page fleet-detail" id="main-content">
      <section className="fleet-detail-hero" aria-labelledby="vehicle-title">
        <Container>
          <DetailBreadcrumb href="/fleet" label="Our Fleet" current={page.title} />
          <div
            className={`fleet-detail-hero-grid${primaryImage ? '' : ' fleet-detail-hero-grid-text-only'}`}
          >
            <div className="fleet-detail-intro">
              <p className="eyebrow">PREMIUM TRANSPORTATION</p>
              <div className="fleet-detail-category-row">
                {page.category && <p className="fleet-detail-category">{page.category}</p>}
                {page.vehicleClass && (
                  <Link
                    href="/rates-and-options"
                    className="fleet-detail-class-badge"
                    title={`View tariff rates for ${page.vehicleClass.name}`}
                  >
                    Pricing Class: {page.vehicleClass.name}
                  </Link>
                )}
              </div>
              <h1 id="vehicle-title">{page.title}</h1>
              {page.summary && <p className="fleet-detail-summary">{page.summary}</p>}
              {(page.passengerCapacity || page.luggageCapacity) && (
                <dl className="fleet-detail-specs">
                  {page.passengerCapacity && (
                    <div className="fleet-detail-spec">
                      <Icon name="users" width={21} height={21} />
                      <dt>Passengers</dt>
                      <dd>{page.passengerCapacity}</dd>
                    </div>
                  )}
                  {page.luggageCapacity && (
                    <div className="fleet-detail-spec">
                      <Icon name="luggage" width={21} height={21} />
                      <dt>Luggage</dt>
                      <dd>{page.luggageCapacity}</dd>
                    </div>
                  )}
                </dl>
              )}
              <div className="detail-primary-actions">
                <TrackLink
                  href="/book"
                  className="button button-gold"
                  eventName="booking_click"
                  eventParams={{
                    source_page: `/fleet/${page.slug}`,
                    button_location: 'vehicle_hero',
                  }}
                >
                  Reserve Your Ride <Icon name="arrow" width={16} />
                </TrackLink>
                <Link href="/fleet" className="button detail-secondary-action">
                  Back to Our Fleet
                </Link>
              </div>
            </div>
            {primaryImage && (
              <div className="fleet-detail-media">
                <CmsImage
                  image={primaryImage}
                  preserveAspectRatio
                  className="fleet-detail-photo"
                  sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 52vw, 650px"
                  priority
                />
              </div>
            )}
          </div>
        </Container>
      </section>

      {(hasDetails || page.amenities.length > 0 || page.accessibilityInformation) && (
        <section className="section fleet-detail-content" aria-labelledby="description-heading">
          <Container className="fleet-detail-content-grid">
            {hasDetails && (
              <div>
                <p className="eyebrow">THE VEHICLE</p>
                <h2 id="description-heading">Vehicle details</h2>
                <div className="rich-text">
                  {page.description.map((block, index) => (
                    <RichBlock key={index} block={block} />
                  ))}
                </div>
              </div>
            )}
            {(page.amenities.length > 0 || page.accessibilityInformation) && (
              <aside className="fleet-detail-features" aria-label={`${page.title} features`}>
                {page.amenities.length > 0 && (
                  <div>
                    <h2>Amenities</h2>
                    <ul className="features-list">
                      {page.amenities.map((amenity) => (
                        <li key={amenity}>
                          <Icon name="check" width={20} height={20} />
                          <span>{amenity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {page.accessibilityInformation && (
                  <div>
                    <h2>Accessibility</h2>
                    <p>{page.accessibilityInformation}</p>
                  </div>
                )}
              </aside>
            )}
          </Container>
        </section>
      )}

      {additionalImages.length > 0 && (
        <section className="section fleet-detail-gallery" aria-labelledby="gallery-heading">
          <Container>
            <p className="eyebrow">A CLOSER LOOK</p>
            <h2 id="gallery-heading">Gallery</h2>
            <div className="fleet-detail-gallery-grid">
              {additionalImages.map((image, index) => (
                <CmsImage
                  key={`${image.url}-${index}`}
                  image={image}
                  preserveAspectRatio
                  className="fleet-detail-gallery-item"
                  sizes="(max-width: 767px) calc(100vw - 40px), 50vw"
                />
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">READY TO RIDE?</p>
            <h2 id="cta-heading">Reserve Your Ride</h2>
            <p>Share your itinerary and arrange your ride with Your Best Ride.</p>
          </div>
          <TrackLink
            href="/book"
            className="button nav-book"
            eventName="booking_click"
            eventParams={{ source_page: `/fleet/${page.slug}`, button_location: 'footer_cta' }}
          >
            Book a Ride <Icon name="arrow" width={16} />
          </TrackLink>
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
