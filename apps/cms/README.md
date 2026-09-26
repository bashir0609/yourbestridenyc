# Payload CMS

Payload 3.90.2, Next App Router, PostgreSQL and public Cloudflare R2 (S3-compatible storage). Open `/admin` (local port 3001). The root route intentionally has no marketing page.

Both apps now use **Next 16.3.6**, which Payload 3.90.2 explicitly supports, and React 19.1.9. Strict peer installation and workspace typechecking passed. **Do not expose this CMS to production yet:** its production build compiled and passed TypeScript but failed during page-data collection because `PAYLOAD_SECRET` is missing. Configure the complete environment and test database/storage integration first. See [dependency review](../../DEPENDENCIES.md) for versions, changes and the one remaining moderate audit finding.

## Setup

Run from the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @yourbestride/cms dev
pnpm --filter @yourbestride/cms typecheck
pnpm --filter @yourbestride/cms test
pnpm --filter @yourbestride/cms generate:types
pnpm --filter @yourbestride/cms generate:importmap
pnpm --filter @yourbestride/cms build
```

Create the CMS environment from `.env.example`; the root README documents the exact active variable names. Provision PostgreSQL and a public-marketing Cloudflare R2 bucket. Follow [R2 setup and Vercel deployment](DEPLOYMENT.md) for bucket creation, scoped API credentials, all environment variables and local setup. The database variable is now `DATABASE_URI`; rename any older `DATABASE_URL` deployment setting. No credentials or fake production infrastructure are embedded. Use `DATABASE_PUSH=true` only on a disposable local database. Production rejects schema push; follow [MIGRATIONS.md](MIGRATIONS.md).

During **isolated** first-user setup only, enable `CMS_ALLOW_FIRST_USER=true`, visit `http://localhost:3001/admin`, create the first administrator, disable the flag and restart. Never expose an empty deployment during setup. Use a single instance/operator behind a firewall or ingress allowlist: the empty-user check is not a distributed lock. The creation hook protects Payload's first-register operation independently of normal collection access. It forces the first user's role to Admin and prevents non-admin role changes. Configure production password-reset email before relying on recovery; no email adapter is installed.

## Roles

| Resource                   | Anonymous      | Content Manager   | Lead Manager    | Admin |
| -------------------------- | -------------- | ----------------- | --------------- | ----- |
| Editorial content          | Published read | CRUD and versions | Published read  | Full  |
| Public Media               | Read           | CRUD              | Read            | Full  |
| Leads/applications         | None           | None              | Read/update     | Full  |
| User account               | None           | Own read/update   | Own read/update | Full  |
| User creation/roles/unlock | None           | None              | None            | Full  |
| Globals                    | Read           | Update            | Read            | Full  |

Internal role values: `admin`, `content-manager`, `lead-manager`. Unknown roles and other auth collections are not treated as staff. Lead managers cannot enumerate other user accounts; their assignment picker exposes only themselves. Admins can choose all eligible reviewers. Collection access is defined in `src/access.ts`; user field access and hooks add defense in depth.

## Models

- **Pages:** title, slug, summary, rich content, hero image, SEO.
- **Services:** title, slug, summary, rich content, image, service areas, display fields, SEO.
- **Drivers:** public name, slug, summary, portrait, biography, publication approval, service areas, specialties, featured/display order, SEO. Marketing only, no employment/dispatch records.
- **Fleet Vehicles:** name, slug, summary, category, capacities, description, images, amenities, display fields, SEO. No scheduling or availability.
- **Testimonials:** slug, public attribution, quote, rating, service relationship, publication approval, display fields.
- **Locations:** name, slug, summary, city/region/country, content, image, display fields, SEO.
- **Blog Posts:** title, slug, excerpt, public author name, publication date, rich content, tags, image, SEO.
- **Transportation Leads:** contact, requested service and route, requested time, message, `crmStatus`, `externalLeadId`, `assignedTo`, `sourceCampaign`, consent tracking and internal notes. Inquiries only; status is CRM follow-up metadata, not an operational trip record.
- **Driver Applications:** contact, city, experience, service areas, availability, message, review status, assignment, campaign, consent tracking and internal notes. Separate from public profiles.
- **Users:** Payload authentication plus name and role.
- **Media:** public image uploads, required alt text, optional caption.

Editorial collections use drafts and retain 30 versions. Globals and uploaded media are public immediately. `publishedAt` is metadata, not scheduled publishing. Store no private data in editorial free text. Driver/testimonial approval is checked by the homepage in addition to collection publication.

Site Settings exposes `siteName`, `tagline`, logo, required HTTPS `bookingURL`, public email/phone and default SEO. Navigation/Footer globals contain public links. The web consumes Site Settings; navigation/footer rendering remains code-defined for this first homepage.

## API and privacy boundaries

REST at `/api/[...slug]`, GraphQL at `/api/graphql`, admin at `/admin`. Playground and introspection are disabled in production; relationship depth is capped at 3 and GraphQL complexity at 100. Collection slugs match frontend REST contracts. Read public content anonymously.

Private intake has **no anonymous create or read access**. No public submission endpoints, notifications, CRM synchronization, or applicant uploads exist yet. Future forms need a separately validated, rate-limited server gateway, least-privilege credentials, consent/retention policy and abuse controls. Do not relax collection access to make forms work. Do not collect diagnoses, insurance information or medical records here. This is not a HIPAA-compliance claim.

Payload Local API bypasses access by default; future public-facing callers must use `overrideAccess: false` and the appropriate request identity. Never cache private API responses or expose staff credentials to the browser. CORS is not authorization. CMS-origin-only CSRF trust protects cookie-authenticated writes.

## Storage and hosting

All uploads use Cloudflare R2 through Payload's S3-compatible adapter; local writes and direct browser uploads are disabled. Only JPEG/PNG/WebP/AVIF are accepted, up to 4 MiB per upload to leave room under Vercel's function body limit. Verify total multipart/request limits in deployment. The bucket holds public marketing media only; no resumes, license scans, or private documents. Thumbnail size is 480×320.

`S3_ENDPOINT` is required and must be the HTTPS R2 account endpoint; `S3_REGION` must be `auto`. Configure bucket-scoped R2 credentials and a separate public custom-domain `S3_PUBLIC_URL`. There is no AWS endpoint/region fallback or per-object public ACL. R2 bucket/domain settings govern public delivery. The adapter maps **only** `media`; it does not map leads or driver applications. Future private attachments require a different private bucket and authorized delivery. Test upload, deletion, caching, backups and restoration with actual R2 resources. See [deployment guide](DEPLOYMENT.md).

Use a pooled PostgreSQL connection string; pool maximum is 10 per process, so budget across serverless instances. Production environment validation requires HTTPS origins, strong secret and storage credentials. Apply platform WAF/login/upload rate limits and private staff ingress where possible. Session lifetime is two hours; five failed logins lock accounts for ten minutes.

## Generation and validation

Payload types are configured to generate into `packages/types/src/payload-types.ts`. Automatic generation is disabled; run `generate:types` after schema changes with a configured environment. The generated file is not fabricated or currently exported. Regenerate the checked-in admin import map after dependency/config changes; the current map predates the Payload upgrade and still needs verification with the complete install.

All 18 CMS tests passed, including policy, R2 environment/storage configuration, public/private mapping boundaries, URL validation and bootstrap/role-change hooks. Workspace typechecking and linting also passed. The R2-configured production build compiled successfully, passed TypeScript, then failed during page-data collection for missing `PAYLOAD_SECRET`. Payload admin loading, PostgreSQL connection, live R2 upload/read/delete and database-backed collection loading have not been verified. Import-map/type generation and integration checks still need a configured environment. See [recorded results](DEPLOYMENT.md#8-recorded-results-for-the-r2-configuration-change). Unit policy tests are not proof of HTTP/database authorization. Run all role, draft/version, bootstrap, privilege-escalation and upload tests on an isolated staging database before release.
