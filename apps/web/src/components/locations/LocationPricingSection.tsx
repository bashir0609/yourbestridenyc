import Link from 'next/link';
import { Container } from '@/ui';
import { Icon } from '@/components/icon';
import { TrackLink } from '@/components/analytics';
import type { LocationRoutePrice } from '@/lib/cms/pricing-types';

interface LocationPricingSectionProps {
  locationTitle: string;
  locationSlug: string;
  routes: LocationRoutePrice[];
}

interface DestinationGroup {
  destinationZone: string;
  routes: LocationRoutePrice[];
}

export function LocationPricingSection({
  locationTitle,
  locationSlug,
  routes,
}: LocationPricingSectionProps) {
  const cleanSlug = locationSlug.toLowerCase().trim();
  const outboundRoutes = routes.filter(
    (r) =>
      r.direction === 'outbound' &&
      (!r.originLocationSlug || r.originLocationSlug.toLowerCase() === cleanSlug),
  );

  // Group outbound routes by destinationZone
  const groupedDestinations: DestinationGroup[] = [];
  const seenDestinations = new Map<string, DestinationGroup>();

  for (const route of outboundRoutes) {
    let group = seenDestinations.get(route.destinationZone);
    if (!group) {
      group = { destinationZone: route.destinationZone, routes: [] };
      seenDestinations.set(route.destinationZone, group);
      groupedDestinations.push(group);
    }
    group.routes.push(route);
  }

  // Fallback state when zero published routes exist for this location
  if (outboundRoutes.length === 0) {
    return (
      <section
        className="section location-pricing-section location-pricing-fallback"
        aria-labelledby="pricing-heading"
      >
        <Container>
          <div className="location-pricing-empty-card">
            <div className="location-empty-icon-wrap">
              <Icon name="mapPin" width={32} height={32} />
            </div>
            <p className="eyebrow">CUSTOM TARIFFS &amp; QUOTATIONS</p>
            <h2 id="pricing-heading">Transportation Rates for {locationTitle}</h2>
            <p className="location-empty-description">
              Point-to-point and airport transfer rates for {locationTitle} are quoted dynamically
              based on your exact pickup address, vehicle class preference, and schedule. Our
              dispatch team provides prompt, transparent quotes for all local and regional travel.
            </p>
            <div className="location-empty-actions">
              <a
                href={`/rates-and-options?location=${encodeURIComponent(locationSlug)}#rates-inquiry`}
                className="button button-gold"
              >
                Request a Custom Quote <Icon name="arrow" width={16} />
              </a>
              <TrackLink
                href="/book"
                className="button button-secondary"
                eventName="booking_click"
                eventParams={{
                  source_page: `/locations/${locationSlug}`,
                  button_location: 'location_fallback_book',
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

  // Active pricing table when published routes are available
  return (
    <section className="section location-pricing-section" aria-labelledby="pricing-heading">
      <Container>
        <div className="location-pricing-header">
          <p className="eyebrow">TRANSPARENT REGIONAL TARIFFS</p>
          <h2 id="pricing-heading">Transportation Rates From {locationTitle}</h2>
          <p className="location-pricing-description">
            Published flat-rate fares for airport transfers and regional corridors departing from{' '}
            {locationTitle}.
          </p>
        </div>

        <div className="location-pricing-grid">
          {groupedDestinations.map((group) => (
            <div key={group.destinationZone} className="location-destination-card">
              <div className="destination-card-header">
                <div className="destination-icon-wrap">
                  <Icon name="airport" width={22} height={22} />
                </div>
                <div>
                  <h3 className="destination-name">{group.destinationZone}</h3>
                  <p className="destination-corridor text-muted">
                    {locationTitle} ↔ {group.destinationZone}
                  </p>
                </div>
              </div>

              <div className="destination-rates-list">
                {group.routes.map((route) => (
                  <div key={route.id} className="destination-rate-item">
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
                          source_page: `/locations/${locationSlug}`,
                          button_location: 'location_rate_row',
                        }}
                      >
                        Book Now
                      </TrackLink>
                      <a
                        href={`/rates-and-options?service=airport&route=${encodeURIComponent(
                          route.routeLabel,
                        )}&vehicleClass=${encodeURIComponent(
                          route.vehicleClassName,
                        )}&pickup=${encodeURIComponent(route.originZone)}&dropoff=${encodeURIComponent(
                          route.destinationZone,
                        )}#rates-inquiry`}
                        className="button button-small button-secondary"
                      >
                        Request Quote
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mandatory Base-Fare & Gratuity Disclosure */}
        <div className="location-pricing-disclosure">
          <p>
            <strong>Commercial Fare Terms:</strong> All displayed prices represent base flat
            tariffs. In accordance with executive chauffeured industry standards, a 20% chauffeur
            gratuity is calculated in Limo Anywhere during booking checkout. Incurred commercial
            tolls and statutory regulatory charges (including NYS Congestion Surcharge and Airport
            Authority Access Fees where applicable) are itemized transparently prior to final
            confirmation.
          </p>
        </div>

        <div className="location-pricing-footer">
          <Link
            href={`/rates-and-options?location=${encodeURIComponent(locationSlug)}&tab=airport`}
            className="button button-gold"
          >
            View Full Rates &amp; Options for {locationTitle} <Icon name="arrow" width={16} />
          </Link>
          <a
            href={`/rates-and-options?location=${encodeURIComponent(locationSlug)}#rates-inquiry`}
            className="button button-secondary"
          >
            Request a Custom Corporate Itinerary
          </a>
        </div>
      </Container>
    </section>
  );
}
