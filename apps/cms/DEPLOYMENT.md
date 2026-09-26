# CMS deployment: PostgreSQL + Cloudflare R2

The CMS uses **Cloudflare R2 (S3-compatible storage)** through Payload's existing `@payloadcms/storage-s3` adapter. The adapter uses the S3 protocol; it does not require an AWS account, an AWS region, an AWS bucket policy, or per-object ACLs. No new storage dependency or collection schema is introduced.

Limo Anywhere remains the transportation operations system. This configuration does not add dispatch, reservations, driver assignment, vehicle scheduling, or trip management.

## 1. Environment contract

`apps/cms/.env.example` is the authoritative credential-free template. It is not a working environment: empty fields intentionally prevent startup. Do not commit a real `.env` or share credentials in chat/logs.

```dotenv
PAYLOAD_SECRET=
DATABASE_URI=
CMS_URL=
CMS_CORS_ORIGINS=http://localhost:3000
DATABASE_PUSH=false
CMS_ALLOW_FIRST_USER=false

# Cloudflare R2 Storage
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT=
S3_REGION=auto
S3_PUBLIC_URL=
```

| Variable               | Meaning                                                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| `PAYLOAD_SECRET`       | Stable, independently generated random auth secret, at least 32 characters; changing it affects sessions      |
| `DATABASE_URI`         | PostgreSQL connection URI from your database provider; use verified TLS and pooled connections as appropriate |
| `CMS_URL`              | Exact CMS origin, no path/trailing slash; HTTPS required for production builds                                |
| `CMS_CORS_ORIGINS`     | Comma-separated exact allowed web origins; optional, HTTPS in production                                      |
| `DATABASE_PUSH`        | `false` by default; `true` only for a disposable development database, rejected in production                 |
| `CMS_ALLOW_FIRST_USER` | `false` except during isolated, single-operator initial bootstrap                                             |
| `S3_BUCKET`            | Public marketing R2 bucket name, not a URL                                                                    |
| `S3_ACCESS_KEY_ID`     | R2 S3-compatible access key ID from the bucket-scoped token                                                   |
| `S3_SECRET_ACCESS_KEY` | Corresponding secret access key, not a general Cloudflare REST bearer token                                   |
| `S3_ENDPOINT`          | Required authenticated R2 endpoint: `https://<account-id>.r2.cloudflarestorage.com`                           |
| `S3_REGION`            | Required literal value `auto`                                                                                 |
| `S3_PUBLIC_URL`        | HTTPS public media origin, normally a custom domain; not the authenticated R2 endpoint                        |

`CMS_URL` and `S3_PUBLIC_URL` are additional required settings because Payload needs its own server origin and separate public object delivery. They contain no credentials. The endpoint validator accepts standard R2 accounts and Cloudflare's `eu`, `us`, and `fedramp` jurisdiction endpoints. Use the jurisdiction matching the bucket; account IDs are 32 hexadecimal characters. `S3_PUBLIC_URL` must be an origin without paths, query strings or embedded credentials. Rate-limited `r2.dev` development URLs are accepted only outside production; use a custom domain for production.

**Migration note:** the CMS now reads `DATABASE_URI`, not `DATABASE_URL`. Rename any previously configured variable in local files, CI and Vercel. There is no silent fallback. `S3_ENDPOINT` is no longer optional and `S3_REGION` cannot be an AWS region. The old `S3_FORCE_PATH_STYLE` setting is removed; path-style addressing is configured explicitly for R2.

Generate a real auth secret only in your secure local environment, for example with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Do not paste the output into this repository. No real credentials or live environment file are supplied by this implementation.

## 2. Create the public R2 bucket

1. Enable R2 in your Cloudflare account and review current billing/usage limits. R2 offers a free allowance, not an unlimited free service; storage and operation costs may apply beyond it. Set usage monitoring. See [current pricing](https://developers.cloudflare.com/r2/pricing/).
2. In **R2 Object Storage**, create a bucket dedicated to approved public marketing images. Choose the location/jurisdiction required by the business; do not mix this bucket with private applicant files.
3. In the bucket's **Settings → Custom Domains**, connect a media subdomain of a domain in the same Cloudflare account. Wait for it to become Active.
4. Use that HTTPS origin as `S3_PUBLIC_URL`. This public delivery URL is distinct from the authenticated `S3_ENDPOINT`.
5. Leave `r2.dev` public development access disabled in production. For an isolated development bucket it can be enabled deliberately, remembering that everything uploaded is public.

Objects generated by this adapter use the `media/` prefix, including thumbnails. Do not use the prefix as a privacy boundary: public bucket objects can be accessed directly if their keys are known.

## 3. Create bucket-scoped R2 credentials

1. In R2 account details, open **Manage API Tokens**.
2. Create an account-owned token where your organization permits it, or an appropriate user token. Prefer **Object Read & Write**, scoped to the public marketing bucket only. Do not grant account-wide bucket administration for routine CMS uploads.
3. Securely record the displayed **Access Key ID** and **Secret Access Key**; the secret is shown once. Set `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` in the CMS environment.
4. Copy the account S3 API endpoint to `S3_ENDPOINT` and set `S3_REGION=auto`. Jurisdictional buckets need their corresponding jurisdiction endpoint.
5. Plan credential rotation and revocation. Keep separate credentials/buckets for production and development/preview environments.

The adapter does not set `public-read` ACLs. Cloudflare bucket/custom-domain settings control public delivery. Direct browser uploads are disabled, so the current workflow does not require browser S3 upload CORS rules. Only the CMS server receives R2 credentials; never use `NEXT_PUBLIC_*` for them.

## 4. Public/private storage rules

| Content                                                                    | Allowed location                                                       |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Approved logo, fleet, driver profile, service, blog and testimonial images | Public `Media` collection → public marketing R2 bucket                 |
| Driver application records                                                 | Existing private PostgreSQL collection; Admin/Lead Manager access only |
| Driver application attachments and future sensitive documents              | **Not implemented**; must not be uploaded to public Media              |

No collection was changed to add attachment fields. Testimonial imagery can be stored as approved public marketing media, but no new testimonial image relationship was added.

Before implementing private documents, provision a **separate private R2 bucket** with no public custom domain and `r2.dev` disabled, plus separate scoped credentials. Add explicitly authorized storage/collection access and server-mediated downloads or short-lived signed URLs. Do not reuse the current public URL generator or `disablePayloadAccessControl: true` mapping. Define retention, malware scanning, audit logging and deletion requirements before collecting documents. Do not place diagnoses, insurance records or other sensitive information in public text/image metadata.

Payload's public `media` mapping is deliberate and exclusive. Private intake collections are not storage mappings or upload collections. Access policies remain unchanged. Public image uploads are limited to JPEG/PNG/WebP/AVIF, 4 MiB per file. Logos must use a supported image format; SVG uploads are not enabled. Enforce Vercel's full multipart request limit as well as the file limit.

## 5. Local development

1. Install from the repository root: `pnpm install --frozen-lockfile`.
2. Copy `apps/cms/.env.example` to `apps/cms/.env` locally. Fill it with your own PostgreSQL and development R2 settings; never commit it. The repository root `.env` is not the CMS app's environment file.
3. Fill the blank template's `CMS_URL` with `http://localhost:3001` and optional `CMS_CORS_ORIGINS=http://localhost:3000` for development. Use a dedicated development R2 bucket; there is no local-filesystem fallback.
4. Provision the PostgreSQL schema following [MIGRATIONS.md](MIGRATIONS.md). `DATABASE_PUSH=true` is only for disposable local databases. Do not enable it for production or migration-managed databases.
5. Run `pnpm --filter @yourbestride/cms dev`. During isolated first-admin bootstrap only, enable `CMS_ALLOW_FIRST_USER`, create the admin, then disable the flag and restart. Do not expose first-register publicly.
6. Run type generation and import-map generation with the configured environment when needed. Verify all 11 collections appear for Admin; Lead Manager and Content Manager must see only their authorized data/actions.
7. For a **production build**, configure an HTTPS `CMS_URL`, HTTPS CORS origins, a custom-domain `S3_PUBLIC_URL`, and `DATABASE_PUSH=false`. Next sets production mode during `build`; localhost development values intentionally fail production validation. Prefer a separate protected staging environment for production-mode tests rather than loosening validation.

### PostgreSQL setup steps

1. Install/start PostgreSQL locally (16+ recommended), or provision a dedicated managed development database. Do not use production for local setup.
2. Create an empty development database and a dedicated login using your provider console or local PostgreSQL administration tool. Grant the schema privileges needed by Payload migrations; do not reuse a superuser for production runtime.
3. Set `DATABASE_URI` privately to that database's connection URI (`postgresql://<user>:<password>@<host>:<port>/<database>` is a format illustration, not supplied credentials). URL-encode reserved characters in credentials; preserve the managed provider's verified TLS requirements. No password/database was generated in the repository.
4. For migration-managed development, set `DATABASE_PUSH=false`, generate/review an initial migration with `pnpm --filter @yourbestride/cms migrate:create initial`, then apply it with `pnpm --filter @yourbestride/cms migrate`. All CMS environment variables must be configured before running these commands. See [migration policy](MIGRATIONS.md) before applying schema changes.
5. For an explicitly disposable local database only, `DATABASE_PUSH=true` is an alternative for development. Do not combine automatic schema push with a production migration history.
6. With the CMS running, verify login, reads/writes and role access against that database. A valid URI string or successful unit test is not proof of connectivity.

### Connect the public website

1. Run the CMS on port 3001 with its complete local environment, database schema and isolated first-admin setup.
2. Set only `CMS_URL=http://localhost:3001` and `CMS_MEDIA_URL` (the public R2 HTTPS origin) in `apps/web/.env.local`, alongside any public website settings. No database, R2 or staff credentials belong in the frontend.
3. Run `pnpm --filter @yourbestride/web dev` on port 3000. Start both apps together with `pnpm dev` only after both environments are configured.
4. As Admin/Content Manager, add real service, fleet, driver, testimonial and location content. Each needs a stable slug and the required public text. Fleet/driver/location summaries and testimonial attribution/quote must be supplied. Mark driver/testimonial `websiteApproved` only after securing permission, then explicitly publish each record.
5. Set `featured` and `displayOrder` to control homepage ordering. Upload approved public images with alt text, then attach service `image`, driver `photo`, or fleet `images`. Their URLs must use the configured public media origin. Do not put private applicant files in Media.
6. The homepage uses only published CMS records, not seeded/fabricated service or fleet data. Verify each section, empty states and the five-minute cache expiry; publishing webhooks are optional and not automatically installed.
7. Unpublish a test record and check it disappears after resource invalidation/TTL. Verify anonymous requests cannot read intake records or drafts, and verify each staff role separately. Perform an actual R2 upload/read/delete check before calling the setup complete.

## 6. Vercel configuration

- Keep the existing separate Vercel projects for `apps/web` and `apps/cms`, on the same Next.js major. Enable access to shared workspace files.
- In the CMS project's **Settings → Environment Variables**, configure every required variable from the table for the intended Production/Preview/Development scope. Use separate preview database/bucket credentials; never let previews write production media.
- Set `CMS_URL` to the CMS's actual HTTPS domain, `CMS_CORS_ORIGINS` to the appropriate HTTPS website origin(s), and `S3_PUBLIC_URL` to the R2 media custom domain.
- Set `DATABASE_URI` to your PostgreSQL provider's pooled connection string, preserving required TLS settings. Budget the configured pool of 10 per process across serverless instances. Apply migrations as one controlled release job using suitable database credentials; do not run schema push in production.
- Keep `DATABASE_PUSH=false` and `CMS_ALLOW_FIRST_USER=false` except for explicitly isolated bootstrap. Configure secrets for both build and runtime: Next imports Payload's config while collecting page data.
- Install from the workspace with the pinned pnpm and lockfile; the CMS build script is `pnpm --filter @yourbestride/cms build` from the repository root (or `pnpm build` when Vercel's working directory is `apps/cms`). Do not accidentally run the whole root build against unrelated app environments.
- Set the public CMS origin (`CMS_URL`) and public media origin (`CMS_MEDIA_URL`, same origin as CMS `S3_PUBLIC_URL`) on the website project. Do not copy R2 keys, database credentials or `PAYLOAD_SECRET` into the website environment.
- Configure backups, a password-recovery email adapter, protected admin ingress and rate limits. Keep the filesystem ephemeral; uploads go through Payload to R2, not to Vercel disk.

## 7. Verification gates

Template creation and passing unit tests are not evidence of live connectivity. With a properly configured staging environment:

1. Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm --filter @yourbestride/cms build`.
2. Verify `/admin` loads; log in and confirm role-specific menus. An HTML response alone does not prove successful database access.
3. Verify PostgreSQL with the provider's SQL console (`SELECT 1`), `pnpm --filter @yourbestride/cms migrate:status`, then a controlled staging collection read/write. Never run a destructive migration against production as a connectivity test.
4. Upload a non-sensitive test image through Media. Confirm the original and thumbnail are in the expected R2 bucket under `media/` and the generated HTTPS custom-domain URLs load without a CMS cookie. Delete it and verify object removal and cache behavior.
5. Confirm all collections load with valid schema and appropriate roles. Anonymous requests must not read leads/applications or drafts; anonymous uploads must fail.
6. Confirm no private bucket/public access was enabled. Private-file end-to-end checks cannot pass until a private document workflow exists; do not claim the public adapter provides one.

No Cloudflare account, bucket, token, database or production deployment is provisioned merely by writing this template.

## 8. Recorded results for the R2 configuration change

Commands were run through `npx --yes pnpm@10.15.1`, the pinned workspace package manager.

| Check                                   | Actual result                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`        | Passed; existing adapter dependency retained, lockfile unchanged                                                                                              |
| `pnpm typecheck`                        | Passed across the workspace                                                                                                                                   |
| `pnpm lint`                             | Passed, including formatting; rerun after a concurrent build initially removed generated Next type files                                                      |
| `pnpm test`                             | Passed: 48 tests (18 CMS, 13 web, 17 shared validation)                                                                                                       |
| `pnpm --filter @yourbestride/cms build` | Compiled successfully and passed TypeScript; failed collecting page data with `Missing required environment variable: PAYLOAD_SECRET`                         |
| Payload admin loads                     | Not verified; no successful configured CMS production build/runtime                                                                                           |
| PostgreSQL connection                   | Not verified; no live database connection was attempted                                                                                                       |
| Media adapter configuration             | Unit tests passed for R2 endpoint, auto region, credentials wiring, public URL generation, disabled local/browser uploads, and public-only collection mapping |
| Actual R2 upload/read/delete            | Not verified; no live bucket operation was performed                                                                                                          |
| Collections                             | Existing collection access tests passed; live database-backed collection loading was not verified                                                             |

The template contains empty credential fields and does not supply a working CMS environment. Unit tests use synthetic inputs only, not deployment credentials or external services. No collections, Next.js architecture or Limo Anywhere behavior were changed. Configure the real environment privately using the setup above, then repeat the production build and live verification gates.

## References

- [R2 S3 authentication and scoped tokens](https://developers.cloudflare.com/r2/api/s3/tokens/)
- [Public buckets, custom domains and r2.dev limitations](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
