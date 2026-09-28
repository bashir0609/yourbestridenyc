# Your Best Ride Inc.

Premium New York transportation marketing, content, and lead-capture platform. Limo Anywhere remains the transportation operations system and owns reservations, dispatch, driver and vehicle assignments, trip management, and operational passenger/driver workflows.

## Architecture

The production application is a single Next.js 16 deployment:

```text
apps/web        Public website, Payload CMS 3.x, /admin, APIs, migrations
packages/ui     Shared UI primitives and brand tokens
packages/config Shared TypeScript configuration
packages/types  Shared marketing and intake schemas/types
```

Runtime services:

- Neon PostgreSQL for Payload and private application records
- Cloudflare R2 for public marketing media only
- Resend for inquiry/application notifications
- GA4 for non-PII analytics
- Limo Anywhere for the external booking handoff and transportation operations

See [deployment](docs/DEPLOYMENT.md), [Neon migrations](docs/MIGRATIONS.md), [content entry](CONTENT_GUIDE.md), and the [future architecture roadmap](docs/FUTURE_ARCHITECTURE_ROADMAP.md).

## Local development

Use Node 22.13+ or Node 24 and pnpm 10.15.1. From the repository root:

```sh
corepack enable
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
pnpm --filter @yourbestride/web dev
```

The public website and Payload admin run together on port 3000. Open `/admin` for Payload. A complete database and R2 environment is required because the CMS configuration fails closed; no credentials are committed.

## Commands

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter @yourbestride/web test:smoke
pnpm --filter @yourbestride/web migrate:create migration_name
pnpm --filter @yourbestride/web migrate
pnpm --filter @yourbestride/web migrate:status
pnpm --filter @yourbestride/web generate:types
pnpm --filter @yourbestride/web generate:importmap
```

Production schema auto-sync is prohibited. `DATABASE_PUSH` must remain `false`; apply reviewed migration artifacts through one controlled job.

## Environment

`apps/web/.env.example` is the combined, credential-free environment contract. There is no separate CMS origin and no `CMS_URL` variable. Important groups are:

- Application: `SITE_URL`
- Payload/Neon: `PAYLOAD_SECRET`, `DATABASE_URI`, `DATABASE_PUSH`, `CMS_ALLOW_FIRST_USER`
- Internal intake: `INTAKE_API_SECRET`, `INTAKE_HASH_SECRET`
- Cloudflare R2: `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT`, `S3_REGION=auto`, `S3_PUBLIC_URL`, `CMS_MEDIA_URL`
- Resend: `RESEND_API_KEY`, `EMAIL_FROM`, `NOTIFICATION_EMAIL`
- Analytics: `NEXT_PUBLIC_GA_ID`
- Booking: `LIMO_ANYWHERE_BOOKING_URL`
- Cache invalidation: `REVALIDATION_SECRET`
- Optional admin defense: `ADMIN_ALLOWED_IPS`

Only `NEXT_PUBLIC_GA_ID` is intended for browser exposure. Store all secrets in local ignored files and Vercel Environment Variables.

## Security boundaries

- Payload collection access and staff roles protect CMS data.
- `/admin` receives no-store/noindex headers and can optionally be restricted with `ADMIN_ALLOWED_IPS`; Vercel Firewall controls are recommended.
- Initial admin registration is disabled unless `CMS_ALLOW_FIRST_USER=true` during isolated bootstrap. Disable it immediately afterward.
- Browser forms cannot write directly to private collections. Same-origin handlers validate input and call the bearer-authenticated internal intake endpoint.
- Public Media is restricted to approved marketing images. Driver applications support no document uploads. Do not put private or healthcare data in the public R2 bucket.
- Public driver profiles are marketing records only and contain no availability, contact, assignment, or trip information.
- The platform does not create reservations or implement Limo Anywhere operational features.

## Deployment

Create one Vercel project rooted at `apps/web` and attach `yourbestride.com`. Configure separate Preview and Production variables and Neon branches. Apply migrations before deploying the compatible release; never run migrations from serverless startup.

Before release, verify Payload login and roles, all required collections, Neon connectivity, R2 upload/read/delete/public delivery, all form storage and Resend notifications, GA4 events, the Limo Anywhere handoff, legal pages, sitemap, robots, and browser accessibility.
