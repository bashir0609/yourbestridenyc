# Your Best Ride — Rate Cards & Pricing Engine Production Release Report

**Project:** Your Best Ride Inc.  
**Release Date:** October 23, 2026 (20:28 UTC+6)  
**Target Environment:** Production (`https://www.yourbestridenyc.com`)  
**Production Branch:** `master`  
**Production Commit SHA:** `06796dd` (`06796dd32130ff2aa934fe377c8e9b6a94f6c442`)  
**Vercel Deployment ID:** `dpl_8CnjXQecUvde3G9jmENHnQsg21fe`  
**Shared Database:** Neon Serverless PostgreSQL (`ep-quiet-sky-b8ned4h6-pooler`)  
**Status:** **SUCCESS (Deployed & Verified Live)**

---

## 1. Executive Summary & Release Scope

This release officially deploys the **Admin-Controlled Pricing Architecture, Rate Cards System, and Location-Specific Route Pricing Integration** to Production on `master`, including the patch resolving the location-filtering defect on `/rates-and-options`.

### Core Capabilities Released:

1. **CMS Rate Cards System:** Administrator management of transportation tariffs in Payload CMS (`/admin` &rarr; Rate Cards) across Fixed Route, Hourly, Mileage, and Custom pricing models.
2. **Reconciliation & Audit Gate:** Mandatory verification against Limo Anywhere test quotes before publishing. Server-side derivers enforce `verifiedBy` and `verifiedAt`. Material changes automatically invalidate verification.
3. **Transparent Public Pricing (`/rates-and-options`):** Responsive multi-model tariff comparison interface with vehicle class specifications, statutory fee disclosures, and prefilled custom quote inquiry scenarios.
4. **Location-Specific Route Pricing (`/locations/[slug]`):**
   - **Hero Action:** "View Route Pricing" CTA linking directly to `/rates-and-options?location=<slug>&tab=airport`.
   - **Dedicated Rates Section:** "Transportation Rates From [Location Name]" displaying eligible published outbound tariffs grouped by destination, vehicle class pills, base flat fare, and non-misleading additional-stop disclosures.
   - **Non-Reversal Safety:** Outbound tariffs (e.g. Manhattan &rarr; JFK at $205.00) are never automatically inferred as return fares without an explicit, administrator-verified inbound route entry.
   - **Strict Origin Route Filtering:** Strict route-level isolation matching `route.originLocationSlug` or `route.originLocationId`. Substring matching, destination matching, and zone approximations are strictly prohibited.
   - **Approved Empty State:** If no tariffs exist for a requested location (e.g. `/rates-and-options?location=brooklyn&tab=airport`), renders:
     > *"No published route rates are currently available for Brooklyn. Request a Custom Quote."*
     alongside a 1-click **"Show All Locations"** reset action.
5. **Service & Fleet Integration:** Service pages dynamically display eligible starting prices derived from published rate cards. Fleet vehicle cards and detail pages dynamically link to vehicle class rate profiles.
6. **Customer-Facing Terminology:** Complete removal of internal "ORES" booking terminology across all public components, standardizing on "Book Now", "Check Availability & Book", and "Request a Custom Quote".

---

## 2. Planned 2026 Rate Cards Status

The four planned commercial tariffs are configured in the shared database as follows:

| Rate Card Title                                        | ID  | Vehicle Class         | Pricing Model | Published Tariff / Benchmark    | Reconciliation Status         | Customer Presentation                                       |
| :----------------------------------------------------- | :-: | :-------------------- | :------------ | :------------------------------ | :---------------------------- | :---------------------------------------------------------- |
| **Standard SUV — Hourly Chauffeur Rate 2026**          | `1` | Standard SUV          | Hourly        | $115.00/hr (3-hr minimum)       | `draft`                       | Protected (Empty state CTA)                                 |
| **Premium Crossover SUV — Hourly Chauffeur Rate 2026** | `2` | Premium Crossover SUV | Hourly        | $135.00/hr (3-hr minimum)       | `draft`                       | Protected (Empty state CTA)                                 |
| **Standard SUV — NYC Airport Transfers 2026**          | `3` | Standard SUV          | Fixed Route   | JFK: $175, LGA: $150, EWR: $185 | `draft`                       | Protected (Empty state CTA)                                 |
| **Premium Crossover SUV — NYC Airport Transfers 2026** | `4` | Premium Crossover SUV | Fixed Route   | JFK: $205, LGA: $175, EWR: $215 | **`published`** (LA Verified) | **Live on `/rates-and-options` and `/locations/manhattan`** |

*Rate Card ID 4 was verified against Limo Anywhere matrix `Default Fixed Rate Matrix / MHT / PCSUV / JFK-LGA-EWR` by Administrator ID 1 on `2026-10-23T12:46:07Z` and published. Draft cards remain protected from customer display until administrator reconciliation.*

---

## 3. Disclosures & Commercial Policies

- **Chauffeur Gratuity:** 20% standard gratuity is disclosed as calculated upon net base fare during checkout in Limo Anywhere.
- **Statutory Surcharges:** NYS Congestion Surcharge ($2.75 Tax Law § 1281), Port Authority Airport Access Fee, and MTA CBD entry fees are itemized transparently.
- **Unverified Additional-Stop Charge Resolution:** The $25 intermediate-stop charge is preserved in data storage but presented strictly as *"En-route stops: quoted on request (est. $25, pending LA confirmation)"* until officially reconciled in Limo Anywhere.
- **Commercial Policies:** Curbside grace (15 mins), Domestic airport grace (30 mins), International airport grace (60 mins), and late-night window (23:00–05:00) are fully documented.

---

## 4. Database Safety & Migration Audit

- **Shared Database:** Neon Serverless PostgreSQL (`ep-quiet-sky-b8ned4h6-pooler`).
- **Migration Batch 2:** Migration `20261022_182542_add_pricing_engine` was applied transactionally to Neon on `2026-10-22T18:27:25Z`.
- **Zero Migration Execution:** No database schema alterations or migrations were run during this Production release.
- **`DATABASE_PUSH=false`:** Enforced across all environments, preventing accidental DDL schema sync at build or runtime.
- **Data Preservation:** All existing users, media assets in Cloudflare R2, location pages, and service pages were preserved with zero destructive operations.

---

## 5. Deployment Verification & Production Health

| Verification Vector | Target Endpoint | HTTP Status | Production Verification Outcome |
| :--- | :--- | :---: | :--- |
| **Production Homepage** | `https://www.yourbestridenyc.com/` | `200 OK` | **PASS** — Live with verified branding, fleet highlights, and service links. |
| **Rates & Options (Brooklyn Filter)** | `https://www.yourbestridenyc.com/rates-and-options?location=brooklyn&tab=airport` | `200 OK` | **PASS** — Manhattan fares strictly excluded (0 route rows in DOM); renders approved empty notice *"No published route rates are currently available for Brooklyn. Request a Custom Quote."* and *"Show All Locations"* reset. |
| **Rates & Options (Manhattan Filter)** | `https://www.yourbestridenyc.com/rates-and-options?location=manhattan&tab=airport` | `200 OK` | **PASS** — Renders *"Filtered by Location: Manhattan"*; renders fixed airport tariffs for Card ID 4 ($205/$175/$215). |
| **Rates & Options (Unfiltered)** | `https://www.yourbestridenyc.com/rates-and-options` | `200 OK` | **PASS** | Renders all published fixed routes; filter banner absent. |
| **Service Area Detail** | `https://www.yourbestridenyc.com/locations/manhattan` | `200 OK` | **PASS** — Hero "View Route Pricing" CTA active; "Transportation Rates From Manhattan, New York" renders JFK ($205), LGA ($175), EWR ($215) for Premium Crossover SUV; 20% gratuity and toll disclosures verified. |
| **Limo Anywhere Booking** | `https://www.yourbestridenyc.com/book` | `200 OK` | **PASS** — Secure vendor iframe loaded directly to official Limo Anywhere booking engine. |
| **Payload Admin Portal** | `https://www.yourbestridenyc.com/admin/login` | `200 OK` | **PASS** — Admin login accessible; Rate Cards collection with reconciliation gate operational. |
| **Limo Anywhere Rates & API** | Upstream Booking Services | N/A | **PASS** — Completely untouched and preserved. |
| **Cloudflare R2 Media Delivery** | Public Media Assets | N/A | **PASS** — Completely untouched and preserved. |

---

## 6. Post-Deployment Verification Summary

1. **Location Isolation Confirmed Live:**
   - Visiting `/rates-and-options?location=brooklyn&tab=airport` on live Production strictly filters out Manhattan-origin tariffs, displaying the approved notice and clear button.
   - Visiting `/rates-and-options?location=manhattan&tab=airport` displays only Manhattan-origin airport transfers.
2. **Eligible Published Tariffs:**
   - Card ID 4 (*Premium Crossover SUV — NYC Airport Transfers 2026*) is confirmed rendering live on both `/rates-and-options` and `/locations/manhattan`.
   - Outbound rates for Manhattan to JFK ($205.00), LaGuardia ($175.00), and Newark ($215.00) display correctly with "Base Flat Fare" labeling.
3. **Draft Tariffs Protected:**
   - Rate Card ID 1, 2, and 3 remain in `_status = 'draft'` and are completely excluded from public customer views.
4. **Booking Integration:**
   - Direct booking CTAs route to `/book`, which securely embeds the official Limo Anywhere ORES booking widget.
