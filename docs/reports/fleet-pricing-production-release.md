# Your Best Ride — Fleet-Specific Dynamic Pricing Production Release Report

**Project:** Your Best Ride Inc.  
**Release Date:** October 23, 2026 (21:06 UTC+6)  
**Target Environment:** Production (`https://www.yourbestridenyc.com`)  
**Production Branch:** `master`  
**Production Commit SHA:** `4d9c2c9` (`4d9c2c9f4007d4b459c5d1fa4cb5b6fa72e51147`)  
**Vercel Deployment ID:** `dpl_E5FyczKhbrEVVkGadFuGMtayZJgm`  
**Shared Database:** Neon Serverless PostgreSQL (`ep-quiet-sky-b8ned4h6-pooler`)  
**Status:** **SUCCESS (Deployed & Verified Live)**

---

## 1. Executive Summary & Scope

This release implements **Fleet-Specific Dynamic Pricing and Vehicle Class Filtering** across Your Best Ride Inc., extending the dynamic pricing architecture previously implemented for Service Area locations to the entire Fleet system:

1. **Fleet Listing (`/fleet`):**
   - Added secondary "View Rates" link to each vehicle card linking to `/rates-and-options?vehicleClass=<slug-or-id>`.
2. **Vehicle Detail Pages (`/fleet/[slug]`):**
   - Added primary "View Vehicle Rates" CTA in the hero action area alongside "Check Availability & Book".
   - Integrated `<VehiclePricingSection />` titled *"Rates & Options for [Vehicle Name]"* displaying all eligible published fixed/airport route rates and hourly charter rates for the vehicle's pricing class.
   - Comprehensive commercial disclosures: 20% chauffeur gratuity, tolls, statutory surcharges (NYS Congestion, MTA CBD, PANYNJ Airport Access).
   - Empty state fallback: Vehicles with no published rates (e.g. Toyota RAV4 in Standard SUV) render an informative custom quotation card without empty tables.
3. **Rates & Options Vehicle Class Filtering (`/rates-and-options`):**
   - Full support for `?vehicleClass=<slug-or-id>` query parameter.
   - Filter banner displaying *"Vehicle Class: [Class Name]"* with dedicated 1-click clear action.
   - Simultaneous filtering support: Users can filter by both location and vehicle class simultaneously (e.g., `?location=manhattan&vehicleClass=premium-crossover-suv&tab=airport`).
   - Zero-match protection: When filtering produces 0 results, renders clear notice *"No published route rates are currently available for [Vehicle Class] departing from [Location]. Request a Custom Quote."* without falling back to unfiltered rates or leaking other vehicle classes.

---

## 2. Dynamic Matching & Isolation Rules

- **Strict Relationship Matching:** Vehicles map to tariffs strictly via their Payload CMS `vehicleClass` relationship (ID and canonical slug).
- **No Substring Matching:** `isRouteMatchingVehicleClass` and `isHourlyMatchingVehicleClass` reject partial queries like `suv` or `crossover` against `standard-suv` or `premium-crossover-suv`.
- **No Model Name Leakage:** Vehicle model names (`cadillac-xt6`, `toyota-rav4`) cannot match vehicle class tariffs directly.
- **Cross-Class Isolation:** Queries for Standard SUV strictly exclude Premium Crossover SUV rates and vice versa.

---

## 3. Database & Rate Card Reality

- **Shared Database:** Neon Serverless PostgreSQL (`ep-quiet-sky-b8ned4h6-pooler`).
- **Zero Schema Mutations:** `DATABASE_PUSH=false` enforced. No migrations executed or required.
- **Published Rate Cards:** Only Rate Card ID 4 (*Premium Crossover SUV — NYC Airport Transfers 2026*) is in `published` status with LA verification.
  - Cadillac XT6 (Premium Crossover SUV): Displays published airport rates (JFK $205, LGA $175, EWR $215) and custom quote for hourly.
  - Toyota RAV4 (Standard SUV): Displays custom-quote fallback for all tariffs (Card IDs 1 and 3 remain in `draft`).

---

## 4. Test & Quality Gate Summary

- **TypeScript Typecheck:** 0 errors (`npm --prefix apps/web run typecheck`).
- **ESLint:** 0 errors, 0 warnings (`npm --prefix apps/web run lint`).
- **Prettier:** Code formatting verified across all modified files.
- **Unit & Regression Test Suite:** **150 / 150 PASSING** (`npm --prefix apps/web test`).
  - Strict vehicle class isolation test (slug, ID, display name, substring rejection, model name rejection).
  - Strict hourly charter vehicle class isolation test.
  - Vehicle class display name resolution test.
  - UI contract regression test for Fleet Card, Fleet Detail CTA, and `<VehiclePricingSection />`.

---

## 5. Live Production Smoke Tests & Verification

The release was tested live on the production domain (`https://www.yourbestridenyc.com`):

| Test Vector | Target URL | HTTP Status | Production Verification Result |
| :--- | :--- | :---: | :--- |
| **Fleet Listing** | `/fleet` | `200 OK` | **PASS** — Each fleet vehicle card displays a secondary "View Rates" link targeting `/rates-and-options?vehicleClass=...`. |
| **Cadillac XT6 Detail** | `/fleet/cadillac-xt6` | `200 OK` | **PASS** — Hero "View Vehicle Rates" CTA active; renders *"Rates & Options for Cadillac XT6"* with JFK ($205.00), LGA ($175.00), EWR ($215.00); 20% chauffeur gratuity and toll disclosures verified. |
| **Toyota RAV4 Detail** | `/fleet/toyota-rav4` | `200 OK` | **PASS** — Renders *"Rates & Options for Toyota RAV4"* with elegant custom quote fallback card (*"Published fixed rates for the Toyota RAV4 (Standard SUV) are currently quoted on request..."*). |
| **Rates & Options (Premium Crossover)** | `/rates-and-options?vehicleClass=premium-crossover-suv&tab=airport` | `200 OK` | **PASS** — Renders *"Vehicle Class: Premium Crossover SUV (3 routes)"*; displays JFK $205, LGA $175, EWR $215 routes. |
| **Rates & Options (Standard SUV)** | `/rates-and-options?vehicleClass=standard-suv&tab=airport` | `200 OK` | **PASS** — Strictly isolates Standard SUV; zero route leakage from Premium Crossover; renders *"No Published Routes for Standard SUV"* empty notice and reset action. |
| **Combined Filters** | `/rates-and-options?location=manhattan&vehicleClass=premium-crossover-suv&tab=airport` | `200 OK` | **PASS** — Renders both *"Filtered by Location: Manhattan"* and *"Vehicle Class: Premium Crossover SUV"*; displays 3 routes. |
| **Combined Zero-Match** | `/rates-and-options?location=brooklyn&vehicleClass=premium-crossover-suv&tab=airport` | `200 OK` | **PASS** — Zero route leakage; renders *"No Published Routes for Premium Crossover SUV from Brooklyn"*. |
