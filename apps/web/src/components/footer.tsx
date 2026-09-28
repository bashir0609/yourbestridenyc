import Link from 'next/link';
import { Container } from '@/ui';
import { getBusinessConfig } from '@/lib/cms/queries';
import { Brand } from './navigation';
import { Icon } from './icon';
import { TrackLink } from './analytics';

export async function Footer() {
  const { email, phone } = await getBusinessConfig();
  return (
    <footer className="site-footer">
      <Container>
        <div className="footer-grid">
          <div className="footer-brand">
            <Brand />
            <p>
              A little more intention.
              <br />
              Every mile of the journey.
            </p>
          </div>
          <div>
            <h2>Explore</h2>
            <Link href="/#services">Our services</Link>
            <Link href="/#fleet">Fleet & vehicle options</Link>
            <Link href="/#drivers">Our people</Link>
            <Link href="/#coverage">Coverage areas</Link>
          </div>
          <div>
            <h2>Your journey</h2>
            <TrackLink
              href="/book"
              eventName="booking_click"
              eventParams={{ source_page: 'current', button_location: 'footer' }}
            >
              Plan your ride
            </TrackLink>
            <Link href="/#contact">Contact information</Link>
            <Link href="/legal/privacy">Privacy notice</Link>
            <Link href="/legal/terms">Terms of service</Link>
          </div>
          <div>
            <h2>Get in touch</h2>
            {phone && (
              <TrackLink
                href={`tel:${phone}`}
                eventName="phone_click"
                eventParams={{ source_page: 'current', button_location: 'footer' }}
              >
                <Icon name="phone" width={16} />
                {phone}
              </TrackLink>
            )}
            {email && (
              <TrackLink
                className="break-contact"
                href={`mailto:${email}`}
                eventName="email_click"
                eventParams={{ source_page: 'current', button_location: 'footer' }}
              >
                <Icon name="mail" width={16} />
                {email}
              </TrackLink>
            )}
            {!phone && !email && (
              <p>
                Business contact details
                <br />
                have not yet been published.
              </p>
            )}
            <span className="footer-note">
              Please don’t send medical or other sensitive information by email.
            </span>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Your Best Ride Inc.</span>
          <span>Thoughtfully designed around the journey.</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </Container>
    </footer>
  );
}
