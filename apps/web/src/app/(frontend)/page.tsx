import Image from 'next/image';
import Link from 'next/link';
import type { Metadata, ResolvingMetadata } from 'next';
import { Button, Card, Container } from '@/ui';
import { Icon, type IconName } from '@/components/icon';
import { DriverCard, TestimonialCard, VehicleArt } from '@/components/content-cards';
import { Reveal } from '@/components/reveal';
import { getHomeContent, getBusinessConfig } from '@/lib/cms/queries';
import { CmsEmptyState, CmsImage } from '@/components/cms-content';
import { getPublicConfig } from '@/lib/config';
import { ContactForm } from '@/components/forms/ContactForm';
import { TrackLink } from '@/components/analytics';

export const revalidate = 300;
export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const { siteUrl } = getPublicConfig();
  const inherited = await parent;
  return siteUrl
    ? {
        alternates: { canonical: `${siteUrl}/` },
        openGraph: { ...inherited.openGraph, url: `${siteUrl}/` },
      }
    : {};
}
const serviceIcons: Record<string, IconName> = {
  medical: 'medical',
  airport: 'airport',
  corporate: 'corporate',
  private: 'private',
};

export default async function Home() {
  const content = await getHomeContent();
  const {
    address,
    bookingUrl,
    email,
    faxDisplay,
    phone,
    phoneDisplay,
    secondaryPhone,
    secondaryPhoneDisplay,
  } = await getBusinessConfig();
  const { services, fleet } = content;
  return (
    <main id="main-content">
      <section className="hero" aria-labelledby="hero-title">
        <Image
          src="/hero-journey-4.png"
          alt="Professional driver standing beside a black SUV outside a New York building"
          fill
          priority
          sizes="100vw"
          className="hero-background"
        />
        <div className="hero-shade" aria-hidden="true" />
        <Container className="hero-inner">
          <div className="hero-copy">
            <p className="eyebrow">
              <span /> PROFESSIONAL TRANSPORTATION IN NEW YORK
            </p>
            <h1 id="hero-title">
              YOUR BEST RIDE,
              <br />
              <span>EVERY TIME.</span>
            </h1>
            <p className="hero-description">
              Reliable transportation for medical appointments, airport transfers, corporate travel,
              and private rides across New York.
            </p>
            <div className="hero-actions">
              <TrackLink
                href="/book"
                className="button button-gold"
                eventName="booking_click"
                eventParams={{ source_page: '/', button_location: 'hero' }}
              >
                BOOK A RIDE <Icon name="arrow" width={18} />
              </TrackLink>
              <Button href="/services" variant="outline">
                EXPLORE SERVICES
              </Button>
            </div>
          </div>
        </Container>
        <div className="hero-curve" aria-hidden="true" />
      </section>

      <div className="journey-strip">
        <Container>
          <span className="strip-intro">Wherever life takes you</span>
          <a href="#services">
            <Icon name="medical" />
            Appointments
          </a>
          <a href="#services">
            <Icon name="airport" />
            Airport travel
          </a>
          <a href="#services">
            <Icon name="corporate" />
            Business journeys
          </a>
          <a href="#services">
            <Icon name="private" />
            Personal moments
          </a>
        </Container>
      </div>

      <section id="services" className="section services-section" aria-labelledby="services-title">
        <Container>
          <Reveal>
            <div className="section-heading">
              <div>
                <p className="eyebrow">MADE FOR YOUR PLANS</p>
                <h2 id="services-title">
                  Different destinations.
                  <br />
                  <span className="muted-heading">One thoughtful approach.</span>
                </h2>
              </div>
              <p>
                Start with the journey you have in mind.
                <br />
                Explore the details before you make a plan.
              </p>
            </div>
            {!content.services.length && (
              <CmsEmptyState label="services" status={content.status.services} />
            )}
            <div className="service-grid">
              {services.slice(0, 8).map((service, index) => (
                <Card key={service.slug} className="service-card">
                  {service.image && <CmsImage image={service.image} />}
                  <div className="service-card-top">
                    <span className="icon-tile">
                      <Icon name={serviceIcons[service.slug] ?? 'private'} width={25} height={25} />
                    </span>
                    <span className="card-index">{String(index + 1).padStart(2, '0')}</span>
                  </div>
                  <h3>{service.title}</h3>
                  <p>{service.summary}</p>
                  <Link href="#contact" className="text-link">
                    Ask about this journey <Icon name="arrow" width={18} />
                  </Link>
                </Card>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      <section className="approach-section" aria-labelledby="approach-title">
        <Container className="approach-grid">
          <div className="approach-art" aria-hidden="true">
            <div className="route-orbit orbit-one" />
            <div className="route-orbit orbit-two" />
            <span className="route-end route-start">
              <Icon name="pin" />
            </span>
            <span className="route-end route-finish">
              <Icon name="private" />
            </span>
            <div className="approach-monogram">
              Y<span>R</span>
            </div>
            <span className="approach-art-caption">IT’S MORE THAN GETTING THERE.</span>
          </div>
          <Reveal>
            <p className="eyebrow">A LITTLE MORE INTENTION</p>
            <h2 id="approach-title">
              The details make
              <br />
              the difference.
            </h2>
            <p className="approach-description">
              A well-planned journey starts with the right conversation. Let’s start with what
              matters to you.
            </p>
            <div className="approach-items">
              <div>
                <span>01</span>
                <div>
                  <h3>Start with your itinerary</h3>
                  <p>Where you’re going, when you need to arrive, and the stops along the way.</p>
                </div>
              </div>
              <div>
                <span>02</span>
                <div>
                  <h3>Talk through the details</h3>
                  <p>Ask about passenger needs, luggage, accessibility, and vehicle options.</p>
                </div>
              </div>
              <div>
                <span>03</span>
                <div>
                  <h3>Confirm before you travel</h3>
                  <p>
                    Check availability, pricing, and pickup arrangements with the booking provider.
                  </p>
                </div>
              </div>
            </div>
            <TrackLink
              href="/book"
              className="text-link light-link"
              eventName="booking_click"
              eventParams={{ source_page: '/', button_location: 'approach_section' }}
            >
              Take the next step <Icon name="arrow" width={18} />
            </TrackLink>
          </Reveal>
        </Container>
      </section>

      <section id="fleet" className="section fleet-section" aria-labelledby="fleet-title">
        <Container>
          <Reveal>
            <div className="section-heading">
              <div>
                <p className="eyebrow">ROOM FOR YOUR JOURNEY</p>
                <h2 id="fleet-title">Find your kind of ride.</h2>
              </div>
              <p>
                Different plans call for different spaces.
                <br />
                Confirm your vehicle when arranging your trip.
              </p>
            </div>
            {!fleet.length && (
              <CmsEmptyState label="fleet vehicles" status={content.status['fleet-vehicles']} />
            )}
            <div className="fleet-grid">
              {fleet.slice(0, 6).map((vehicle, index) => (
                <Card key={vehicle.slug} className="fleet-card">
                  {vehicle.image ? (
                    <CmsImage image={vehicle.image} />
                  ) : (
                    <div className="fleet-art">
                      <span className="fleet-type">CONCEPT ART · PHOTO NOT PROVIDED</span>
                      <VehicleArt type={(['sedan', 'suv', 'van'] as const)[index % 3]} />
                    </div>
                  )}
                  <div className="card-body">
                    <h3>{vehicle.title}</h3>
                    <p>{vehicle.summary}</p>
                    {vehicle.passengerCapacity !== undefined && (
                      <p>
                        Up to {vehicle.passengerCapacity} passengers
                        {vehicle.luggageCapacity !== undefined
                          ? ` · ${vehicle.luggageCapacity} luggage capacity`
                          : ''}
                      </p>
                    )}
                    <Link href="#contact" className="text-link">
                      Discuss vehicle options <Icon name="arrow" width={18} />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          </Reveal>
        </Container>
      </section>

      <section id="drivers" className="section people-section" aria-labelledby="drivers-title">
        <Container>
          <Reveal>
            <div className="section-heading">
              <div>
                <p className="eyebrow">THE PEOPLE BEHIND THE JOURNEY</p>
                <h2 id="drivers-title">A personal introduction.</h2>
              </div>
              <p>
                Get to know the people behind YourBestRide.
                <br />
                Only approved profiles are published here.
              </p>
            </div>
            <div className={content.drivers.length ? 'driver-grid' : 'empty-driver-grid'}>
              {content.drivers.length ? (
                content.drivers
                  .slice(0, 6)
                  .map((driver) => <DriverCard key={driver.slug} driver={driver} />)
              ) : (
                <>
                  <div>
                    <DriverCard />
                    <CmsEmptyState label="driver profiles" status={content.status.drivers} />
                  </div>
                  <div className="people-note">
                    <span className="small-line" />
                    <h3>
                      A name. A face.
                      <br />A real introduction.
                    </h3>
                    <p>
                      We’re keeping this space honest. Team stories belong here when they’re ready
                      to be shared—not before.
                    </p>
                    <Link href="#contact" className="text-link">
                      Get in touch <Icon name="arrow" width={18} />
                    </Link>
                  </div>
                </>
              )}
            </div>
          </Reveal>
        </Container>
      </section>

      <section
        id="testimonials"
        className="section testimonial-section"
        aria-labelledby="testimonials-title"
      >
        <Container>
          <Reveal>
            <div className="center-heading">
              <p className="eyebrow">IN GOOD COMPANY</p>
              <h2 id="testimonials-title">Every journey has a story.</h2>
              <p>A place for real feedback, shared with permission.</p>
            </div>
            <div className={content.testimonials.length ? 'testimonial-grid' : 'testimonial-empty'}>
              {content.testimonials.length ? (
                content.testimonials
                  .slice(0, 6)
                  .map((testimonial) => (
                    <TestimonialCard key={testimonial.slug} testimonial={testimonial} />
                  ))
              ) : (
                <div>
                  <TestimonialCard />
                  <CmsEmptyState label="testimonials" status={content.status.testimonials} />
                </div>
              )}
            </div>
          </Reveal>
        </Container>
      </section>

      <section id="coverage" className="section coverage-section" aria-labelledby="coverage-title">
        <Container className="coverage-grid">
          <Reveal>
            <p className="eyebrow">FROM HERE TO WHAT’S NEXT</p>
            <h2 id="coverage-title">
              Transportation
              <br />
              coverage areas.
            </h2>
            <p className="coverage-description">
              Every itinerary starts with a place. Check your pickup and destination before making a
              reservation.
            </p>
            {content.locations.length ? (
              <ul className="location-list">
                {content.locations.slice(0, 12).map((location) => (
                  <li key={location.slug}>
                    <Icon name="pin" />
                    <div>
                      <h3>{location.title}</h3>
                      <p>{location.summary}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="coverage-empty">
                <Icon name="pin" />
                <div>
                  <h3>Ask about your route.</h3>
                  <CmsEmptyState label="coverage areas" status={content.status.locations} />
                </div>
              </div>
            )}
            <Button href="#contact" variant="dark">
              Ask about your route <Icon name="arrow" width={18} />
            </Button>
          </Reveal>
          <div
            className="coverage-map"
            role="img"
            aria-label="Decorative route illustration, not a map of actual service coverage"
          >
            <svg viewBox="0 0 540 460" fill="none" aria-hidden="true">
              <defs>
                <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M40 0H0v40" stroke="#dfdfd9" strokeWidth=".7" />
                </pattern>
              </defs>
              <path fill="url(#map-grid)" d="M0 0h540v460H0z" />
              <g stroke="#deded6" strokeWidth="14">
                <path d="m-30 280 260-140 160-170M-10 430l290-155L560 88M110-20l120 160 50 135 90 210M410-20l-40 215 190 195" />
              </g>
              <g stroke="#fdfdf9" strokeWidth="9">
                <path d="m-30 280 260-140 160-170M-10 430l290-155L560 88M110-20l120 160 50 135 90 210M410-20l-40 215 190 195" />
              </g>
              <path
                d="m129 335 151-80 63-38 24-130"
                stroke="#bd8c32"
                strokeWidth="3"
                strokeDasharray="7 6"
              />
              <circle cx="129" cy="335" r="26" fill="#d9a441" opacity=".15" />
              <circle cx="129" cy="335" r="8" fill="#bd8c32" stroke="white" strokeWidth="3" />
              <circle cx="367" cy="87" r="26" fill="#d9a441" opacity=".15" />
              <circle cx="367" cy="87" r="8" fill="#bd8c32" stroke="white" strokeWidth="3" />
            </svg>
            <div className="map-label">
              <Icon name="pin" width={18} />
              <span>Your route starts a conversation</span>
            </div>
            <span className="map-disclaimer">DECORATIVE ILLUSTRATION · NOT ACTUAL COVERAGE</span>
          </div>
        </Container>
      </section>

      <section className="cta-section" aria-labelledby="cta-title">
        <Container>
          <div>
            <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
            <h2 id="cta-title">
              Let’s make the journey
              <br />
              something to look forward to.
            </h2>
            <p>Have a destination in mind? Take the next step.</p>
          </div>
          <TrackLink
            href="/book"
            className="button button-gold"
            eventName="booking_click"
            eventParams={{ source_page: '/', button_location: 'primary_cta' }}
          >
            Plan your ride <Icon name="arrow" width={18} />
          </TrackLink>
        </Container>
      </section>

      <section id="contact" className="section contact-section" aria-labelledby="contact-title">
        <Container>
          <div className="contact-layout">
            <div>
              <p className="eyebrow">LET&apos;S TALK ABOUT YOUR PLANS</p>
              <h2 id="contact-title">A good journey starts here.</h2>
              <p>
                Ask about your route, vehicle options, or booking arrangements.
                <br />
                Please don&apos;t share medical or other sensitive information by email.
              </p>
            </div>
            <div className="contact-links">
              {phone && (
                <TrackLink
                  className="contact-link"
                  href={`tel:${phone}`}
                  eventName="phone_click"
                  eventParams={{ source_page: '/', button_location: 'contact_section' }}
                >
                  <Icon name="phone" />
                  <span>
                    <small>CALL TO DISCUSS YOUR TRIP</small>
                    {phoneDisplay}
                  </span>
                  <Icon name="arrow" />
                </TrackLink>
              )}
              <TrackLink
                className="contact-link"
                href={`tel:${secondaryPhone}`}
                eventName="phone_click"
                eventParams={{ source_page: '/', button_location: 'contact_section_secondary' }}
              >
                <Icon name="phone" />
                <span>
                  <small>SECONDARY PHONE</small>
                  {secondaryPhoneDisplay}
                </span>
                <Icon name="arrow" />
              </TrackLink>
              <div className="contact-link contact-detail">
                <Icon name="pin" />
                <address>
                  <small>BUSINESS ADDRESS</small>
                  {address.street}
                  <br />
                  {address.city}, {address.state} {address.postalCode}
                </address>
              </div>
              <div className="contact-link contact-detail">
                <Icon name="phone" />
                <span>
                  <small>FAX</small>
                  {faxDisplay}
                </span>
              </div>
              {email && (
                <TrackLink
                  className="contact-link"
                  href={`mailto:${email}`}
                  eventName="email_click"
                  eventParams={{ source_page: '/', button_location: 'contact_section' }}
                >
                  <Icon name="mail" />
                  <span>
                    <small>EMAIL YOUR GENERAL ENQUIRY</small>
                    {email}
                  </span>
                  <Icon name="arrow" />
                </TrackLink>
              )}

              {bookingUrl && (
                <TrackLink
                  href="/book"
                  className="text-link"
                  eventName="booking_click"
                  eventParams={{ source_page: '/', button_location: 'contact_section' }}
                >
                  Continue to booking information <Icon name="arrow" width={18} />
                </TrackLink>
              )}
            </div>
          </div>
          <div className="contact-form-wrapper">
            <ContactForm sourcePage="/" />
          </div>
        </Container>
      </section>
    </main>
  );
}
