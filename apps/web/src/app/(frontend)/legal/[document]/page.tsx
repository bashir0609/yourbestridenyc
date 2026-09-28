import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Button, Container } from '@/ui';
import { getPublicConfig } from '@/lib/config';

const titles: Record<string, string> = { privacy: 'Privacy notice', terms: 'Terms of service' };
export function generateStaticParams() {
  return [{ document: 'privacy' }, { document: 'terms' }];
}
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string }>;
}): Promise<Metadata> {
  const { document } = await params;
  const { siteUrl } = getPublicConfig();
  return {
    title: titles[document] ?? 'Not found',
    robots: { index: false, follow: false },
    ...(siteUrl && titles[document]
      ? { alternates: { canonical: `${siteUrl}/legal/${document}` } }
      : {}),
  };
}

export default async function LegalPage({ params }: { params: Promise<{ document: string }> }) {
  const { document } = await params;
  if (!Object.hasOwn(titles, document)) notFound();
  return (
    <main id="main-content" className="interior-page">
      <Container>
        <p className="eyebrow">LEGAL INFORMATION</p>
        <h1>{titles[document]}</h1>
        <div className="legal-notice">
          <span className="content-label">Unpublished placeholder</span>
          <h2>This document has not been provided.</h2>
          <p>
            This page is reserved for the business’s reviewed and approved{' '}
            {document === 'privacy' ? 'privacy notice' : 'terms of service'}. It is not a legal
            policy, an agreement, or a statement of the business’s practices.
          </p>
          <p>
            Before a public launch, the business must supply the appropriate legal documents for its
            operations, hosting, and booking provider. For questions, use the published contact
            information, if available.
          </p>
          <Button href="/#contact" variant="dark">
            View contact information
          </Button>
        </div>
      </Container>
    </main>
  );
}
