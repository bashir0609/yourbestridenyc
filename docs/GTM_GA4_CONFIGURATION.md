# GTM-managed GA4 configuration

The public application loads Google Tag Manager container `GTM-PN2XW523`. Application analytics are validated and pushed to `window.dataLayer`; the application does not load `gtag.js`, configure GA4, or send directly through `window.gtag`.

## Required GTM configuration

1. Create one Google tag for the approved GA4 measurement ID.
2. Disable automatic page views in that Google tag (`send_page_view: false`).
3. In GA4, review Enhanced Measurement and disable browser-history-based page views so App Router navigation is not counted twice.
4. Create a Custom Event trigger named `page_view` that matches the application event `page_view` exactly.
5. Create one GA4 Event tag for `page_view` using these data layer variables:
   - `page_path`
   - `page_location`
   - `page_title`
6. Create one Custom Event trigger and one GA4 Event tag for each approved conversion event:
   - `booking_click`
   - `phone_click`
   - `email_click`
   - `contact_form_submit`
   - `transportation_inquiry_submit`
   - `driver_application_submit`
7. Forward only the parameters provided by the application. Do not add DOM scraping, form variables, click text, phone values, email values, route query strings, booking references, or user-provided fields.
8. Publish the reviewed container version only after Tag Assistant and GA4 DebugView verification.

## Page-view behavior

The public root layout emits one `page_view` on initial hydration and one event when the App Router pathname actually changes. Query strings and fragments are excluded. The payload contains:

```json
{
  "event": "page_view",
  "page_path": "/services",
  "page_location": "https://yourbestridenyc.vercel.app/services",
  "page_title": "Transportation Services | YourBestRide"
}
```

Payload admin uses a separate route-group layout and does not load GTM or emit public page views.

## Approved conversion examples

```json
{
  "event": "booking_click",
  "source_page": "/",
  "button_location": "hero"
}
```

```json
{
  "event": "contact_form_submit",
  "source_page": "/"
}
```

The application rejects unknown events, unknown parameters, control characters, email-like values, phone-like values, and values outside its length limits.

## Verification checklist

- GTM initializes once.
- Initial load emits one `page_view`.
- Each client-side pathname transition emits one `page_view`.
- Query-string-only changes emit no page view.
- Booking, phone, email, and successful form actions emit one matching custom event.
- GA4 DebugView receives each event once.
- No names, email addresses, phone numbers, messages, medical details, passenger details, pickup/drop-off addresses, or booking references appear in Tag Assistant.
- `/admin` contains no public GTM installation.
