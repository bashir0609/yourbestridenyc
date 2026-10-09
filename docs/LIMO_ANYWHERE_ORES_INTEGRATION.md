# Limo Anywhere ORES 4 integration

## Architecture

The public `/book` route embeds Limo Anywhere's official ORES 4 website widget. Your Best Ride does not implement a reservation engine and does not send reservation data through Payload, NeonDB, or the website's inquiry forms.

The integration consists of:

- `apps/web/src/lib/booking.ts` — approved alias, vendor URLs, and strict booking URL validation.
- `apps/web/src/components/limo-anywhere-booking.tsx` — official widget anchor, `next/script` loader, loading state, client-navigation initialization, and hosted-page fallback.
- `apps/web/src/app/(frontend)/book/page.tsx` — branded booking page and configuration handling.

## Approved configuration

- Company alias: `yourbestride`
- Hosted page: <https://book.mylimobiz.com/v4/yourbestride>
- Widget loader: <https://book.mylimobiz.com/v4/widgets/widget-loader.js>
- Limo Anywhere plan: CORE

Set `LIMO_ANYWHERE_BOOKING_URL` or the Payload `site-settings.bookingURL` field to the approved hosted page. Environment configuration takes precedence over Payload, matching the existing centralized business configuration behavior.

The embed is enabled only when the configured URL resolves to the approved HTTPS origin and alias. This prevents an accidental or compromised CMS value from loading an unrelated booking destination.

## Widget behavior

The official loader scans anchors with `data-ores-widget="website"`, reads `data-ores-alias`, and replaces the anchor with a vendor iframe. It also loads Limo Anywhere's iframe-resizer dependency. The loader runs once when evaluated and does not expose a public re-initialization function.

The component loads it with Next.js `Script` using `afterInteractive`. On a later client-side return to `/book`, it performs a guarded loader reload only when the official anchor is present and has not been initialized. It does not alter the vendor script or assume the iframe's internal form structure.

A persistent external link opens the approved hosted page in a new tab. The original official anchor also remains usable if JavaScript or the loader fails before replacing it.

## Booking flow

1. Website booking CTAs navigate to `/book` and emit the existing `booking_click` GA4 event where tracking is already used.
2. `/book` loads the official ORES widget after hydration.
3. The customer enters reservation details directly into Limo Anywhere's experience.
4. Availability, rates, vehicle/service choices, account behavior, payment, and confirmation are controlled by the company's Limo Anywhere configuration.
5. The website does not treat a CTA click as a completed reservation.

## Testing

Use a vendor-approved non-chargeable scenario:

1. Open `/book` directly in a clean browser session.
2. Navigate to `/book` from the homepage, navigation, service, fleet, driver, and location CTAs.
3. Verify the widget appears at desktop and mobile widths.
4. Verify the hosted-page fallback remains keyboard accessible.
5. Test pickup and destination entry.
6. Test vehicle/service selection and rate display where enabled for the CORE account.
7. Continue only to the final confirmation step unless Limo Anywhere has supplied an approved test mode or scenario.
8. With explicit authorization, submit the test reservation and verify it in Limo Anywhere.

Never submit a chargeable live reservation as an automated test.

## Security and privacy

- No Limo Anywhere administrative credentials are required or stored.
- Passenger, trip, payment, and medical details are handled by Limo Anywhere, not Payload or NeonDB.
- Analytics record only allowlisted, PII-free booking-link click metadata.
- The vendor script is loaded only on `/book`.
- If a Content Security Policy is added later, allow only the exact Limo Anywhere origins needed for scripts, frames, and connections. Do not add wildcard vendor permissions.
- The site's current permissions policy disables geolocation. Customers can still enter pickup locations manually; enabling embedded geolocation should be a separate privacy and security decision.

## Vendor limitations

The embed depends on Limo Anywhere availability, browser third-party cookie behavior, the account's ORES configuration, and the vendor's iframe and resize scripts. Safari may invoke the vendor's own compatibility redirect. Available services, vehicles, rates, payment options, and confirmation behavior cannot be guaranteed by the website.

## Future API integration

A future Limo Anywhere API integration would require a separate approved scope, vendor API access, credential management, privacy review, payment and compliance review, webhook verification, operational ownership, and a threat model. It must not reuse public Payload collections as an operational reservation database.
