# Your Best Ride Inc.

Premium New York transportation marketing foundation. **Limo Anywhere owns reservations and all transportation operations.** This repository contains no dispatch, driver assignment, vehicle scheduling, or trip management system.

## Workspace

```text
apps/web        Next.js 16 public website (port 3000)
apps/cms        Payload 3 admin/API (port 3001)
packages/ui     Shared shadcn-style/Radix primitives and Tailwind brand tokens
packages/config Shared strict TypeScript configuration
packages/types  Marketing types and Zod inquiry validation
```

Use Node 22.13+ or Node 24 and pnpm 10.15.1. Install from the repository root; do not install each application separately.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm lint
pnpm --filter @yourbestride/web build
pnpm --filter @yourbestride/web test:smoke
```

`pnpm build` also builds the CMS and requires its environment configuration. `pnpm format` formats source and documentation. The shared packages export source; Next transpiles the UI package. Turbo build caching is disabled because CMS content changes independently of Git. Only explicit application environment variables pass through Turbo.

## Implemented

- Responsive homepage: navigation, hero, CMS-backed services, fleet, approved driver profiles, testimonials, **Transportation Coverage Areas**, CTAs, contact, footer. Static service/fleet fallback records are removed; published CMS images are supported.
- Montserrat headings, Inter body, subtle reduced-motion-aware animation, keyboard focus and mobile navigation.
- Shared tokens: primary `#0B0B0B`, gold `#D9A441`, gold light `#F2C96B`, white `#FFFFFF`, gray `#F5F5F5`, text `#222222`.
- `/book`: user-initiated HTTPS handoff only. No credentials, passenger data, payment form, API integration, or reservation confirmation.
- Anonymous, bounded, publication-filtered CMS reads, five-minute caching, authenticated revalidation endpoint, metadata, robots, sitemap.
- Nine requested content/intake collections, plus Users and public Media; Site Settings, Navigation, and Footer globals.
- Admin, Content Manager, and Lead Manager roles; private intake permissions and protection against self-service role changes.
- Leads include `crmStatus`, `externalLeadId`, `assignedTo`, `sourceCampaign`. Driver profiles include `serviceAreas`, `specialties`, `featured`, `displayOrder` and remain marketing-only.
- PostgreSQL adapter, public Cloudflare R2 (S3-compatible) image storage, generated-type/import-map scripts, migration workflow, environment templates, and focused tests.

## Configuration

Application templates are `apps/web/.env.example` and `apps/cms/.env.example`. Create each application's local environment file; a root environment file is not automatically loaded by Next. Never commit credentials.

### Web

| Variable                         | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `SITE_URL`                       | Canonical HTTPS origin; omit for noindex preview deployments       |
| `CMS_URL`                        | CMS origin; HTTP localhost permitted only in development           |
| `LIMO_ANYWHERE_BOOKING_URL`      | Verified external HTTPS booking URL; overrides CMS Site Settings   |
| `CONTACT_EMAIL`, `CONTACT_PHONE` | Verified contact overrides; phone must be international `+` digits |
| `REVALIDATION_SECRET`            | Independent random secret, at least 32 characters; optional        |

Public CMS reads require **no token**. `CMS_READ_TOKEN` from an earlier template is unused and should not be configured. Contact/booking values fall back to the public CMS Site Settings. All five homepage sections use the typed server-only client in `apps/web/src/lib/cms/`; missing configuration, empty published collections and request failures have separate states. No service/fleet/driver/review records are fabricated.

Set **`CMS_MEDIA_URL`** on the web app to the same public HTTPS origin as CMS `S3_PUBLIC_URL`. The frontend accepts only validated images under that origin's `/media/` path, and never receives R2 keys. Rebuild after changing this image allowlist. Services, fleet and driver photos require populated Media relationships, supported MIME types, dimensions and alt text.

### CMS

Required: `PAYLOAD_SECRET` (32+ characters), `DATABASE_URI` (PostgreSQL), `CMS_URL`, `S3_BUCKET`, `S3_REGION=auto`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_ENDPOINT` (the authenticated Cloudflare R2 account endpoint), and `S3_PUBLIC_URL` (a separate public HTTPS media origin/custom domain).

Optional: `CMS_CORS_ORIGINS` (comma-separated exact origins), `DATABASE_PUSH`, `CMS_ALLOW_FIRST_USER`. The CMS now uses `DATABASE_URI`, not the old `DATABASE_URL`; rename that variable in existing local/Vercel settings. R2 requires `S3_ENDPOINT` and region `auto`; the old `S3_FORCE_PATH_STYLE` variable is no longer used.

Generate secrets locally with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Use independent values for CMS auth and web revalidation. Database schema push is rejected in production. First-admin registration is disabled unless explicitly enabled during isolated setup; immediately disable it after creating the first administrator. Never expose an empty CMS publicly during bootstrap.

See [Cloudflare R2 setup and Vercel deployment](apps/cms/DEPLOYMENT.md), [CMS permissions](apps/cms/README.md), [migration policy](apps/cms/MIGRATIONS.md), and [web integration](apps/web/README.md).

Public media is limited to approved logo, fleet, driver profile, service, blog and testimonial images. Driver applications remain private database records with no attachment upload workflow. Any future sensitive files require a separate private R2 bucket and authenticated delivery; never put them in public Media.

## Security and validation status

**This is an initial scaffold, not cleared for production deployment.**

- Both apps use **Next 16.3.6**, with **React/React DOM 19.1.9**. Payload and its adapters are **3.90.2**. Framework versions are centrally defined in the pnpm catalog; there are no mixed Next majors.
- After the CMS client/homepage integration, `pnpm typecheck`, `pnpm lint` and **58 tests** passed (23 web, 18 CMS, 17 shared schemas). Client/query tests use synthetic responses, not a live CMS.
- `pnpm build` failed when the CMS reached its missing-environment check and interrupted the web task. The web production build was then run separately and **passed**, as did its production smoke tests. See [web integration](apps/web/README.md), [earlier R2 verification](apps/cms/DEPLOYMENT.md#8-recorded-results-for-the-r2-configuration-change), and [dependency review](DEPENDENCIES.md).
- The CMS compiled and passed TypeScript but its production build **failed at page-data collection: missing `PAYLOAD_SECRET`**. Supply its complete environment and verify the build, database and storage before release; no dummy credentials were used.
- `pnpm audit --prod` reported **one moderate advisory**, in transitive esbuild migration tooling, and no high/critical production findings. Track the upstream fix; do not expose esbuild's development server. Audit counts change over time.
- No live PostgreSQL, Cloudflare R2, Limo Anywhere, browser accessibility, or production deployment tests have been performed.

## Vercel deployment checklist

1. Configure the CMS build environment and complete `pnpm install --frozen-lockfile`, typecheck, tests, lint, production builds, audit, and browser QA.
2. Use two Vercel projects from the same repository, root directories `apps/web` and `apps/cms`. Enable access to shared workspace files outside the project root and use pnpm from the root workspace.
3. Configure each app's variables separately. Preview environments need separate database/storage and must not be indexed.
4. Provision pooled PostgreSQL connections, bucket-scoped Cloudflare R2 credentials, public image delivery, backups, and restoration procedures. Never use Vercel's filesystem for persistence.
5. Generate/review the initial database migration and apply it as one controlled release job. Generate Payload types and the admin import map after schema changes.
6. Isolate CMS bootstrap, create the admin, then disable first registration. Configure WAF/login rate limits and a production email adapter for password resets.
7. Publish verified content and official booking/contact details. Replace legal placeholder pages with reviewed documents.
8. Test publication/unpublication, role boundaries, storage, booking destination, robots and sitemap.

### Scope intentionally deferred

Public lead/application submission endpoints, email notifications, private applicant documents, CRM synchronization, detail-page templates, and a CMS block renderer are not part of this initial homepage scaffold. The private collections and validation foundation are ready for a separately secured intake implementation. Do not open anonymous collection writes to implement forms. Define consent, retention, abuse protection and data minimization first; do not collect medical records. Navigation/Footer globals are prepared, while the initial website navigation remains code-defined.

No Git repository has been initialized locally, no commits have been created, and no remote deployment or push has been performed.
