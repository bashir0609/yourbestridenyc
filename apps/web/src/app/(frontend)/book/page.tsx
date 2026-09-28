import type { Metadata } from 'next';
import { Button, Card, Container } from '@/ui';
import { Icon } from '@/components/icon';
import { getPublicConfig } from '@/lib/config';
import { getBusinessConfig } from '@/lib/cms/queries';
import { TrackLink } from '@/components/analytics';

export function generateMetadata(): Metadata {
  const { siteUrl } = getPublicConfig();
  return {
    title: 'Plan your ride',
    description:
      'Continue to the configured booking provider or contact YourBestRide about your journey.',
    ...(siteUrl ? { alternates: { canonical: `${siteUrl}/book` } } : {}),
  };
}

export default async function BookPage() {
  const { bookingUrl } = await getBusinessConfig();
  return (
    <main id="main-content" className="interior-page">
      <Container>
        <p className="eyebrow">THE NEXT STEP IN YOUR JOURNEY</p>
        <h1>
          Let’s talk about
          <br />
          <span className="muted-heading">where you’re going.</span>
        </h1>
        <p className="interior-intro">
          YourBestRide’s website is a starting point, not a reservation system. A ride is not booked
          or confirmed here.
        </p>
        <Card className="booking-card">
          <span className="icon-tile">
            <Icon name="airport" width={28} height={28} />
          </span>
          {bookingUrl ? (
            <>
              <h2>Continue to Limo Anywhere</h2>
              <p>
                The button below takes you to the configured external booking site. Check
                availability, pricing, cancellation terms, and privacy information with the provider
                before submitting your details.
              </p>
              <p className="destination-label">
                Destination: <span>{new URL(bookingUrl).hostname}</span>
              </p>
              <TrackLink
                href={bookingUrl}
                className="button button-gold"
                rel="noreferrer noopener"
                eventName="booking_click"
                eventParams={{ source_page: '/book', button_location: 'booking_handoff' }}
              >
                Continue to booking site <Icon name="arrow" width={18} />
              </TrackLink>
              <p className="booking-note">
                No passenger, payment, or medical details are collected on this page. Your ride is
                only confirmed through the booking provider’s process.
              </p>
            </>
          ) : (
            <>
              <h2>Online booking isn’t connected yet.</h2>
              <p>
                An official booking destination has not been configured. There’s no reservation form
                or payment collection on this website.
              </p>
              <Button href="/#contact">
                View contact information <Icon name="arrow" width={18} />
              </Button>
            </>
          )}
        </Card>
        <p className="interior-footnote">
          For a medical emergency, contact your local emergency services. Do not use this website to
          request emergency transportation.
        </p>
      </Container>
    </main>
  );
}
