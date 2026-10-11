# Single Next.js and Payload application

`apps/web` is the only deployable application. It combines the Next.js 16 public website, Payload CMS 3.x, Payload admin, APIs, and database migrations.

## Routes

- `/` and public content routes: marketing website
- `/admin`: Payload administration
- `/api/[...slug]`: Payload REST routes, including authenticated internal intake
- `/api/graphql`: Payload GraphQL
- `/api/inquiries/*` and `/api/applications/*`: public same-origin form handlers
- `/api/revalidate`: authenticated cache invalidation
- `/book`: validated HTTPS handoff to Limo Anywhere

Payload and the marketing site use separate App Router route groups so `/admin` is not wrapped by the public navbar/footer. Server-rendered website content reads Payload through the Local API and applies Payload access control; CMS credentials are never exposed to browser components.

## Setup

From the repository root:

```sh
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @yourbestride/web dev
```

Set `SITE_URL=http://localhost:3000` for local development. Supply a development Neon/local PostgreSQL database and a dedicated development R2 bucket. There is no `CMS_URL` setting and no second server to start.

The complete environment contract is `.env.example`. Production details are in [`../../docs/DEPLOYMENT.md`](../../docs/DEPLOYMENT.md), and migration policy is in [`../../docs/MIGRATIONS.md`](../../docs/MIGRATIONS.md).

## Content reads and caching

The server-only client in `src/lib/cms` allows only the public resources required by the website. It requests published records, requires approval for public drivers/testimonials, projects records into public view models, and rejects malformed content. No staff token is used.

Next route/query caching uses five-minute revalidation and resource tags. The authenticated revalidation endpoint supports immediate expiry after approved publishing workflows. Never cache authenticated admin, user, lead, or application responses.

## Public intake

The browser posts to same-origin route handlers. Those handlers validate and bound input, derive a pseudonymous HMAC fingerprint from a trusted proxy address, and forward to `/api/public-intake` using server-only `INTAKE_API_SECRET`. Payload validates the strict envelope, applies database-backed rate limiting, and writes with Local API access override only after internal authentication.

This architecture retains an authenticated internal boundary even though both handlers run in one deployment. The secret and fingerprint key must never use `NEXT_PUBLIC_`. Forms do not collect diagnoses, insurance details, medical records, files, reservations, or trip-operation data.

## Payload administration

Payload roles are Admin, Content Manager, and Lead Manager. `/admin` is protected by Payload authentication, login attempt limits, secure production cookies, role access policies, no-store/noindex headers, and optional `ADMIN_ALLOWED_IPS`. Add Vercel Firewall login rate limits in production.

Set `CMS_ALLOW_FIRST_USER=true` only during isolated first-admin bootstrap, then set it back to `false` and redeploy.

## Storage

Cloudflare R2 stores public marketing images only. The Payload S3-compatible adapter maps only the Media collection, disables local storage/client uploads, and uses a public custom domain. Private documents are not implemented.

## Analytics and booking

`NEXT_PUBLIC_GTM_ID` loads Google Tag Manager on public routes. The application pushes validated, allowlisted page-view and conversion events to `window.dataLayer` without personal form data; GA4 delivery must be configured in GTM. Booking links emit `booking_click` and hand users to the configured Limo Anywhere HTTPS URL. The application does not store reservations or implement dispatch, assignment, availability, or trip management.

## Validation

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter @yourbestride/web test:smoke
```

A production build requires complete Payload, Neon, and R2 environment values. Unit tests do not prove live Neon, R2, Resend, browser, or role-boundary behavior; verify those against isolated Preview infrastructure before production.
