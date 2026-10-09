import type { Metadata } from 'next';
import { Button, Card, Container } from '@/ui';
import { Icon } from '@/components/icon';
import { LimoAnywhereBooking } from '@/components/limo-anywhere-booking';
import { getPublicConfig } from '@/lib/config';
import { getBusinessConfig } from '@/lib/cms/queries';
import { resolveOresBookingUrl } from '@/lib/booking';

export function generateMetadata(): Metadata {
  const { siteUrl } = getPublicConfig();
  return {
    title: 'Book Your Ride',
    description: 'Book your ride through the official Your Best Ride online reservation page.',
    ...(siteUrl ? { alternates: { canonical: `${siteUrl}/book` } } : {}),
  };
}

export default async function BookPage() {
  const { bookingUrl } = await getBusinessConfig();
  const oresBookingUrl = resolveOresBookingUrl(bookingUrl);

  return (
    <main id="main-content" className="booking-page">
      <section className="booking-hero" aria-labelledby="booking-title">
        <Container>
          <p className="eyebrow">ONLINE RESERVATIONS</p>
          <h1 id="booking-title">
            Book Your <span>Ride</span>
          </h1>
          <p>
            Plan your transportation through our official online reservation experience.
            Availability, rates, and confirmation are provided by our reservation partner.
          </p>
        </Container>
      </section>

      <section className="booking-experience" aria-labelledby="reservation-heading">
        <Container>
          <div className="booking-heading">
            <span className="icon-tile" aria-hidden="true">
              <Icon name="airport" width={28} height={28} />
            </span>
            <div>
              <p className="eyebrow">SECURE BOOKING</p>
              <h2 id="reservation-heading">Complete your reservation</h2>
              <p>Your trip details are entered directly into our secure reservation system.</p>
            </div>
          </div>

          {oresBookingUrl ? (
            <LimoAnywhereBooking bookingUrl={oresBookingUrl} />
          ) : (
            <Card className="booking-card booking-unavailable">
              <h2>Online booking isn’t connected yet.</h2>
              <p>
                The approved online booking destination is not configured. No reservation or payment
                information is collected by this website.
              </p>
              <Button href="/#contact">
                View contact information <Icon name="arrow" width={18} />
              </Button>
            </Card>
          )}

          <p className="booking-privacy-note">
            Your Best Ride does not store reservation, passenger, payment, or medical details in
            Payload CMS. A ride is confirmed only through our official reservation partner.
          </p>
          <p className="interior-footnote">
            For a medical emergency, contact your local emergency services. Do not use this website
            to request emergency transportation.
          </p>
        </Container>
      </section>
    </main>
  );
}
