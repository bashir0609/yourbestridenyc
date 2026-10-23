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
      <Container className="booking-container-wrap">
        <section className="booking-unified-card" aria-labelledby="booking-title">
          {/* Header inside the black container */}
          <div className="booking-unified-header">
            <p className="booking-eyebrow">PRIVATE CHAUFFEURED TRANSPORTATION</p>
            <h1 id="booking-title" className="booking-unified-title">
              Book your ride.
            </h1>
            <p className="booking-unified-description">
              Tell us where you&apos;re going, compare available vehicles, and complete your
              reservation securely.
            </p>

            {/* Trust indicators */}
            <ul className="booking-trust-strip" aria-label="Booking assurances">
              <li>
                <Icon name="check" width={15} height={15} aria-hidden="true" />
                <span>Vehicle choice</span>
              </li>
              <li>
                <Icon name="award" width={15} height={15} aria-hidden="true" />
                <span>Live fare calculation</span>
              </li>
              <li>
                <Icon name="shield" width={15} height={15} aria-hidden="true" />
                <span>Secure booking</span>
              </li>
            </ul>
          </div>

          {/* Nested reservation panel */}
          <div className="booking-panel-nested" aria-labelledby="reservation-heading">
            <div className="booking-panel-header">
              <div className="booking-panel-titles">
                <h2 id="reservation-heading" className="booking-panel-heading">
                  Your reservation
                </h2>
                <p className="booking-panel-sub">Powered by Limo Anywhere</p>
              </div>
              <div className="booking-panel-badge" aria-label="Secure reservation">
                <Icon name="shield" width={18} height={18} aria-hidden="true" />
              </div>
            </div>

            <div className="booking-panel-divider" role="separator" />

            <div className="booking-panel-body">
              {oresBookingUrl ? (
                <LimoAnywhereBooking bookingUrl={oresBookingUrl} />
              ) : (
                <Card className="booking-card booking-unavailable">
                  <h2>Online booking isn&apos;t connected yet.</h2>
                  <p>
                    The approved online booking destination is not configured. No reservation or
                    payment information is collected by this website.
                  </p>
                  <Button href="/#contact">
                    View contact information <Icon name="arrow" width={18} />
                  </Button>
                </Card>
              )}
            </div>
          </div>

          {/* Regulatory / policy disclosures */}
          <div className="booking-disclosures">
            <p className="booking-privacy-note">
              Your Best Ride does not store reservation, passenger, payment, or medical details in
              Payload CMS. A ride is confirmed only through our official reservation partner.
            </p>
            <p className="interior-footnote">
              For a medical emergency, contact your local emergency services. Do not use this
              website to request emergency transportation.
            </p>
          </div>
        </section>
      </Container>
    </main>
  );
}
