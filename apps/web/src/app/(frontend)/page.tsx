import Image from 'next/image';
import type { Metadata, ResolvingMetadata } from 'next';
import { Button, Container } from '@/ui';
import { Icon } from '@/components/icon';
import { TestimonialCard } from '@/components/content-cards';
import { Reveal } from '@/components/reveal';
import { getHomeContent, getBusinessConfig } from '@/lib/cms/queries';
import { CmsEmptyState } from '@/components/cms-content';
import {
  ContentEmptyState,
  DriverCard,
  FleetCard,
  LocationCard,
  SectionHeading,
  ServiceCard,
} from '@/components/public-content';
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
            <SectionHeading
              eyebrow="MADE FOR YOUR PLANS"
              title={
                <>
                  Different destinations.{' '}
                  <span className="muted-heading">One thoughtful approach.</span>
                </>
              }
              description="Start with the journey you have in mind and explore the details before you make a plan."
              actionHref="/services"
              actionLabel="Explore Services"
            />
            {services.length ? (
              <div className="public-card-grid public-service-grid">
                {services.slice(0, 8).map((service) => (
                  <ServiceCard key={service.slug} service={service} />
                ))}
              </div>
            ) : (
              <ContentEmptyState
                label="transportation services"
                status={content.status.services}
                actionHref="#contact"
                actionLabel="Discuss Your Journey"
              />
            )}
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
            <SectionHeading
              eyebrow="ROOM FOR YOUR JOURNEY"
              title="Find your kind of ride."
              description="Different plans call for different spaces. Review verified vehicle details before arranging your trip."
              actionHref="/fleet"
              actionLabel="View All Fleet"
            />
            {fleet.length ? (
              <div className="public-card-grid public-fleet-grid">
                {fleet.slice(0, 6).map((vehicle) => (
                  <FleetCard key={vehicle.slug} vehicle={vehicle} />
                ))}
              </div>
            ) : (
              <ContentEmptyState
                label="fleet vehicles"
                status={content.status['fleet-vehicles']}
                actionHref="/book"
                actionLabel="Ask About Vehicle Options"
              />
            )}
          </Reveal>
        </Container>
      </section>

      <section id="drivers" className="section people-section" aria-labelledby="drivers-title">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="THE PEOPLE BEHIND THE JOURNEY"
              title="A personal introduction."
              description="Meet the approved professional profiles published by Your Best Ride."
              actionHref="/drivers"
              actionLabel="View All Drivers"
            />
            {content.drivers.length ? (
              <div className="public-card-grid public-driver-grid">
                {content.drivers.slice(0, 6).map((driver) => (
                  <DriverCard key={driver.slug} driver={driver} />
                ))}
              </div>
            ) : (
              <ContentEmptyState
                label="driver profiles"
                status={content.status.drivers}
                actionHref="#contact"
                actionLabel="Contact Your Best Ride"
              />
            )}
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
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow="FROM HERE TO WHAT’S NEXT"
              title="Transportation coverage areas."
              description="Every itinerary starts with a place. Explore published service areas or ask whether your route is available."
              actionHref="/locations"
              actionLabel="Explore Locations"
            />
            {content.locations.length ? (
              <div className="public-card-grid public-location-grid">
                {content.locations.slice(0, 6).map((location) => (
                  <LocationCard key={location.slug} location={location} />
                ))}
              </div>
            ) : (
              <ContentEmptyState
                label="service areas"
                status={content.status.locations}
                actionHref="#contact"
                actionLabel="Ask About Your Route"
              />
            )}
          </Reveal>
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
