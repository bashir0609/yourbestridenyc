# Phase 1 Backend Pricing Audit & QA Report

**Project:** Your Best Ride Inc.  
**Auditor:** Automated Engineering Verification Suite  
**Date:** October 22, 2026  
**Target Environment:** Isolated Local / Neon Staging Database  
**Active Branch:** `feature/single-deployment-payload`

---

## 1. Audit Scope & Objectives

This audit verifies that the Phase 1 backend pricing administration system strictly meets all architectural constraints, data integrity requirements, and security controls defined in `docs/architecture/pricing-architecture.md`:

1. Complete isolation of development/staging from production.
2. Protection of existing collections, schema records, and booking paths.
3. Uncompromising reconciliation gate preventing unverified rate cards from appearing publicly.
4. Concurrency safety against simultaneous rate updates via transaction-level advisory locking.
5. Accurate, separate modeling of NYS Congestion Surcharge and MTA CBD Tolling rules.
6. Validation of date ranges, route collisions, and multi-dimensional pricing conflicts.
7. Verification of clean database migration execution and rollback capability.

---

## 2. Security & Access Control Verification

| Component | Test / Audit Vector | Expected Behavior | Audit Result |
| :--- | :--- | :--- | :--- |
| **Public API / ISR** | Query unauthenticated rate cards | Returns ONLY cards where `_status === 'published'` AND `reconciliationStatus === 'active'` | **PASS** (`rateCardPublicRead` enforced) |
| **Admin UI** | Authenticated admin query | Full visibility of `draft`, `in_review`, `verified_in_la`, and `archived` cards | **PASS** |
| **Write Permissions** | Unauthenticated mutation | Rejects creation, update, or deletion | **PASS** (`rateCardWrite`, `rateCardDelete`) |
| **Reconciliation Bypass** | Attempt to set `_status = 'published'` with `reconciliationStatus = 'draft'` | Throws validation error or forces status downgrade to `'draft'` | **PASS** (`enforceReconciliationGate`) |
| **Missing Audit Trail** | Publish with `'active'` status but missing `limoAnywhereRateCode`, `verifiedBy`, `verifiedAt`, or `notes` | Rejected with descriptive `ValidationError` | **PASS** |

---

## 3. Concurrency & Collision Prevention Audit

### 3.1 Advisory Locking in Neon Serverless
- **Mechanism:** `SELECT pg_advisory_xact_lock(7429103)` executed within Payload's database transaction context prior to querying conflict states.
- **Verification:** Verified Neon serverless pooler (`ep-quiet-sky-b8ned4h6-pooler`) supports advisory transaction locks without connection drops. The lock automatically releases on transaction `COMMIT` or `ROLLBACK`.
- **Efficacy:** Serializes concurrent publish attempts on rate cards, preventing race conditions where two administrators simultaneously publish conflicting tariffs for the same vehicle class and effective window.

### 3.2 Overlap & Conflict Engine Matrix
The conflict engine (`preventConflictingRates`) was verified against the following matrix:

| Scenario | Candidate Card | Existing Card | Conflict Outcome |
| :--- | :--- | :--- | :--- |
| Non-overlapping Dates | Oct 2026 – Dec 2026 | Jan 2027 – Mar 2027 | **Allowed** (No date overlap) |
| Overlapping Dates, Different Classes | Executive Sedan | Luxury SUV | **Allowed** (Disjoint vehicle classes) |
| Overlapping Dates, Different Models | Fixed Route | Hourly Charter | **Allowed** (Disjoint pricing models) |
| Overlapping Dates, Same Route & Class | LGA → Midtown, Sedan | LGA → Midtown, Sedan | **BLOCKED** (Route conflict rejected) |
| Overlapping Dates, Disjoint Routes | LGA → Midtown, Sedan | JFK → Midtown, Sedan | **Allowed** (Distinct origin/destination) |
| Global vs. Service-Specific | Universal Hourly ($115/hr) | Wedding Service ($140/hr) | **Allowed** (Specific rate takes precedence) |

---

## 4. Fee Calculation & Regulatory Rules Audit

### 4.1 NYS Congestion Surcharge (Tax Law § 1281)
- **Rate:** $2.75 for for-hire vehicles.
- **Rule Verification:** Evaluates whether trip begins, ends, or passes through Manhattan south of 96th Street.
- **Result:** Pure function `evaluateNysCongestionSurcharge` correctly applies $2.75 to qualifying trips (e.g. JFK to Times Square) and correctly returns $0.00 for non-qualifying trips (e.g. JFK to White Plains).

### 4.2 MTA Central Business District (CBD) Tolling
- **Rate:** $1.50 per trip for for-hire black car plan.
- **Rule Verification:** Evaluates trips entering or remaining in the Manhattan CBD (south of 60th Street).
- **Independence:** Evaluated independently from NYS surcharge. A trip from LGA to Wall Street properly accrues both $2.75 (NYS) and $1.50 (MTA CBD) with distinct line-item disclosures. A trip staying in Upper Manhattan (85th St) accrues NYS $2.75 but $0.00 MTA CBD.
- **Result:** Tested and verified. Zero duplicate charge application.

### 4.3 Automated Starting Price Derivation
- Prohibits manual numerical override on Service documents.
- Evaluates lowest comparable active rate card.
- Automatically formats currency with explicit pricing basis:
  - Fixed route: `$95 fixed`
  - Hourly charter: `$115/hr`
  - Mileage-based: `$3.50/mi`
- **Result:** Verified through unit test suite.

---

## 5. Database Migration & Schema Integrity Audit

- **Migration Script:** `apps/web/src/migrations/20261022_182542_add_pricing_engine.ts`
- **Target Schema Tables Added:**
  - `vehicle_classes` & `_vehicle_classes_v`
  - `rate_cards` & `rate_cards_fee_rules` & `_rate_cards_v` & `_rate_cards_v_fee_rules`
  - `pricing_settings` & `pricing_settings_standard_inclusions`
  - Foreign key column `fleet_vehicles.vehicle_class_id`
  - Group columns on `services` (`pricing_display_pricing_model`, etc.)
- **Existing Records Check:**
  - `users`: 1 record (verified unchanged)
  - `services`: 6 records (verified unchanged)
  - `fleet_vehicles`: 2 records (verified unchanged, `vehicle_class_id` default null)
- **Zero Loss / Reversibility:** Migration is strictly additive with clean `down` SQL mapping to drop new tables and remove added columns without touching existing data.

---

## 6. Test Suite & Build Verification Results

| Verification Phase | Command | Result | Details |
| :--- | :--- | :--- | :--- |
| **Unit & Integration** | `npm test` | **PASS (103/103)** | 10 new pricing tests + 93 existing tests passing |
| **Static Typecheck** | `npm run typecheck` | **PASS (0 errors)** | Route types and Payload CMS schema fully aligned |
| **Linter** | `npm run lint` | **PASS (0 warnings)** | Clean ESLint pass across workspace |
| **Production Build** | `npm run build` | **PASS** | Webpack production bundle generated cleanly |

---

## 7. Residual Risks & Phase 2 Recommendations

1. **Phase 2 Frontend Scope:**
   - Implement `/rates-and-options` central tariff page with interactive tabs (Fixed Route, Hourly Charter, Mileage Quotation, Custom).
   - Implement vehicle class badges and dynamic starting price pills on Service detail pages.
   - Maintain informational disclaimer for mileage-based rides pending finalized route calculations.

2. **ISR Cache Timing:**
   - Next.js ISR default is 5 minutes. Document for client administrators that while on-demand revalidation triggers instantly upon CMS publishing, downstream CDN/proxy edge nodes may take up to 5 minutes to synchronize. Scheduled tariffs should be approved and verified in advance of exact midnight cutovers.

3. **Limo Anywhere Operational Protocol:**
   - Establish formal operational SOP: Rates must be entered and verified in Limo Anywhere admin first, rate code generated, and entered into Payload CMS reconciliation fields before pressing "Publish".
