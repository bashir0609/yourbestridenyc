import Link from 'next/link';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { TrackLink } from '@/components/analytics';
import type { FixedRouteEntry, HourlyCharterEntry } from '@/lib/cms/pricing-types';

interface VehiclePricingSectionProps {
  vehicleTitle: string;
  vehicleSlug: string;
  vehicleClass?: {
    id?: number;
    name: string;
    slug: string;
  } | null;
  fixedRoutes: FixedRouteEntry[];
  hourlyCharters: HourlyCharterEntry[];
}

export function VehiclePricingSection({
  vehicleTitle,
  vehicleSlug,
  vehicleClass,
  fixedRoutes,
  hourlyCharters,
}: VehiclePricingSectionProps) {
  const className = vehicleClass?.name || 'Standard Vehicle';
  const classSlug = vehicleClass?.slug || '';
  const hasPublishedRates = fixedRoutes.length > 0 || hourlyCharters.length > 0;

  // Fallback state when zero published rates exist for this vehicle class
  if (!hasPublishedRates) {
    return (
      <section
        id="vehicle-rates"
        className="section location-pricing-section location-pricing-fallback"
        aria-labelledby="vehicle-rates-heading"
      >
        <Container>
          <div className="location-pricing-empty-card">
            <div className="location-empty-icon-wrap">
              <Icon name="corporate" width={32} height={32} />
            </div>
            <p className="eyebrow">CUSTOM VEHICLE TARIFFS</p>
            <h2 id="vehicle-rates-heading">Rates &amp; Options for {vehicleTitle}</h2>
            <p className="location-empty-description">
              Published fixed rates for the {vehicleTitle} ({className}) are currently quoted on
              request based on your itinerary, destination, and scheduling requirements. Share your
              trip details and our team will provide a transparent, personalized quote.
            </p>
            <div className="location-empty-actions">
              <a href="#vehicle-inquiry" className="button button-gold">
                Request a Custom Quote <Icon name="arrow" width={16} />
              </a>
              <TrackLink
                href="/book"
                className="button button-secondary"
                eventName="booking_click"
                eventParams={{
                  source_page: `/fleet/${vehicleSlug}`,
                  button_location: 'vehicle_rates_fallback_book',
                }}
              >
                Check Availability &amp; Book
              </TrackLink>
              <Link href="/rates-and-options" className="button detail-secondary-action">
                Browse All Rates &amp; Options
              </Link>
            </div>
          </div>
        </Container>
      </section>
    );
  }

  // Active pricing view when published rates exist
  return (
    <section
      id="vehicle-rates"
      className="section location-pricing-section"
      aria-labelledby="vehicle-rates-heading"
    >
      <Container>
        <div className="location-pricing-header">
          <p className="eyebrow">TRANSPARENT VEHICLE TARIFFS</p>
          <h2 id="vehicle-rates-heading">Rates &amp; Options for {vehicleTitle}</h2>
          <p className="location-pricing-description">
            Published flat-rate airport transfer rates and hourly chauffeur rates for the{' '}
            {vehicleTitle} ({className}).
          </p>
        </div>

        {/* Airport & Fixed Routes */}
        {fixedRoutes.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#121212',
                marginBottom: '16px',
              }}
            >
              Airport &amp; Point-to-Point Flat Rates
            </h3>
            <div className="location-pricing-grid">
              {fixedRoutes.map((route) => (
                <div key={route.id} className="location-destination-card">
                  <div className="destination-card-header">
                    <div className="destination-icon-wrap">
                      <Icon name="airport" width={22} height={22} />
                    </div>
                    <div>
                      <h4 className="destination-name" style={{ fontSize: '1.125rem', margin: 0 }}>
                        {route.destinationZone}
                      </h4>
                      <p className="destination-corridor text-muted">{route.routeLabel}</p>
                    </div>
                  </div>

                  <div className="destination-rates-list">
                    <div className="destination-rate-item">
                      <div className="rate-class-info">
                        <span className="vehicle-class-pill">{route.vehicleClassName}</span>
                        {route.notes && <p className="rate-notes-text text-muted">{route.notes}</p>}
                      </div>

                      <div className="rate-pricing-info">
                        <div className="rate-price-tag">${route.flatRate.toFixed(2)}</div>
                        <div className="rate-basis-label">Base Flat Fare</div>
                        {route.additionalStopFee && (
                          <div className="rate-stop-fee text-muted">
                            En-route stops: quoted on request (est. ${route.additionalStopFee},
                            pending LA confirmation)
                          </div>
                        )}
                      </div>

                      <div className="rate-action-btn">
                        <TrackLink
                          href="/book"
                          className="button button-small button-gold"
                          eventName="booking_click"
                          eventParams={{
                            source_page: `/fleet/${vehicleSlug}`,
                            button_location: 'vehicle_rates_fixed_row',
                          }}
                        >
                          Book Now
                        </TrackLink>
                        <a
                          href={`/rates-and-options?service=airport&route=${encodeURIComponent(
                            route.routeLabel,
                          )}&vehicleClass=${encodeURIComponent(
                            route.vehicleClassName,
                          )}&pickup=${encodeURIComponent(
                            route.originZone,
                          )}&dropoff=${encodeURIComponent(route.destinationZone)}#rates-inquiry`}
                          className="button button-small button-secondary"
                        >
                          Request Quote
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hourly Charters */}
        {hourlyCharters.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h3
              style={{
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#121212',
                marginBottom: '16px',
              }}
            >
              Hourly As-Directed Charters
            </h3>
            <div className="location-pricing-grid">
              {hourlyCharters.map((charter) => (
                <div key={charter.id} className="location-destination-card">
                  <div className="destination-card-header">
                    <div className="destination-icon-wrap">
                      <Icon name="corporate" width={22} height={22} />
                    </div>
                    <div>
                      <h4 className="destination-name" style={{ fontSize: '1.125rem', margin: 0 }}>
                        {charter.title}
                      </h4>
                      <p className="destination-corridor text-muted">Dedicated Chauffeur Service</p>
                    </div>
                  </div>

                  <div className="destination-rates-list">
                    <div className="destination-rate-item">
                      <div className="rate-class-info">
                        <span className="vehicle-class-pill">{charter.vehicleClassName}</span>
                        <p className="rate-notes-text text-muted">
                          {charter.minimumHours} Hours Minimum Booking
                        </p>
                      </div>

                      <div className="rate-pricing-info">
                        <div className="rate-price-tag">${charter.hourlyRate.toFixed(2)} / hr</div>
                        <div className="rate-basis-label">
                          ${charter.minimumSubtotal.toFixed(2)} min subtotal
                        </div>
                      </div>

                      <div className="rate-action-btn">
                        <TrackLink
                          href="/book"
                          className="button button-small button-gold"
                          eventName="booking_click"
                          eventParams={{
                            source_page: `/fleet/${vehicleSlug}`,
                            button_location: 'vehicle_rates_hourly_row',
                          }}
                        >
                          Book Now
                        </TrackLink>
                        <a
                          href={`/rates-and-options?service=corporate&pricingModel=hourly&vehicleClass=${encodeURIComponent(
                            charter.vehicleClassName,
                          )}#rates-inquiry`}
                          className="button button-small button-secondary"
                        >
                          Request Quote
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Commercial Policies & Gratuity Disclosures */}
        <div className="location-pricing-disclosure">
          <p>
            <strong>Fare Disclosures &amp; Inclusions:</strong> Rates shown are net base fares in
            USD for private chauffeured transportation. A 20% chauffeur gratuity is calculated upon
            net base fare during checkout in Limo Anywhere. NYS Congestion Surcharge ($2.75 per Tax
            Law § 1281), Port Authority Airport Access Fee, and applicable bridge/tunnel tolls are
            itemized transparently. Unconfirmed intermediate stop fees are quoted upon request.
          </p>
        </div>

        {/* Section Footer Link */}
        <div className="location-pricing-footer">
          <Link
            href={`/rates-and-options?vehicleClass=${encodeURIComponent(classSlug || className)}&tab=airport`}
            className="button button-secondary"
          >
            View Complete Rates &amp; Options <Icon name="arrow" width={16} />
          </Link>
          <a href="#vehicle-inquiry" className="button detail-secondary-action">
            Request Custom Quotation
          </a>
        </div>
      </Container>
    </section>
  );
}
