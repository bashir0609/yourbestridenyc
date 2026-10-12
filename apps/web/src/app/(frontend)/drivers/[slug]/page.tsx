import type { Metadata } from 'next';
import Link from 'next/link';
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

function comparable(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toLocaleLowerCase();
}

function distinctText(value: string | undefined, excluded: string[]): string | undefined {
  if (!value) return;
  const normalized = comparable(value);
  return excluded.some((item) => comparable(item) === normalized) ? undefined : value;
}

export default async function DriverDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPageData(slug);

  if (!page) {
    notFound();
  }

  const summary = distinctText(page.summary, [page.name]);
  const experience = distinctText(page.experience, [page.name, page.summary]);
  const biography = page.biography.filter(
    (block, index, blocks) =>
      ![page.name, page.summary].some((item) => comparable(item) === comparable(block.text)) &&
      blocks.findIndex((candidate) => comparable(candidate.text) === comparable(block.text)) ===
        index,
  );
  const hasFacts = Boolean(experience) || page.languages.length > 0 || page.specialties.length > 0;

  return (
    <main className="interior-page driver-detail" id="main-content">
      <section className="driver-detail-hero" aria-labelledby="driver-name">
        <Container>
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link href="/drivers">Our Drivers</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{page.name}</span>
          </nav>
          <div className="driver-detail-hero-grid">
            {page.image && (
              <div className="driver-detail-media">
                <CmsImage
                  image={page.image}
                  preserveAspectRatio
                  className="driver-detail-photo"
                  sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 46vw, 520px"
                  priority
                />
              </div>
            )}
            <div className="driver-detail-intro">
              <p className="eyebrow">OUR PEOPLE</p>
              <p className="driver-detail-role">Your Best Ride Driver</p>
              <h1 id="driver-name">{page.name}</h1>
              {summary && <p className="driver-detail-summary">{summary}</p>}
              {page.experienceYears !== undefined && (
                <dl className="driver-detail-highlight">
                  <div>
                    <dt>Experience</dt>
                    <dd>{page.experienceYears} years</dd>
                  </div>
                </dl>
              )}
              <div className="detail-primary-actions">
                <TrackLink
                  href="/book"
                  className="button button-gold"
                  eventName="booking_click"
                  eventParams={{
                    source_page: `/drivers/${page.slug}`,
                    button_location: 'profile_hero',
                  }}
                >
                  Book a Ride <Icon name="arrow" width={16} />
                </TrackLink>
                <Link href="/drivers" className="button detail-secondary-action">
                  Back to Our Drivers
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {(biography.length > 0 || hasFacts) && (
        <section className="section driver-detail-content" aria-labelledby="biography-heading">
          <Container className="driver-detail-content-grid">
            {biography.length > 0 && (
              <div className="driver-detail-biography">
                <p className="eyebrow">PROFILE</p>
                <h2 id="biography-heading">About {page.name}</h2>
                <div className="rich-text">
                  {biography.map((block, index) => (
                    <RichBlock key={index} block={block} />
                  ))}
                </div>
              </div>
            )}

            {hasFacts && (
              <aside className="driver-profile-facts" aria-label={`${page.name} profile details`}>
                <h2>Profile details</h2>
                {experience && (
                  <div className="driver-profile-fact">
                    <span>Experience summary</span>
                    <p>{experience}</p>
                  </div>
                )}
                {page.languages.length > 0 && (
                  <div className="driver-profile-fact">
                    <span>Languages</span>
                    <ul>
                      {page.languages.map((language) => (
                        <li key={language}>{language}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {page.specialties.length > 0 && (
                  <div className="driver-profile-fact">
                    <span>Specialties</span>
                    <ul>
                      {page.specialties.map((specialty) => (
                        <li key={specialty}>{specialty}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </aside>
            )}
          </Container>
        </section>
      )}

      {page.serviceAreas.length > 0 && (
        <section className="section driver-detail-areas" aria-labelledby="service-areas-heading">
          <Container>
            <p className="eyebrow">SERVICE AREAS</p>
            <h2 id="service-areas-heading">Areas served</h2>
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
            <p className="eyebrow">READY TO RIDE?</p>
            <h2 id="cta-heading">Plan Your Journey Today</h2>
            <p>Share your itinerary and arrange your ride with Your Best Ride.</p>
          </div>
          <TrackLink
            href="/book"
            className="button nav-book"
            eventName="booking_click"
            eventParams={{
              source_page: `/drivers/${page.slug}`,
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
