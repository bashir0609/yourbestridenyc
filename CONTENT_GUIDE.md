# Editorial content guide

Use the CMS admin for public marketing content, not dispatch, booking operations, medical details, employment records, or vehicle registration data. The four collections below are editorial records; their relationships do not prove live availability.

## Content entry

### Services (`services`)

- Enter a title, stable lowercase hyphenated slug, short summary (maximum 300 characters), and a rich-text service overview in the Lexical editor. Select an approved public hero image if available.
- Add only verified benefits (title and optional description), features, and FAQ questions/answers. Do not invent guarantees, medical capabilities, rates, reviews, or availability.
- Select approved related locations in `serviceAreas`. Publish the related records before relying on public links.
- Booking CTA configuration is **button label only** (`bookingCTA.label`). The website uses the centrally configured Limo Anywhere booking URL, falling back to `/book` when unconfigured; editors cannot override the destination per service. This does not create or manage a booking.

### Drivers (`drivers`)

- Enter the approved public display name, slug, short summary, Lexical biography, and an approved public photo. Obtain permission and confirm `websiteApproved` before publishing.
- `experienceYears` is an optional **numeric whole number from 0 to 80**, not text such as “10+ years.” Leave it blank if unverified; zero means zero verified years.
- Retain the legacy `experience` field for an approved public narrative. Do not convert arbitrary legacy prose into a numeric claim without verification.
- Languages, specialties, and service-area relationships must be verified marketing information. Never enter contact details, license numbers, background checks, private employment history, or trip records.

### Fleet vehicles (`fleet-vehicles`)

- Enter a public name, slug, category, short summary, and verified whole passenger capacity (1–100, excluding the driver). Add a Lexical description where useful.
- Optional luggage capacity is a whole bag count: zero means none; blank means unknown. State accessibility information and amenities only when verified.
- Add approved images to `images`. **The first `images[].image` is the hero/card image**; drag to reorder the remaining gallery (maximum 12). There is no separate fleet hero-image field.
- Do not invent vehicles, equipment, registration details, or availability.

### Locations (`locations`)

- Enter a public name, stable slug, city, state/region, uppercase two-letter country code, short summary, and Lexical introduction. Add an approved public image if available.
- List only verified neighborhoods in `coverageAreas`. Select editorial recommendations in `relatedServices` and add factual FAQs where useful.
- `relatedServices` and service `serviceAreas` are independent: keep both sides consistent manually. Borough names alone are not a coverage commitment.

## Review, approval, and publishing

1. Save new content as **draft**. Complete editorial, factual, privacy, image-rights, and relationship checks before publication.
2. Set required publication permissions/approval fields (including driver `websiteApproved`). A checkbox, `featured`, or display order is not a substitute for approval and does not publish a draft.
3. Preview copy and images, then explicitly publish approved records. Verify public rendering and linked content after publication. Lower `displayOrder` values come first where supported.
4. Add SEO title, description, and social image overrides where useful. Coordinate redirects before changing an established slug.

Development fixtures are not approved copy. `developmentSeed` is a marker, **not a publication lock**. Replace all fixture names, summaries, and body content with verified content, obtain approval, and clear the marker before any intentional publication. Never publish the seed records as supplied.

## Images and Cloudflare R2

Media is for **public images only** (JPEG, PNG, WebP, AVIF, up to 4 MB). Supply descriptive alt text and ensure publication rights/consent. Treat uploaded objects as public even when the referencing page is a draft: R2 public delivery does not inherit the page's draft restrictions. Never upload identity documents, licenses, medical information, application attachments, or other private material. Keep R2 credentials server-side and private. See [deployment](docs/DEPLOYMENT.md).

## Schema rollout: migration required

The editorial schema changes need a real Payload/Drizzle migration generated, reviewed, and tested by the release owner before use against an existing database. Type generation is not a database migration. Follow [the migration policy](docs/MIGRATIONS.md); deploy the schema and frontend changes together to preserve the central booking handoff. Do not run migrations or schema push against production as part of seed setup. This seed implementation does not generate or execute migrations and forces `DATABASE_PUSH=false` for its own process.

## Optional local development seed

The seed creates four services (`medical`, `airport`, `corporate`, `private`) and five locations (`manhattan`, `brooklyn`, `queens`, `bronx`, `staten-island`). All nine are drafts, marked `developmentSeed`, with **DEVELOPMENT SEED** names/titles and summaries. It creates no drivers, fleet, media, reviews, or business claims. Coverage, benefits, features, FAQs, and relationships are deliberately empty until verified.

1. Install workspace dependencies and prepare a **disposable local PostgreSQL database with the current schema** using the separately reviewed migration workflow. Never use a production database, replica, or tunnel/port-forward to a remote database, even if the endpoint looks local.
2. Privately configure the application environment described in [deployment setup](docs/DEPLOYMENT.md), including `PAYLOAD_SECRET`, `SITE_URL`, `DATABASE_URI`, and required R2 settings. No media is uploaded by the seed, but Payload configuration still requires valid storage settings. Never commit secrets.
3. The CLI loads private files from `apps/web` in this order: `.env.development.local`, `.env.local`, `.env.development`, `.env`. Existing shell values take precedence; earlier files win. It uses Node's built-in env loader without printing file contents. Set these explicitly in the private environment or shell:

   ```dotenv
   NODE_ENV=development
   ALLOW_DEVELOPMENT_SEED=true
   DATABASE_URI=postgresql://localhost:5432/yourbestride_dev
   DATABASE_PUSH=false
   ```

   The example URI assumes locally configured PostgreSQL authentication; use your own local credentials privately if needed. Only `localhost`, `127.0.0.1`, and `[::1]` are accepted. A database name is required. Query parameters and fragments are forbidden, including connection host overrides. `CI` and `VERCEL` must be absent, even if their values are empty, `false`, or `0`. Never remove platform markers to circumvent the guard.

4. From the workspace root, run:

   ```sh
   pnpm --filter @yourbestride/web seed
   ```

   In a POSIX shell you can opt in for only this command:

   ```sh
   NODE_ENV=development ALLOW_DEVELOPMENT_SEED=true pnpm --filter @yourbestride/web seed
   ```

The guard runs before dynamic Payload/config imports. Locations are processed first. Any matching slug, whether draft or published, is skipped without updates or relationship backfills. Run only one seed process at a time; unique slugs remain the final duplicate safeguard. A failure stops the run, releases the initialized Payload instance, and may leave already-created drafts; rerunning safely skips them. Remove the opt-in after use. No database connection is needed for the unit tests:

```sh
pnpm --filter @yourbestride/web exec tsx --test tests/cms/seed.test.ts
```
