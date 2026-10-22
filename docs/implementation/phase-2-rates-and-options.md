# Phase 2 Implementation: Rates & Options Customer-Facing Experience

**Project:** Your Best Ride Inc.  
**Branch:** `feature/single-deployment-payload`  
**Status:** Implemented locally & verified against Neon PostgreSQL + Payload CMS 3  
**Date:** October 2026  

---

## 1. Executive Summary

Phase 2 introduces the complete customer-facing pricing and tariff presentation layer for Your Best Ride Inc. Built on top of the Phase 1 pricing schema and Phase 1.5 fleet vehicle mappings, this frontend architecture exposes transparent, verifiable rate schedules, vehicle class comparisons, statutory fee disclosures, and streamlined booking paths without hardcoding rate benchmarks or fabricating figures when tariff records are pending reconciliation.

All rate data displayed to customers is derived dynamically from published, Limo Anywhere–reconciled `rate-cards` records. In the current operational state where zero public rate cards are published, the system renders honest, transparent quotation interfaces and explicit booking CTAs via the official Limo Anywhere ORES integration.

---

## 2. Architecture & File Structure

### 2.1 Newly Created Files

1. **[`apps/web/src/lib/cms/pricing-types.ts`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/lib/cms/pricing-types.ts)**:
   - Strong TypeScript view models decoupled from raw database tables:
     - `VehicleClassCard`: Passenger & luggage capacities, tier, image, summary.
     - `FixedRouteEntry`: Point-to-point flat rates, stop fees, vehicle class association.
     - `HourlyCharterEntry`: Hourly rates, minimum charter hours, grace periods, late-night surcharges.
     - `MileagePolicyEntry`: Base dispatch fees, per-mile rates, deadhead policies.
     - `FeeRuleEntry`: Statutory and operational fee rules with customer disclosures.
     - `PricingSettingsView`: Global default policies, tax notes, affiliate single-tariff notice.
     - `RatesAndOptionsContent`: Aggregated payload for `/rates-and-options`.
     - `ServicePricingInfo`: Starting price computation for service detail pages.

2. **[`apps/web/src/lib/cms/pricing-queries.ts`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/lib/cms/pricing-queries.ts)**:
   - React-cached server query functions:
     - `getVehicleClasses()`: Fetches published vehicle classes sorted by display order.
     - `getPricingSettings()`: Fetches global tariff settings with defensive fallbacks.
     - `getActiveRateCards(serviceSlug?)`: Retrieves published, reconciled (`active`) rate cards filtered by effective date windows (`effectiveFrom` / `effectiveTo`) and service scope.
     - `getRatesAndOptionsContent()`: Aggregates tariff cards into fixed routes, hourly charters, mileage policies, and deduplicated fee rules.
     - `getServicePricing(service)`: Dynamically computes starting rates strictly matching the service's `eligiblePricingModel` via `computeStartingPrice`.

3. **[`apps/web/src/components/rates-and-options/RatesAndOptionsTabs.tsx`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/components/rates-and-options/RatesAndOptionsTabs.tsx)**:
   - Interactive client component featuring accessible tab navigation (`aria-selected`, `role="tab"`, keyboard controls):
     - **Airport & Fixed Routes Tab**: Point-to-point flat rate comparison table with origin/destination zones and vehicle class badges.
     - **Hourly Charters Tab**: As-directed service comparison with minimum hour requirements, overtime increments, and curbside/airport grace periods.
     - **Mileage Quotations Tab**: Informational formula explanation (flag drop, per-mile routing, deadhead thresholds) and direct quotation CTA via ORES.
     - **Custom & Event Packages Tab**: Specialized cards for corporate delegations, wedding transfers, and VIP airport meet-and-greets.
     - **Vehicle Classes Overview Strip**: Summary cards showing verified passenger and luggage capacities with vehicle class badges.
     - **Statutory Disclosures Section**: Explicit itemization of NYS Congestion Surcharge ($2.75 Tax Law § 1281), MTA CBD Tolling ($1.50 black car plan), PANYNJ Airport Access fees ($2.50), and universal affiliate tariff rules.
     - **Empty State Card**: When rate cards are empty, displays an honest notice with direct links to the Limo Anywhere reservation system and customer dispatch.

4. **[`apps/web/src/app/(frontend)/rates-and-options/page.tsx`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/app/(frontend)/rates-and-options/page.tsx)**:
   - Standalone Next.js App Router page at `/rates-and-options`.
   - Revalidation schedule: ISR `revalidate = 300` (5 minutes).
   - Generates SEO metadata: `"Rates & Options | Executive Chauffeured Transportation | Your Best Ride"`.
   - Includes hero section, tabbed pricing panels, vehicle class guide, and inline dispatch quotation inquiry form.

5. **[`apps/web/tests/pricing-frontend.test.ts`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/tests/pricing-frontend.test.ts)**:
   - Unit tests covering mapper transformations, capacity projections, empty rate card fallbacks, and starting price derivations.

---

### 2.2 Modified Files

1. **[`apps/web/src/lib/cms/types.ts`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/lib/cms/types.ts)**:
   - Extended `FleetVehicle` with optional `vehicleClass: { id?: number; name: string; slug: string; tier?: string }`.
   - Extended `ServicePage` with `pricingDisplay?: { showPricingOnPage?: boolean; pricingHeadline?: string; eligiblePricingModel?: ...; showStartingFrom?: boolean; startingFromNote?: string }`.

2. **[`apps/web/src/lib/cms/mappers.ts`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/lib/cms/mappers.ts)**:
   - `mapFleet()` projects `vehicleClass` (id, name, slug, tier) when linked.

3. **[`apps/web/src/lib/cms/page-mappers.ts`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/lib/cms/page-mappers.ts)**:
   - `mapServicePage()` maps `pricingDisplay` settings.
   - `mapFleetPage()` preserves `vehicleClass` and vehicle capacity.

4. **[`apps/web/src/app/(frontend)/services/[slug]/page.tsx`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/app/(frontend)/services/[slug]/page.tsx)**:
   - Integrated dynamic `service-pricing-section` rendering starting fares when published rate cards exist, or quotation guidance when rates are unlisted.

5. **[`apps/web/src/app/(frontend)/fleet/[slug]/page.tsx`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/app/(frontend)/fleet/[slug]/page.tsx)**:
   - Added `Pricing Class` badge linking directly to `/rates-and-options`.

6. **[`apps/web/src/components/public-content/index.tsx`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/components/public-content/index.tsx)**:
   - `FleetCard` renders vehicle class badge alongside category and passenger capacity.

7. **[`apps/web/src/components/navigation.tsx`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/components/navigation.tsx)**:
   - Added "Rates & Options" to header navigation bar.

8. **[`apps/web/src/components/footer.tsx`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/components/footer.tsx)**:
   - Added "Rates & options" to footer Explore links.

9. **[`apps/web/src/app/(frontend)/globals.css`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/app/(frontend)/globals.css)**:
   - Added styles for Rates & Options tabs, vehicle class badges, rate comparison tables, empty state cards, and responsive layouts.

---

## 3. Rate Derivation & Safety Protections

### 3.1 Zero-Rate Protection
When zero rate cards are published (the current live state):
- No arbitrary numbers or research benchmarks appear on the site.
- The UI renders an informative empty card explaining that binding quotes are generated dynamically based on date, time, and routing.
- Customers are directed to the official Limo Anywhere ORES booking flow (`/book`) or the custom transportation inquiry form.

### 3.2 Starting Price Isolation
- `computeStartingPrice()` only compares rate cards of the **same pricing model** specified in `service.pricingDisplay.eligiblePricingModel`.
- Fixed-route flat rates are never conflated with hourly minimums.
- Draft, inactive, or unverified rate cards are excluded from starting price calculations.

### 3.3 Regulatory Fee Transparency
Statutory fees are explicitly presented as separate surcharge items rather than being hidden in inflated base rates:
- **NYS Congestion Surcharge ($2.75)**: Mandated under NYS Tax Law § 1281 for trips touching Manhattan south of 96th Street.
- **MTA CBD Tolling ($1.50)**: Mandated for black-car entry into Manhattan south of 60th Street.
- **Port Authority Airport Access Fee ($2.50)**: Mandated for pickups at JFK, LGA, and EWR.
- **Universal Affiliate Tariff**: Discloses that certified affiliate fulfillment is billed at published company rates.

---

## 4. Verification & QA Results

1. **TypeScript Compilation (`npm run typecheck`)**:
   - `0 errors`. Full App Router route types generated.
2. **ESLint Linting (`npm run lint`)**:
   - `0 errors, 0 warnings`. Strict `--max-warnings=0` enforced.
3. **Unit & Integration Test Suite (`npm test`)**:
   - `124 passed / 0 failed / 0 skipped` (including 5 new Phase 2 frontend tests).
4. **Production Build (`npm run build`)**:
   - Successful production build.
   - 31/31 routes prerendered cleanly.
   - `/rates-and-options` configured with 5-minute ISR revalidation (`5m`).
