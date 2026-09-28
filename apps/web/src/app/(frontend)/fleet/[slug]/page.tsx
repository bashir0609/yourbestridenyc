import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { getFleetPage, getSitemapRecords } from '@/lib/cms/page-queries';
import { getBusinessConfig } from '@/lib/cms/queries';
import { getPublicConfig } from '@/lib/config';
import { CmsImage } from '@/components/cms-content';
import { TrackLink } from '@/components/analytics';

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

  const { bookingUrl } = await getBusinessConfig();

  return (
    <main className="interior-page" id="main-content">
      <section className="hero interior-hero" aria-labelledby="vehicle-title">
        <Container>
          <div className="interior-intro">
            <p className="eyebrow">
              <span>Premium Transportation</span>
            </p>
            <h1 id="vehicle-title">{page.title}</h1>
            <p className="hero-description">{page.summary}</p>
            <div className="fleet-type">
              {page.category && <span>{page.category}</span>}
              {page.passengerCapacity && (
                <span className="capacity">
                  <Icon name="users" width={16} height={16} />
                  {page.passengerCapacity} passengers
                </span>
              )}
              {page.luggageCapacity && (
                <span className="capacity">
                  <Icon name="luggage" width={16} height={16} />
                  {page.luggageCapacity} luggage
                </span>
              )}
            </div>
          </div>
        </Container>
      </section>

      {page.gallery.length > 0 && (
        <section className="section" aria-labelledby="gallery-heading">
          <Container>
            <h2 id="gallery-heading" className="section-heading">
              Gallery
            </h2>
            <div className="gallery-grid">
              {page.gallery.map((image, index) => (
                <div key={index} className="gallery-item">
                  <CmsImage image={image} />
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      <section className="section" aria-labelledby="description-heading">
        <Container>
          <div className="interior-intro">
            <h2 id="description-heading" className="section-heading">
              Vehicle Details
            </h2>
            <div className="rich-text">
              {page.description.map((block, index) => (
                <RichBlock key={index} block={block} />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {page.amenities.length > 0 && (
        <section className="section" aria-labelledby="amenities-heading">
          <Container>
            <h2 id="amenities-heading" className="section-heading">
              Amenities
            </h2>
            <ul className="features-list">
              {page.amenities.map((amenity, index) => (
                <li key={index}>
                  <Icon name="check" width={20} height={20} />
                  <span>{amenity}</span>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {page.accessibilityInformation && (
        <section className="section" aria-labelledby="accessibility-heading">
          <Container>
            <h2 id="accessibility-heading" className="section-heading">
              Accessibility Information
            </h2>
            <p>{page.accessibilityInformation}</p>
          </Container>
        </section>
      )}

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">Ready to Book?</p>
            <h2 id="cta-heading">Reserve This Vehicle</h2>
            <p>Select this vehicle when booking through our partner.</p>
            {bookingUrl && (
              <TrackLink
                href={bookingUrl}
                className="button nav-book"
                target="_blank"
                rel="noopener noreferrer"
                eventName="booking_click"
                eventParams={{ source_page: `/fleet/${page.slug}`, button_location: 'footer_cta' }}
              >
                Book Now <Icon name="arrow" width={16} />
              </TrackLink>
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
