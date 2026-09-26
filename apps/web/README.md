# Public website

Next.js 16.3.6, React 19.1.9, TypeScript, Tailwind v4 and Framer Motion. Shared UI primitives come from `@yourbestride/ui`; `src/ui` adds website-specific link/layout styling.

## Local setup

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm --filter @yourbestride/web dev
```

Create `apps/web/.env.local` using `.env.example`. For local integration set `CMS_URL=http://localhost:3001` and run the configured CMS separately. Set `CMS_MEDIA_URL` to the **public HTTPS origin** used by CMS `S3_PUBLIC_URL`. This is a public domain, not an R2 key or its authenticated API endpoint. Never put `PAYLOAD_SECRET`, database credentials, R2 keys or a CMS staff token in this app. See [CMS runtime setup](../cms/DEPLOYMENT.md).

`SITE_URL` is the canonical production HTTPS origin. Missing configuration keeps the site noindex. Optional `CONTACT_EMAIL`, `CONTACT_PHONE`, and `LIMO_ANYWHERE_BOOKING_URL` override public CMS Site Settings. `REVALIDATION_SECRET` is a separate server secret for the optional webhook endpoint. Rebuild after changing the public media origin: Next's remote-image allowlist is configured at build/startup.

## CMS API layer

```text
src/lib/cms/
  payload-client.ts   Server-only, bounded public REST transport
  queries.ts          Server-only typed collection queries and homepage assembly
  types.ts            Public view models, result/status types, resources and limits
  mappers.ts          Runtime validation and public-field projection
```

Both transport and query modules import `server-only`; Next rejects their use from Client Components. Type-only imports do not pull server code into the browser. No CMS SDK or privileged Payload config is bundled into the public app.

- Only services, fleet-vehicles, drivers, testimonials, locations and site-settings are requestable. Arbitrary/private collection paths are rejected at runtime as well as by TypeScript.
- Anonymous GET requests omit credentials and authorization, reject redirects, and select only needed fields. Collection requests require `_status=published`; drivers/testimonials additionally require `websiteApproved=true`.
- Collections use depth 1 to populate images, with deterministic `-featured,displayOrder,id` ordering. Rich text and private intake are not requested. Site Settings uses depth 0.
- Responses are bounded to 256 KiB and a four-second overall deadline. Error results expose no upstream bodies, URLs or secrets.
- Network JSON starts as `unknown`, then is validated into public view models. Drafts, unapproved identities/reviews, malformed fields and duplicates are excluded, even if an upstream ignores the requested filters.
- Collection results distinguish `ready`, `empty`, `unconfigured`, `unavailable`, and invalid response envelopes. Homepage sections fail independently, preserving any content successfully retrieved.

### Homepage connections

| Section        | Query / collection                      | Limit |
| -------------- | --------------------------------------- | ----- |
| Services       | `getServices()` / `services`            | 8     |
| Fleet          | `getFleetVehicles()` / `fleet-vehicles` | 6     |
| Drivers        | `getDrivers()` / `drivers`              | 6     |
| Testimonials   | `getTestimonials()` / `testimonials`    | 6     |
| Coverage Areas | `getLocations()` / `locations`          | 12    |

`getHomeContent()` reads these sections concurrently. Static service/fleet fallback records were removed. Missing or unpublished records yield clear empty states; an outage is not mislabeled as no published content. No fabricated driver identities, reviews, owned fleet or precise coverage claims are supplied.

Published services use `image`, drivers use `photo`, and fleet cards use the first valid `images[].image` and validated capacities. Image mapping requires an approved public origin, `/media/` path, no query/fragment/embedded credentials, supported image MIME type, alt text and valid dimensions. Next remote patterns enforce the same origin/path and disable image redirects. Missing/unpopulated/unsafe images do not suppress valid text. Fleet illustrations are only labeled fallbacks for a published vehicle without a usable photo; they are not actual vehicle photography. Testimonials and locations use their existing text schemas; no collection fields were added.

Site Settings has immediate public semantics, not drafts. Its SEO, booking and contact fields are validated. Navbar/footer links remain code-defined. Full detail pages, rich-text rendering, public intake forms and document upload workflows are not implemented here.

## Next.js 16 cache strategy

Public fetches use `next: { revalidate: 300, tags: ['cms:<resource>'] }`. React `cache` deduplicates query calls within server rendering; the homepage has a five-minute route revalidation interval. No private/authenticated CMS response enters these caches.

The existing `POST /api/revalidate` accepts an independent 32+-character secret in `Authorization: Bearer <secret>` and an allowlisted JSON tags array:

```json
{ "tags": ["cms:services", "cms:site-settings"] }
```

Resource tags match the client exactly. The Route Handler calls `revalidateTag(tag, { expire: 0 })` for immediate expiry on the next render, including unpublishing. An automatic CMS publishing hook is **not** installed; configure a trusted webhook or allow the five-minute TTL. Existing image edits also rely on parent-resource invalidation/TTL; a media-specific webhook is not supplied. Versioned image filenames are preferable to replacing a cached object in place.

## Routes and operations boundary

- `/`: CMS-backed homepage sections, hero, CTAs and contact.
- `/book`: explicit, validated HTTPS Limo Anywhere handoff; no reservation database, availability lookup, dispatch, assignments or trip management.
- `/legal/privacy`, `/legal/terms`: noindex placeholders awaiting reviewed documents.
- `/robots.txt`, `/sitemap.xml`: configured canonical origin only.

## Validation

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm --filter @yourbestride/web test:smoke
```

Web unit tests run Node with the `react-server` condition so the real server-only modules can be tested without removing their import guards. Transport/query tests use synthetic responses, not a live CMS; they cover all five sections, filtering, limits, public media safety, partial failures, deadlines, credentials and cache tags. Production smoke tests verify routes and revalidation against a bounded local web server. They do not prove PostgreSQL connectivity, R2 upload or live Payload authorization. See the root README for the current execution results and remaining CMS environment blocker.

### Actual results for this integration

- Workspace typechecking and linting passed.
- All **58 tests** passed: 23 web (including the new mocked transport/query tests), 18 CMS, 17 shared schemas.
- `pnpm build` failed because CMS environment initialization reported missing `PAYLOAD_SECRET`; the CMS had compiled and passed TypeScript. Turbo interrupted the concurrent web task.
- A subsequent separate `pnpm --filter @yourbestride/web build` passed, followed by passing `test:smoke` checks.
- No real CMS/database/R2 credentials were added. Payload admin loading, PostgreSQL connection, real R2 upload, live collection loading and HTTP/database permission enforcement remain unverified. Existing access-policy unit tests passed; that is not live verification.

Google Fonts are fetched at build time by `next/font` and subsequently self-hosted. Production builds explicitly use Webpack. Supply reviewed legal documents and perform live publishing, mobile/keyboard/browser accessibility and booking-handoff QA before launch.
