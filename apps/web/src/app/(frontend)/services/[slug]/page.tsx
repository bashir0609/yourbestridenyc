import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import Link from 'next/link';
import { getServicePage, getSitemapRecords } from '@/lib/cms/page-queries';

import { getPublicConfig } from '@/lib/config';
import type { ServicePage } from '@/lib/cms/types';
import { TransportationInquiryForm } from '@/components/forms/TransportationInquiryForm';
import { TrackLink } from '@/components/analytics';

export const revalidate = 300;

export async function generateStaticParams() {
  const records = await getSitemapRecords();
  const serviceRecords = records.filter((r) => r.path.startsWith('/services/'));
  return serviceRecords.map((r) => ({ slug: r.path.replace('/services/', '') }));
}

async function getPageData(slug: string) {
  const result = await getServicePage(slug);
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
    return { title: 'Service Not Found' };
  }

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

  if (!page) {
    notFound();
  }

  return (
    <main className="interior-page" id="main-content">
      <section className="hero interior-hero" aria-labelledby="service-title">
        <Container>
          <div className="interior-intro">
            <p className="eyebrow">
              <span>Premium Transportation</span>
            </p>
            <h1 id="service-title">{page.title}</h1>
            <p className="hero-description">{page.summary}</p>
          </div>
        </Container>
      </section>

      <section className="section" aria-labelledby="overview-heading">
        <Container>
          <div className="interior-intro">
            <h2 id="overview-heading" className="section-heading">
              Service Overview
            </h2>
            <div className="rich-text">
              {page.overview.map((block, index) => (
                <RichBlock key={index} block={block} />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {page.benefits.length > 0 && (
        <section className="section" aria-labelledby="benefits-heading">
          <Container>
            <h2 id="benefits-heading" className="section-heading">
              Why Choose This Service
            </h2>
            <div className="service-grid">
              {page.benefits.map((benefit, index) => (
                <div key={index} className="service-card benefit-card">
                  <div className="card-body">
                    <h3>{benefit.title}</h3>
                    {benefit.description && <p>{benefit.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Container>
        </section>
      )}

      {page.features.length > 0 && (
        <section className="section" aria-labelledby="features-heading">
          <Container>
            <h2 id="features-heading" className="section-heading">
              Service Features
            </h2>
            <ul className="features-list">
              {page.features.map((feature, index) => (
                <li key={index}>
                  <Icon name="check" width={20} height={20} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {page.locations.length > 0 && (
        <section className="section" aria-labelledby="locations-heading">
          <Container>
            <h2 id="locations-heading" className="section-heading">
              Service Areas
            </h2>
            <ul className="location-list">
              {page.locations.map((location) => (
                <li key={location.slug}>
                  <Icon name="mapPin" width={20} height={20} />
                  <Link href={`/locations/${location.slug}`}>
                    <h3>{location.title}</h3>
                    <p>{location.summary}</p>
                  </Link>
                </li>
              ))}
            </ul>
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

      <section className="section inquiry-section" aria-labelledby="inquiry-heading">
        <Container>
          <div className="inquiry-header">
            <p className="eyebrow">REQUEST A QUOTE</p>
            <h2 id="inquiry-heading" className="section-heading">
              Get a Personalized Quote
            </h2>
            <p>Tell us about your trip and we&apos;ll get back to you with options and pricing.</p>
          </div>
          <TransportationInquiryForm sourcePage={`/services/${page.slug}`} />
        </Container>
      </section>

      <section className="cta-section" aria-labelledby="cta-heading">
        <Container>
          <div>
            <p className="eyebrow">Ready to Book?</p>
            <h2 id="cta-heading">Plan Your Journey Today</h2>
            <p>
              Reserve your ride through our trusted booking partner or contact us for assistance.
            </p>
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
              {page.bookingCTA?.label ?? 'Book Now'} <Icon name="arrow" width={16} />
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
