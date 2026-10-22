import Link from 'next/link';
import type { ReactNode } from 'react';
import { Container } from '@/ui';
import type { CmsStatus, CoverageArea, Driver, FleetVehicle, Service } from '@/lib/cms/types';
import { CmsImage } from '@/components/cms-content';
import { Icon, type IconName } from '@/components/icon';
import { meaningfulSummary } from '@/lib/content-quality';
import { TrackLink } from '@/components/analytics';

const serviceIcons: Record<string, IconName> = {
  'medical-transportation': 'medical',
  medical: 'medical',
  'airport-transportation': 'airport',
  airport: 'airport',
  'corporate-transportation': 'corporate',
  corporate: 'corporate',
  'private-transportation': 'private',
  private: 'private',
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="public-section-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {(description || (actionHref && actionLabel)) && (
        <div className="public-section-heading-aside">
          {description && <p>{description}</p>}
          {actionHref && actionLabel && (
            <Link href={actionHref} className="public-heading-link">
              {actionLabel} <Icon name="arrow" width={17} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function DirectoryHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <section className="content-directory-hero" aria-labelledby="directory-title">
      <Container>
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="directory-title">{title}</h1>
        <p>{description}</p>
      </Container>
    </section>
  );
}

export function DetailBreadcrumb({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: string;
}) {
  return (
    <nav className="detail-breadcrumb" aria-label="Breadcrumb">
      <Link href={href}>{label}</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{current}</span>
    </nav>
  );
}

export function ContentEmptyState({
  label,
  status,
  actionHref,
  actionLabel,
}: {
  label: string;
  status: CmsStatus;
  actionHref?: string;
  actionLabel?: string;
}) {
  const unavailable = status === 'unavailable' || status === 'invalid';
  const message = unavailable
    ? `We couldn’t load ${label} right now.`
    : `No ${label} are currently published.`;
  return (
    <div className="public-empty-state" role="status">
      <span className="public-empty-icon" aria-hidden="true">
        <Icon name="private" width={25} height={25} />
      </span>
      <div>
        <h3>{unavailable ? 'Please check back shortly' : 'More journeys are coming'}</h3>
        <p>{message} Contact us if you would like help planning your ride.</p>
        {actionHref && actionLabel && (
          <Link href={actionHref} className="public-heading-link">
            {actionLabel} <Icon name="arrow" width={17} />
          </Link>
        )}
      </div>
    </div>
  );
}

export function DriverCard({ driver }: { driver: Driver }) {
  const summary = meaningfulSummary(driver.summary, driver.name);
  return (
    <article className="public-card driver-public-card">
      <Link
        href={`/drivers/${driver.slug}`}
        className="public-card-link"
        aria-label={`View ${driver.name}’s profile`}
      >
        <div className="public-card-media driver-public-media">
          {driver.image ? (
            <CmsImage
              image={driver.image}
              preserveAspectRatio
              sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1024px) 46vw, 390px"
            />
          ) : (
            <MissingMedia label="Driver photo not available" icon="user" />
          )}
        </div>
        <div className="public-card-body">
          <p className="public-card-kicker">Your Best Ride Driver</p>
          <h3>{driver.name}</h3>
          {summary && <p>{summary}</p>}
          <span className="public-card-action">
            View Profile <Icon name="arrow" width={17} />
          </span>
        </div>
      </Link>
    </article>
  );
}

export function FleetCard({ vehicle }: { vehicle: FleetVehicle }) {
  const summary = meaningfulSummary(vehicle.summary, vehicle.title);
  return (
    <article className="public-card fleet-public-card">
      <Link
        href={`/fleet/${vehicle.slug}`}
        className="public-card-link"
        aria-label={`View ${vehicle.title}`}
      >
        <div className="public-card-media fleet-public-media">
          {vehicle.image ? (
            <CmsImage
              image={vehicle.image}
              preserveAspectRatio
              sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1024px) 46vw, 420px"
            />
          ) : (
            <MissingMedia label="Vehicle photo not available" icon="private" />
          )}
        </div>
        <div className="public-card-body">
          <div className="public-card-meta">
            <p className="public-card-kicker">Premium Fleet</p>
            {vehicle.vehicleClass && (
              <span className="public-card-class-pill">{vehicle.vehicleClass.name}</span>
            )}
          </div>
          <h3>{vehicle.title}</h3>
          {(vehicle.passengerCapacity !== undefined || vehicle.luggageCapacity !== undefined) && (
            <dl className="public-card-specs">
              {vehicle.passengerCapacity !== undefined && (
                <div>
                  <Icon name="users" width={17} />
                  <dt>Passengers</dt>
                  <dd>{vehicle.passengerCapacity}</dd>
                </div>
              )}
              {vehicle.luggageCapacity !== undefined && (
                <div>
                  <Icon name="luggage" width={17} />
                  <dt>Luggage</dt>
                  <dd>{vehicle.luggageCapacity}</dd>
                </div>
              )}
            </dl>
          )}
          {summary && <p>{summary}</p>}
          <span className="public-card-action">
            View Details <Icon name="arrow" width={17} />
          </span>
        </div>
      </Link>
      <div className="fleet-card-actions">
        <TrackLink
          href="/book"
          className="button button-small button-gold"
          eventName="booking_click"
          eventParams={{ source_page: '/fleet', button_location: 'fleet_card' }}
        >
          Check Availability & Book
        </TrackLink>
        <a
          href={`/fleet?vehicle=${encodeURIComponent(vehicle.title)}${vehicle.vehicleClass ? `&vehicleClass=${encodeURIComponent(vehicle.vehicleClass.name)}` : ''}#fleet-inquiry`}
          className="button button-small button-secondary"
        >
          Request This Vehicle
        </a>
        {vehicle.vehicleClass && (
          <Link
            href={`/rates-and-options?tab=hourly&vehicleClass=${encodeURIComponent(vehicle.vehicleClass.name)}`}
            className="button button-small button-outline"
          >
            View Class Rates
          </Link>
        )}
      </div>
    </article>
  );
}

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="public-card service-public-card">
      <Link
        href={`/services/${service.slug}`}
        className="public-card-link"
        aria-label={`View ${service.title}`}
      >
        {service.image && (
          <div className="public-card-media service-public-media">
            <CmsImage
              image={service.image}
              sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1024px) 46vw, 390px"
            />
          </div>
        )}
        <div className="public-card-body">
          <span className="public-card-icon" aria-hidden="true">
            <Icon name={serviceIcons[service.slug] ?? 'private'} width={23} height={23} />
          </span>
          <p className="public-card-kicker">Transportation Service</p>
          <h3>{service.title}</h3>
          <p>{service.summary}</p>
          <span className="public-card-action">
            View Service <Icon name="arrow" width={17} />
          </span>
        </div>
      </Link>
    </article>
  );
}

export function LocationCard({ location }: { location: CoverageArea }) {
  return (
    <article className="public-card location-public-card">
      <Link
        href={`/locations/${location.slug}`}
        className="public-card-link"
        aria-label={`View transportation services in ${location.title}`}
      >
        {location.image && (
          <div className="public-card-media location-public-media">
            <CmsImage
              image={location.image}
              sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1024px) 46vw, 390px"
            />
          </div>
        )}
        <div className="public-card-body">
          <span className="public-card-icon" aria-hidden="true">
            <Icon name="mapPin" width={23} height={23} />
          </span>
          <p className="public-card-kicker">Service Area</p>
          <h3>{location.title}</h3>
          <p>{location.summary}</p>
          <span className="public-card-action">
            View Area <Icon name="arrow" width={17} />
          </span>
        </div>
      </Link>
    </article>
  );
}

function MissingMedia({ label, icon }: { label: string; icon: IconName }) {
  return (
    <div className="public-missing-media">
      <Icon name={icon} width={30} height={30} />
      <span>{label}</span>
    </div>
  );
}
