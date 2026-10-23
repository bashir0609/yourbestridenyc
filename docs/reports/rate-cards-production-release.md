# Your Best Ride — Rate Cards & Pricing Engine Production Release Report

**Project:** Your Best Ride Inc.  
**Release Date:** October 23, 2026 (19:15 UTC+6)  
**Target Environment:** Production (`https://www.yourbestridenyc.com`)  
**Production Branch:** `master`  
**Shared Database:** Neon Serverless PostgreSQL (`neondb`)  
**Status:** **SUCCESS (Deployed & Verified Live)**  

---

## 1. Executive Summary & Release Scope

This release officially deploys the **Admin-Controlled Pricing Architecture and Rate Cards System** to Production on `master`.

### Core Capabilities Released:
1. **CMS Rate Cards System:** Administrator management of transportation tariffs in Payload CMS (`/admin` &rarr; Rate Cards) across Fixed Route, Hourly, Mileage, and Custom pricing models.
2. **Reconciliation & Audit Gate:** Mandatory verification against Limo Anywhere test quotes before publishing. Server-side derivers enforce `verifiedBy` and `verifiedAt`. Material changes automatically invalidate verification.
3. **Transparent Public Pricing (`/rates-and-options`):** Responsive multi-model tariff comparison interface with vehicle class specifications, statutory fee disclosures, and prefilled custom quote inquiry scenarios.
4. **Service & Fleet Integration:** Service pages dynamically display eligible starting prices derived from published rate cards. Fleet vehicle cards and detail pages dynamically link to vehicle class rate profiles.
5. **Customer-Facing Terminology:** Complete removal of internal "ORES" booking terminology across all public components, standardizing on "Book Now", "Check Availability & Book", and "Request a Custom Quote".

---

## 2. Planned 2026 Rate Cards Status

The four planned commercial tariffs are configured in the shared database as follows:

| Rate Card Title | ID | Vehicle Class | Pricing Model | Published Tariff / Benchmark | Reconciliation Status | Customer Presentation |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **Standard SUV — Hourly Chauffeur Rate 2026** | `1` | Standard SUV | Hourly | $115.00/hr (3-hr minimum) | `draft` | Protected (Empty state CTA) |
| **Premium Crossover SUV — Hourly Chauffeur Rate 2026** | `2` | Premium Crossover SUV | Hourly | $135.00/hr (3-hr minimum) | `draft` | Protected (Empty state CTA) |
| **Standard SUV — NYC Airport Transfers 2026** | `3` | Standard SUV | Fixed Route | JFK: $175, LGA: $150, EWR: $185 | `draft` | Protected (Empty state CTA) |
| **Premium Crossover SUV — NYC Airport Transfers 2026** | `4` | Premium Crossover SUV | Fixed Route | JFK: $205, LGA: $175, EWR: $215 | **`published`** (LA Verified) | **Live on `/rates-and-options`** |

*Rate Card ID 4 was verified against Limo Anywhere matrix `Default Fixed Rate Matrix / MHT / PCSUV / JFK-LGA-EWR` by Administrator ID 1 on `2026-10-23T12:46:07Z` and published. Draft cards remain protected from customer display until administrator reconciliation.*

---

## 3. Disclosures & Commercial Policies

* **Chauffeur Gratuity:** 20% standard gratuity is disclosed as calculated upon net base fare during checkout in Limo Anywhere.
* **Statutory Surcharges:** NYS Congestion Surcharge ($2.75 Tax Law § 1281), Port Authority Airport Access Fee, and MTA CBD entry fees are itemized transparently.
* **Commercial Policies:** Curbside grace (15 mins), Domestic airport grace (30 mins), International airport grace (60 mins), and late-night window (23:00–05:00) are fully documented.

---

## 4. Database Safety & Migration Audit

* **Shared Database:** Neon Serverless PostgreSQL (`ep-quiet-sky-b8ned4h6-pooler`).
* **Migration Batch 2:** Migration `20261022_182542_add_pricing_engine` was applied transactionally to Neon on `2026-10-22T18:27:25Z`.
* **Zero Migration Execution:** No database schema alterations or migrations were run during this Production release.
* **`DATABASE_PUSH=false`:** Enforced across all environments, preventing accidental DDL schema sync at build or runtime.

---

## 5. Deployment Verification & Production Health

| Verification Vector | Production (`www.yourbestridenyc.com`) | Outcome |
| :--- | :---: | :---: |
| **Production Homepage (`/`)** | `200 OK` | **PASS** |
| **Rates & Options Page (`/rates-and-options`)** | `200 OK` (Live Published Tariff Table) | **PASS** |
| **Limo Anywhere Booking (`/book`)** | `200 OK` (ORES Secure Iframe Active) | **PASS** |
| **Fleet Directory (`/fleet`)** | `200 OK` | **PASS** |
| **Services Directory (`/services`)** | `200 OK` | **PASS** |
| **Admin Portal (`/admin/login`)** | `200 OK` | **PASS** |
| **Limo Anywhere Rates & API** | Untouched & Preserved | **PASS** |
| **Cloudflare R2 Media Delivery** | Untouched & Preserved | **PASS** |
