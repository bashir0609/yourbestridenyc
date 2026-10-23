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
          <div className="booking-hero-content">
            <p className="eyebrow">ONLINE RESERVATIONS</p>
            <h1 id="booking-title">
              Book Your <span>Ride</span>
            </h1>
            <p className="booking-hero-description">
              Reserve executive transportation across New York — live availability, transparent
              rates, instant confirmation.
            </p>

            <ul className="booking-trust-strip" aria-label="Booking assurances">
              <li>
                <Icon name="check" width={15} height={15} aria-hidden="true" />
                <span>Live Availability</span>
              </li>
              <li>
                <Icon name="award" width={15} height={15} aria-hidden="true" />
                <span>Executive Chauffeurs</span>
              </li>
              <li>
                <Icon name="briefcase" width={15} height={15} aria-hidden="true" />
                <span>Upfront Pricing</span>
              </li>
            </ul>
          </div>
        </Container>
      </section>

      <section className="booking-experience" aria-labelledby="reservation-heading">
        <Container>
          <h2 id="reservation-heading" className="booking-form-heading">
            Complete your reservation
          </h2>

          {oresBookingUrl ? (
            <LimoAnywhereBooking bookingUrl={oresBookingUrl} />
          ) : (
            <Card className="booking-card booking-unavailable">
              <h2>Online booking isn&apos;t connected yet.</h2>
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
