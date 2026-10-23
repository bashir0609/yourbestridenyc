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
              Reserve executive transportation across New York with live availability, transparent
              rates, and instant confirmation powered by our official reservation partner.
            </p>

            <div className="booking-trust-grid" role="list" aria-label="Booking assurances">
              <div className="booking-trust-card" role="listitem">
                <span className="booking-trust-icon" aria-hidden="true">
                  <Icon name="check" width={20} height={20} />
                </span>
                <div className="booking-trust-content">
                  <strong className="booking-trust-title">Live Availability</strong>
                  <span className="booking-trust-detail">
                    Real-time confirmation via Limo Anywhere
                  </span>
                </div>
              </div>

              <div className="booking-trust-card" role="listitem">
                <span className="booking-trust-icon" aria-hidden="true">
                  <Icon name="award" width={20} height={20} />
                </span>
                <div className="booking-trust-content">
                  <strong className="booking-trust-title">Executive Chauffeurs</strong>
                  <span className="booking-trust-detail">
                    Vetted, licensed professional drivers
                  </span>
                </div>
              </div>

              <div className="booking-trust-card" role="listitem">
                <span className="booking-trust-icon" aria-hidden="true">
                  <Icon name="briefcase" width={20} height={20} />
                </span>
                <div className="booking-trust-content">
                  <strong className="booking-trust-title">Upfront Pricing</strong>
                  <span className="booking-trust-detail">
                    Transparent commercial tariffs & dispatch
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="booking-experience" aria-labelledby="reservation-heading">
        <Container>
          <div className="booking-heading">
            <div>
              <p className="eyebrow">SECURE RESERVATION ENGINE</p>
              <h2 id="reservation-heading">Complete your reservation</h2>
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
