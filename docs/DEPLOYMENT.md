# Single Vercel deployment

## Architecture

Your Best Ride runs as one Next.js 16 application from `apps/web`:

- Public website at `https://yourbestride.com`
- Payload admin at `https://yourbestride.com/admin`
- Payload REST and GraphQL APIs under `/api`
- Public form route handlers and authenticated internal intake endpoint under `/api`
- Neon PostgreSQL for Payload and lead data
- Cloudflare R2 for public marketing media
- Resend for form notifications
- GA4 for non-PII conversion analytics
- Limo Anywhere for booking and transportation operations

There is no separate CMS deployment or CMS origin. `CMS_URL` is not used.

## Vercel project

Create one Vercel project with:

- Repository root: this repository
- Root directory: `apps/web`
- Framework preset: Next.js
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Node.js: a version accepted by the root `engines` field
- Production domain: `yourbestride.com`

Vercel must be permitted to read workspace packages outside `apps/web`. Configure Preview and Production variables separately. Use a Neon branch and non-production R2 bucket for Preview where integration testing is required.

## Production environment

Use `apps/web/.env.example` as the credential-free contract. Store values in Vercel Environment Variables, not Git. Required production values are:

- `SITE_URL=https://yourbestride.com`
- `PAYLOAD_SECRET`
- `DATABASE_URI` using a Neon TLS connection string
- `DATABASE_PUSH=false`
- `INTAKE_API_SECRET`
- `INTAKE_HASH_SECRET`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT`
- `S3_REGION=auto`
- `S3_PUBLIC_URL`
- `CMS_MEDIA_URL` matching the approved public media origin
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NOTIFICATION_EMAIL`
- `NEXT_PUBLIC_GA_ID`
- `LIMO_ANYWHERE_BOOKING_URL`
- `REVALIDATION_SECRET`

`CMS_ALLOW_FIRST_USER` must remain `false` except during isolated first-admin bootstrap. `ADMIN_ALLOWED_IPS` is optional defense in depth; prefer Vercel Firewall rules when staff do not have stable addresses.

## Admin security

Payload authentication and collection access rules are the primary controls for `/admin`. The application additionally sends `noindex`, `nofollow`, and `no-store` headers for admin routes. If `ADMIN_ALLOWED_IPS` is populated, requests without a matching Vercel-forwarded client address receive a generic 404.

Production setup requirements:

1. Add a Vercel Firewall rate limit for login and admin traffic.
2. Restrict `/admin` by IP only when operationally practical.
3. During isolated bootstrap, set `CMS_ALLOW_FIRST_USER=true`, create the first administrator, then immediately set it to `false` and redeploy.
4. Use individual staff accounts and the least-privileged role: Admin, Content Manager, or Lead Manager.
5. Do not expose `PAYLOAD_SECRET`, database credentials, R2 keys, intake secrets, or Resend credentials to client code. None may use the `NEXT_PUBLIC_` prefix.
6. Keep GraphQL introspection and playground disabled in production.

## Neon PostgreSQL

Create a Neon production project and separate Preview/staging branches. Use the connection string Neon marks appropriate for serverless applications, with TLS required. Keep the database password out of commands, logs, and source control.

Payload's process pool is bounded in `payload.config.ts`. Monitor Neon connection usage and function concurrency before changing that limit.

Do not enable `DATABASE_PUSH` in production. Apply reviewed migrations through one controlled release job as described in `docs/MIGRATIONS.md`; do not run migrations on every serverless startup.

## Cloudflare R2

Use one public-marketing bucket for logos, website images, fleet images, approved driver profile images, service images, blog media, and approved testimonial images. Configure bucket-scoped read/write credentials and a public custom domain.

Do not upload resumes, licenses, medical information, applications, or future sensitive documents to this bucket. Private document uploads are not implemented. A future private workflow requires a separate private bucket and authenticated delivery.

Verify upload, transformed-image creation, read, delete, public URL delivery, cache behavior, and restoration procedures before release.

## Internal intake

Browsers submit to same-origin form route handlers. The server validates and bounds input, creates a pseudonymous rate-limit fingerprint, and forwards to Payload's `/api/public-intake` endpoint using `INTAKE_API_SECRET`. That endpoint rejects unauthenticated calls and stores accepted records through Payload after database-backed rate limiting.

Although both handlers are in one deployment, the authenticated boundary is retained to avoid opening anonymous writes to private Payload collections. Never expose the intake secret to browser code.

## Release order

1. Install with the committed lockfile and run typecheck, lint, tests, and a production build.
2. Back up the Neon production database and verify restoration access.
3. Apply reviewed migrations once from a controlled environment.
4. Confirm migration status.
5. Deploy the single Vercel application.
6. Bootstrap the first admin only if needed, then disable bootstrap.
7. Verify `/`, `/admin`, public collection reads, R2 media, forms, Resend notifications, GA4 events, and Limo Anywhere handoff.
8. Verify legal pages, robots, sitemap, canonical URLs, and production security headers.

## Required client-provided configuration

- Production domain and DNS access
- Neon project and production/Preview database connection strings
- Cloudflare account, R2 bucket, bucket-scoped credentials, and public media domain
- Resend API key, verified sender domain, sender address, and notification recipient
- GA4 Measurement ID
- Limo Anywhere HTTPS booking URL
- Approved contact details
- Reviewed privacy policy and terms
- Staff names, email addresses, and assigned Payload roles

Do not send credentials in source control, tickets, documentation, or public chat. Enter them directly in the relevant provider and Vercel secret stores.
