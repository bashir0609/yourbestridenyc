# Framework alignment review

Reviewed against published package metadata and the Next.js upgrade guide on 2026-09-26.

## Decision

Both `apps/web` and `apps/cms` use **Next.js 16.3.6** from the same pnpm catalog. No mixed Next.js majors and no peer-range overrides are used. Payload and its directly installed adapters/plugins remain **3.90.2**. React and React DOM remain **19.1.9**, shared with the UI package.

Published dependency compatibility is confirmed. This does not establish production readiness: the CMS production build still requires environment configuration and live infrastructure validation.

## Compatibility evidence

| Component                       | Published requirement / result                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Next 16.3.6                     | Node >=20.9; React/React DOM ^19.0.0 accepted                                                       |
| Payload Next integration 3.90.2 | Next >=16.3.3 <17.0.0; Payload exactly 3.90.2; GraphQL ^16.8.1                                      |
| Payload UI 3.90.2               | Same Next range; React/React DOM ^19.0.1 or ^19.1.2 or ^19.2.1                                      |
| Workspace runtime               | Node 24.15.0 used; Node 22.13+ or 24 supported by root engines                                      |
| React 19.1.9                    | Satisfies Next, Payload UI, Radix, Framer Motion and shared UI peer ranges                          |
| GraphQL 16.11.0                 | Satisfies Payload integration                                                                       |
| Shared UI                       | No Next runtime dependency; React ^19.1.0 and Tailwind ^4.1.0 peers; typecheck and web build passed |
| Shared types                    | Framework-independent Zod schemas/models; typecheck and 17 tests passed                             |
| Shared config                   | Strict TypeScript JSON configs, no Next runtime dependency; both app typechecks passed              |

React 19.2 is not required by these published peers. We retained the supported React patch line to avoid an unnecessary second feature migration; no React 19.2-specific APIs are introduced. Next's App Router also manages its own bundled React implementation.

Commands used to verify the contracts:

```sh
npm view next@16.3.6 engines peerDependencies --json
npm view @payloadcms/next@3.90.2 peerDependencies --json
npm view @payloadcms/ui@3.90.2 peerDependencies --json
npm view framer-motion@12.23.0 peerDependencies --json
pnpm install --strict-peer-dependencies
pnpm list next react react-dom @payloadcms/next --recursive --depth 0
```

Sources: [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16), [Next package metadata](https://registry.npmjs.org/next/16.3.6), [Payload Next metadata](https://registry.npmjs.org/@payloadcms%2fnext/3.90.2), [Payload UI metadata](https://registry.npmjs.org/@payloadcms%2fui/3.90.2).

## Dependency policy

- Define Next, its ESLint config, React, React DOM, React type packages and TypeScript in `pnpm-workspace.yaml` and consume them through `catalog:`.
- Keep all direct Payload dependencies at the same exact version; check the current Next peer range before each update.
- Commit the single root `pnpm-lock.yaml`; use frozen-lockfile installs in CI. Do not create per-app npm lockfiles.
- Use strict peer validation. Do not override unsupported Next/Payload combinations to suppress warnings.
- React overrides preserve one React/React DOM version across the workspace, within verified peer ranges.
- Shared packages export source, not a second compiled React runtime. The web bundles them using `transpilePackages`.
- CMS Sharp moved from 0.34.3 to **0.35.4** to address the reported native image-library vulnerabilities. Strict peer installation and CMS compilation/typechecking succeeded; actual image processing/storage still needs integration testing.

## Required migration changes implemented

1. Both applications use the same Next 16.3.6 catalog entry; `eslint-config-next` matches it.
2. Use native Next 16 ESLint flat config exports instead of `FlatCompat`.
3. `revalidateTag(tag, { expire: 0 })` preserves immediate expiry for publishing webhooks, including unpublishing. Do not replace this with `updateTag` in a Route Handler; that API is for Server Actions.
4. CMS `reactCompiler: false` is a stable top-level setting rather than an obsolete experimental option.
5. Production scripts explicitly select `next build --webpack`. Payload wraps the Next config with Webpack integration; this preserves the existing bundler behavior instead of combining an unverified Turbopack migration. CMS development also explicitly uses Webpack. The public app may use default Turbopack in development; its dev-server/browser behavior has not been verified here.
6. Web typechecking runs `next typegen` before `tsc` so route types exist after a clean install.
7. Strict shared TypeScript checking found a possibly undefined content-type split segment; optional access fixes the real edge case.
8. The newer hooks lint rule found synchronous menu-reset state in an effect. A pathname-keyed navbar child resets its state on navigation without that effect, retaining Escape/outside-click/link dismissal.

Async route params already used Promises. No synchronous cookies/headers/draftMode calls, middleware, parallel route slots, PPR flags, runtime config, or legacy image API required migration. Cache Components and React Compiler were not enabled. Image defaults were not weakened.

## Validation record

Commands were invoked through `npx --yes pnpm@10.15.1` to use the repository's exact package-manager version. Initial 120-second cold-cache typecheck/lint/test runs timed out; later completed checks supersede only their corresponding results.

- Install with strict peers: passed (3m 14s); no peer-dependency failures. pnpm reported deprecated legacy migration-tool dependencies and an ignored optional `unrs-resolver` build script.
- Frozen-lockfile reinstall: passed; the root lockfile matches all workspace manifests.
- Workspace typecheck: passed, including web route type generation, CMS and shared packages.
- Workspace lint: passed, including web ESLint, CMS/shared TypeScript checks and repository Prettier checks. Next-generated `next-env.d.ts` files are excluded from formatting to prevent build/format churn.
- Workspace tests: passed, **42 tests** (13 web, 12 CMS, 17 shared intake schema).
- Web production build: passed after fixing the undefined-access error.
- Web production smoke tests: passed for routes, security headers, legal 404 and revalidation authentication/payload handling.
- CMS production build: compiled with warnings and passed TypeScript, then **failed collecting page data** because `PAYLOAD_SECRET` is missing. No fake environment values were supplied. The compiler did not include warning details in captured output.
- CMS runtime credentials also require `DATABASE_URI`, `CMS_URL`, Cloudflare R2 endpoint/bucket/region/access credentials/public URL as documented in the root README. The build was not rerun with production secrets, a database or an object store.
- `pnpm audit --prod`: nonzero exit, **one moderate advisory**, GHSA-67mh-4wv8-2f99, through Payload's PostgreSQL adapter → Drizzle Kit → legacy esbuild loader → esbuild. No critical/high production advisories reported. We did not force a cross-version transitive override of migration tooling; track an upstream fix and do not expose esbuild's development server.

This review does not validate migrations, live admin/database flows, Cloudflare R2 uploads, browser accessibility or deployment. Complete CMS configuration and build/integration checks before release.
