import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { getDriverPage, getSitemapRecords } from '@/lib/cms/page-queries';

import { getPublicConfig } from '@/lib/config';
import { CmsImage } from '@/components/cms-content';
import { TrackLink } from '@/components/analytics';

export const revalidate = 300;

export async function generateStaticParams() {
  const records = await getSitemapRecords();
  const driverRecords = records.filter((r) => r.path.startsWith('/drivers/'));
  return driverRecords.map((r) => ({ slug: r.path.replace('/drivers/', '') }));
}

async function getPageData(slug: string) {
  const result = await getDriverPage(slug);
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
    return { title: 'Driver Not Found' };
  }

  const canonical = siteUrl ? `${siteUrl}/drivers/${slug}` : undefined;

  return {
    title: page.seo?.title ?? page.name,
    description: page.seo?.description ?? page.summary,
    ...(canonical ? { alternates: { canonical } } : {}),
    openGraph: {
      type: 'profile',
      title: page.seo?.title ?? page.name,
      description: page.seo?.description ?? page.summary,
      ...(page.seo?.image
        ? { images: [{ url: page.seo.image.url, alt: page.seo.image.alt }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: page.seo?.title ?? page.name,
      description: page.seo?.description ?? page.summary,
    },
  };
}

export default async function DriverDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageData(slug);

  if (!page) {
    notFound();
  }

  return (
    <main className="interior-page" id="main-content">
      <section className="hero interior-hero" aria-labelledby="driver-name">
        <Container>
          <div className="interior-intro driver-hero">
            {page.image && (
              <div className="driver-portrait">
                <CmsImage image={page.image} preserveAspectRatio />
              </div>
            )}
            <div className="driver-intro">
              <p className="eyebrow">
                <span>Our People</span>
              </p>
              <h1 id="driver-name">{page.name}</h1>
              <p className="hero-description">{page.summary}</p>
              {page.experienceYears !== undefined && (
                <p className="driver-experience">
                  <Icon name="award" width={18} height={18} />
                  <span>{page.experienceYears} years experience</span>
                </p>
              )}
              {page.experience && (
                <p className="driver-experience">
                  <Icon name="award" width={18} height={18} />
                  <span>{page.experience}</span>
                </p>
              )}
            </div>
          </div>
        </Container>
      </section>

      <section className="section" aria-labelledby="biography-heading">
        <Container>
          <div className="interior-intro">
            <h2 id="biography-heading" className="section-heading">
              Biography
            </h2>
            <div className="rich-text">
              {page.biography.map((block, index) => (
                <RichBlock key={index} block={block} />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {(page.languages.length > 0 || page.specialties.length > 0) && (
        <section className="section" aria-labelledby="details-heading">
          <Container>
            <h2 id="details-heading" className="section-heading">
              Qualifications
            </h2>
            <div className="driver-qualifications">
              {page.languages.length > 0 && (
                <div className="qualification-group">
                  <h3>
                    <Icon name="globe" width={20} height={20} />
                    Languages
                  </h3>
                  <ul className="qualification-list">
                    {page.languages.map((lang, index) => (
                      <li key={index}>
                        <Icon name="check" width={18} height={18} />
                        <span>{lang}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {page.specialties.length > 0 && (
                <div className="qualification-group">
                  <h3>
                    <Icon name="star" width={20} height={20} />
                    Specialties
                  </h3>
                  <ul className="qualification-list">
                    {page.specialties.map((spec, index) => (
                      <li key={index}>
                        <Icon name="check" width={18} height={18} />
                        <span>{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Container>
        </section>
      )}

      {page.serviceAreas.length > 0 && (
        <section className="section" aria-labelledby="service-areas-heading">
          <Container>
            <h2 id="service-areas-heading" className="section-heading">
              Service Areas
            </h2>
            <ul className="location-list">
              {page.serviceAreas.map((area) => (
                <li key={area.slug}>
                  <Icon name="mapPin" width={20} height={20} />
                  <span>
                    <strong>{area.title}</strong>
                    <br />
                    {area.summary}
                  </span>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">Ready to Book?</p>
            <h2 id="cta-heading">Plan Your Journey Today</h2>
            <p>Continue to our booking partner to arrange your ride.</p>
            <TrackLink
              href="/book"
              className="button nav-book"
              eventName="booking_click"
              eventParams={{
                source_page: `/drivers/${page.slug}`,
                button_location: 'footer_cta',
              }}
            >
              Book Now <Icon name="arrow" width={16} />
            </TrackLink>
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
