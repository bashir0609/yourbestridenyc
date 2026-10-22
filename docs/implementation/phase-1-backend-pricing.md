# Phase 1 Implementation Report: Backend Pricing Administration System

**Project:** Your Best Ride Inc.  
**Stack:** Next.js 16 App Router + Payload CMS 3 + Neon Serverless PostgreSQL  
**Date:** October 22, 2026  
**Status:** Complete (Backend & Admin Schemas, Validation Engine, Database Migrations, Unit/Integration Tests)

---

## 1. Executive Summary

Phase 1 of the CMS-managed pricing architecture has been implemented strictly within backend administration and schema domains. The implementation introduces structured vehicle classification, rate cards across all four pricing models (Fixed Route, Hourly Charter, Mileage-Based, and Custom / Tailored), global pricing policies, and a strict reconciliation gate for Limo Anywhere (LA) operational verification prior to rate activation.

All database modifications were executed as additive migrations against an isolated Neon staging database branch without mutating or removing any existing application collections, services, or fleet vehicles.

---

## 2. Implemented Collections & Globals

### 2.1 Vehicle Classes (`apps/web/src/collections/VehicleClasses.ts`)
- **Collection Slug:** `vehicle-classes`
- **Fields:**
  - `name`: Text (required, unique, indexed)
  - `slug`: Text (required, unique, indexed, auto-generated from name)
  - `tier`: Select (`executive`, `premium_executive`, `luxury`, `ultra_luxury`, `group_executive`, `group_luxury`)
  - `passengerCapacity`: Number (min 1, max 60)
  - `luggageCapacity`: Number (min 0, max 60)
  - `description`: Text
  - `badge`: Text (optional display pill, e.g. "Most Popular", "Executive Choice")
  - `sortOrder`: Number (default 100)
  - `isActive`: Checkbox (default true)
- **Features:** Drafts enabled (`versions: { drafts: true }`), admin search on `name` and `slug`, custom access control.
- **Cache Invalidation:** Revalidates `/rates-and-options`, `/fleet`, `/services`, and `/api/pricing/v1` on publish or deletion.

### 2.2 Rate Cards (`apps/web/src/collections/RateCards.ts`)
- **Collection Slug:** `rate-cards`
- **Fields:**
  - `title`: Text (required)
  - `vehicleClass`: Relationship to `vehicle-classes` (required, indexed)
  - `service`: Relationship to `services` (optional; empty = universal tariff for class)
  - `pricingModel`: Select (`fixed`, `hourly`, `mileage`, `custom`)
  - **Model Specific Fields:**
    - `fixedRoute`: Origin zone, destination zone, base price, included tolls/fees, reverse route allowed.
    - `hourly`: Base hourly rate, minimum hours, overtime hourly rate, billing increment minutes.
    - `mileage`: Base fare, minimum fare, per-mile rate, deadhead threshold & per-mile rate, included miles.
    - `custom`: Starting price, quote note, consultation requirement.
  - **Commercial Policies:** Domestic/international grace periods, waiting rate per minute, late-night surcharge window & amount.
  - **Fee Rules:** Array of typed fee rules (surcharge, toll, permit, regulatory, parking) with dynamic applicability conditions (e.g. NYC CBD, NYS Congestion, JFK/LGA/EWR Airport pickup).
  - **Effective Window:** `effectiveFrom` (required) and `effectiveTo` (optional).
  - **Audited Reconciliation (Limo Anywhere Gate):**
    - `reconciliationStatus`: Select (`draft`, `in_review`, `verified_in_la`, `active`, `archived`)
    - `limoAnywhereRateCode`: Text (required before active status)
    - `reconciliationNotes`: Text (required before active status)
    - `verifiedBy`: Text (required before active status)
    - `verifiedAt`: Date (required before active status)
    - `evidenceAttachment`: Relationship to `media` (optional verification screenshot/export)
- **Features:** Drafts enabled, advisory locking during save, date validation, overlap prevention hook, reconciliation gate hook.

### 2.3 Pricing Settings Global (`apps/web/src/globals/PricingSettings.ts`)
- **Global Slug:** `pricing-settings`
- **Fields:**
  - `defaultCurrency`: USD
  - `universalDisclosures`: RichText disclosures rendered on customer breakdowns.
  - `defaultCommercialPolicies`: System fallback values for domestic/international airport grace periods, waiting rates, and late-night windows.
  - `standardInclusions`: Array of included amenities (e.g., bottled water, flight tracking, WiFi, child seat on request).
  - `taxAndRegulatoryNotices`: NYS Tax Law § 1281 congestion disclosure, MTA CBD tolling disclosure, TLC regulatory notices.

### 2.4 Additive Editorial Schema Updates
- **`apps/web/src/collections/Editorial.ts` (`FleetVehicles`):** Added nullable `vehicleClass` relation (`relationship` to `vehicle-classes`) linking physical vehicles to their operational pricing class.
- **`apps/web/src/collections/Editorial.ts` (`Services`):** Added `pricingDisplay` field group containing `pricingModel`, `customStartingPriceNote`, `customBillingUnit`, and `displayOrdering`.

---

## 3. Validation, Reconciliation & Safety Hooks

All validation and integrity hooks reside in `apps/web/src/hooks/rate-card-hooks.ts`:

1. **Date Window Integrity (`validateRateCardDates`):**
   - Ensures `effectiveTo` cannot precede `effectiveFrom`.
   - Rejects zero-duration or inverted date intervals.

2. **Concurrency Safety & Collision Prevention (`preventConflictingRates`):**
   - Acquires PostgreSQL advisory transaction lock (`pg_advisory_xact_lock(7429103)`) inside the database transaction to prevent concurrent publish race conditions.
   - Evaluates overlapping date windows: `NOT (candidate.to < existing.from OR candidate.from > existing.to)`.
   - Checks dimensionality collision: Matching `vehicleClass`, overlapping `service` applicability (global vs. specific), same `pricingModel`, and for fixed routes, matching origin/destination zone pairs.
   - Rejects conflicting published rate cards with actionable error messages.

3. **Limo Anywhere Reconciliation Gate (`enforceReconciliationGate`):**
   - Strictly blocks any rate card with `_status === 'published'` from persisting with `reconciliationStatus` other than `'active'`.
   - Rejects transition to `'active'` if `limoAnywhereRateCode`, `verifiedBy`, `verifiedAt`, or `reconciliationNotes` are missing.
   - Automatically downgrades any card with non-active reconciliation status to draft status (`data._status = 'draft'`), ensuring no unreconciled rates can leak to public APIs or ISR views.

4. **Public Read Access Control (`rateCardPublicRead` in `apps/web/src/access.ts`):**
   - Unauthenticated/customer queries are constrained to `_status: { equals: 'published' }` and `reconciliationStatus: { equals: 'active' }`.
   - Admin users retain full visibility across drafts, review, and archived cards.

---

## 4. Pure Pricing Rules Engine (`apps/web/src/lib/cms/pricing-rules.ts`)

Pure, deterministic functions decoupled from database I/O for fee calculations:

- **NYS Congestion Surcharge (`evaluateNysCongestionSurcharge`):**
  - Implements NYS Tax Law § 1281: $2.75 for for-hire vehicles.
  - Evaluates geographic boundary: Trips that begin, end, or pass through Manhattan south of 96th Street.
- **MTA Central Business District Tolling (`evaluateMtaCbdCharge`):**
  - Implements MTA CBD Tolling program for black cars: $1.50 per trip entering the CBD (south of 60th Street).
  - Explicitly evaluated separately from NYS surcharge to prevent double-counting or improper exclusion.
- **Airport Fee Rules (`evaluateAirportFees`):**
  - Automatically identifies JFK ($2.50 PA ground fee), LGA ($2.50), EWR ($2.50), and HPN based on origin/destination airport classification.
- **Automated Starting Price Derivation (`computeStartingPrice`):**
  - Evaluates published active rate cards for a service and vehicle class to find the true minimum base fare.
  - Formats output with pricing basis label (e.g., "$95 fixed", "$115/hr", "$3.50/mi").
  - Prohibits manual override of derived numeric values.

---

## 5. Database Migration & Staging Execution

- **Migration File:** `apps/web/src/migrations/20261022_182542_add_pricing_engine.ts`
- **Execution Target:** Neon staging branch `ep-quiet-sky-b8ned4h6-pooler.c-14.us-east-1.aws.neon.tech/neondb`
- **Safety Checks Executed:**
  - Verified `DATABASE_PUSH=false` to prevent non-reproducible DDL mutations.
  - Confirmed `CREATE EXTENSION IF NOT EXISTS btree_gist` supported on Neon.
  - Executed `npm run migrate` (Batch 2). Status: `Ran: Yes`.
  - Confirmed pre- and post-migration record counts:
    - `users`: 1 (intact)
    - `services`: 6 (intact)
    - `fleet-vehicles`: 2 (intact)
    - `vehicle_classes`: 0 (new table)
    - `rate_cards`: 0 (new table)

---

## 6. Verification & Quality Assurance

- **Unit & Integration Suite (`apps/web/tests/pricing-backend.test.ts`):** 10 dedicated test suites covering date validation, reconciliation gate enforcement, collision detection, NYS congestion surcharge, MTA CBD tolling, fee accumulation, and starting price computation.
- **Full Test Suite:** 103 passing tests across the entire repository.
- **TypeScript:** Strict typecheck passed with zero errors (`npm run typecheck`).
- **ESLint:** Passed with zero errors and zero warnings (`npm run lint`).
- **Next.js Production Build:** Verified clean webpack compilation (`next build --webpack`).

---

## 7. Phase 1 Boundaries Maintained

- **NO Public Pricing Page:** `/rates-and-options` remains unimplemented, scheduled for Phase 2.
- **NO Production Deployments:** All work was executed against local dev environment and Neon staging database.
- **NO Limo Anywhere Mutations:** Live Limo Anywhere configuration was not touched.
- **NO Git Commits/Pushes:** Staged locally on branch `feature/single-deployment-payload`.
