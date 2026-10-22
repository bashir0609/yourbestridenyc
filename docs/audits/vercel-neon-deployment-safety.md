# Vercel & Neon Deployment Safety Audit

**Project:** Your Best Ride Inc.  
**Auditor:** Automated Engineering Verification Suite  
**Date:** October 22, 2026  
**Active Git Branch:** `feature/single-deployment-payload`  
**GitHub Repository:** `bashir0609/yourbestridenyc`  
**Vercel Project:** `yourbestridenyc` (`prj_dMDk9Llm8GVLsxyfsj8Gre1TO33G`)  
**Deployment State:** Read-Only Audit (No pushes, merges, or deployments executed)

---

## 1. Executive Summary & Critical Findings

A read-only investigation of the Vercel project configuration, environment variable scoping, GitHub repository linkage, and Neon PostgreSQL database architecture was performed using the Vercel CLI (`v60.1.3`) and Git.

> [!CAUTION]
> **CRITICAL ENVIRONMENT CONFIGURATION DEFECT DISCOVERED ON VERCEL:**  
> On the Vercel project `yourbestridenyc`, `DATABASE_URI` is currently configured with the shared scope **`Production, Preview`**.  
> **Risk:** If a commit is pushed to the feature branch `feature/single-deployment-payload`, Vercel will automatically build and deploy a **Preview** environment that connects directly to the **PRODUCTION** database.  
> **Remediation Required Before Feature Push:** A dedicated Preview-scoped `DATABASE_URI` pointing exclusively to the isolated Neon staging branch (`ep-quiet-sky-b8ned4h6-pooler`) must be established in Vercel prior to pushing any feature branch commits.

---

## 2. Git & Vercel Project Association

### 2.1 Repository & Branch Association
- **GitHub Origin:** `https://github.com/bashir0609/yourbestridenyc`
- **Production Branch:** `master` (Linked to production domain `https://www.yourbestridenyc.com`)
- **Development Branch:** `feature/single-deployment-payload` (Linked to preview domain `https://yourbestridenyc-git-feature-si-b7d5da-bashirs-projects-a643c72f.vercel.app`)
- **Automatic Deployment Status:** Enabled on GitHub pushes for all branches.

### 2.2 Vercel Project Settings
- **Project ID:** `prj_dMDk9Llm8GVLsxyfsj8Gre1TO33G`
- **Owner Scope:** `bashirs-projects-a643c72f`
- **Root Directory:** `apps/web`
- **Framework Preset:** Next.js
- **Build Command:** `pnpm build`
- **Node.js Version:** `24.x`
- **Primary Region:** `iad1` (US East, Washington D.C.)

### 2.3 Verified Domain Assignments
- **Production Primary:** `https://www.yourbestridenyc.com`
- **Production Apex Redirect:** `https://yourbestridenyc.com`
- **Vercel Default Production:** `https://yourbestridenyc.vercel.app`
- **Vercel Git-Master Alias:** `https://yourbestridenyc-git-master-bashirs-projects-a643c72f.vercel.app`
- **Feature Branch Preview Alias:** `https://yourbestridenyc-git-feature-si-b7d5da-bashirs-projects-a643c72f.vercel.app`

---

## 3. Environment Variable Scope & Isolation Audit

A read-only audit of environment variable scopes (`npx vercel env ls`) was performed without exposing sensitive credentials:

| Environment Variable | Configured Scopes | Security Status / Assessment | Action Required |
| :--- | :--- | :--- | :--- |
| `SITE_URL` | Preview (`https://...`), Production (`https://...`) | **ISOLATED** (Configured separately) | None |
| `NEXT_PUBLIC_GTM_ID` | Preview, Production | **SHARED** (Safe for analytics tracking) | None |
| `DATABASE_URI` | **Production, Preview** | **CRITICAL DEFECT** (Preview shares DB with Prod) | **Split scopes: Add Preview override pointing to Neon Staging** |
| `DATABASE_URL` | Preview, Production | **SHARED** (Mirrors Neon connection) | Update Preview scope to match staging |
| `POSTGRES_URL` | Preview, Production | **SHARED** (Neon Vercel Integration) | Update Preview scope to match staging |
| `POSTGRES_HOST` / `PGHOST`| Preview, Production | **SHARED** (Neon Vercel Integration) | Update Preview scope to match staging |
| `DATABASE_PUSH` | Production, Preview | **SAFE** (Enforces `false`, no auto-DDL) | Keep `false` across all environments |
| `PAYLOAD_SECRET` | Production, Preview | **SHARED** (Admin session authentication) | Keep separate or shared |
| `S3_*` (Cloudflare R2) | Production, Preview | **SHARED** (Marketing media bucket) | Acceptable for marketing images |
| `LIMO_ANYWHERE_BOOKING_URL`| Production, Preview | **SHARED** (Directs to official ORES widget) | Keep production booking URL |
| `CMS_ALLOW_FIRST_USER` | Production, Preview | **SAFE** (Enforces `false`, admin signups disabled)| Keep `false` |

---

## 4. Neon PostgreSQL Database State & Branching

### 4.1 Neon Staging Branch Verification
- **Endpoint:** `ep-quiet-sky-b8ned4h6-pooler.c-14.us-east-1.aws.neon.tech/neondb`
- **Role:** Staging / Local isolated development
- **Applied Migrations:**
  - Batch 1: `initial_neon_schema` (`Ran: Yes`)
  - Batch 2: `add_pricing_engine` ([`20261022_182542_add_pricing_engine.ts`](file:///c:/Users/Islah4/Desktop/Apps/YourBestRide/apps/web/src/migrations/20261022_182542_add_pricing_engine.ts)) (`Ran: Yes`)
- **Record Integrity:** `users: 1`, `services: 6`, `fleet_vehicles: 2` (100% preserved)
- **Concurrency Extension:** `btree_gist` active and advisory transaction locks verified.

### 4.2 Neon Production Database Verification
- **Production Status:** UNTOUCHED.
- **Migration Status:** Batch 2 (`add_pricing_engine`) has **NOT** been run on Production.
- **Data Protection:** `DATABASE_PUSH=false` active on Production. No schema divergence or locking has occurred.

---

## 5. Strict Deployment Safeguards & Protocol Compliance

In strict adherence to the deployment restrictions:

1. **NO Master Push:** No commits or pushes have been or will be made to `master`.
2. **NO Merge:** Feature branch `feature/single-deployment-payload` has not been merged into `master`.
3. **NO Force-Push:** Force-pushing is strictly barred across all branches.
4. **NO Feature Branch Push:** Pushing to `origin/feature/single-deployment-payload` has been held pending explicit user authorization and Vercel Preview environment variable isolation.
5. **NO `vercel --prod`:** Direct production CLI deployment has not been executed.
6. **NO Unfinished Pricing on Prod:** Phase 1 schemas and pure functions remain isolated to the local repository and Neon staging branch.

---

## 6. Pre-Deployment Action Plan (Release Gate)

To safely permit a future Vercel Preview deployment of the feature branch:

1. **Vercel Environment Scoping Fix:**
   - In Vercel Project Settings $\rightarrow$ Environment Variables, edit `DATABASE_URI` so that the Production value is scoped **ONLY** to `Production`.
   - Add a new `DATABASE_URI` scoped **ONLY** to `Preview` pointing to the Neon staging endpoint (`ep-quiet-sky-b8ned4h6-pooler...`).
2. **Verify Scoping with Vercel CLI:**
   - Run `npx vercel env ls` to confirm `DATABASE_URI` appears twice: once with environment `Production`, and once with environment `Preview`.
3. **Obtain Explicit Authorization:**
   - Solicit user approval prior to executing `git push origin feature/single-deployment-payload`.
4. **Preview Verification:**
   - Monitor the automated Preview build. Verify that it connects to the staging database, that the admin panel functions, and that existing services and vehicles remain visible.
5. **Production Release (Only When Phase 2 Is Complete & Approved):**
   - Migration Batch 2 review and execution against Production.
   - Separate explicit authorization before merging into `master`.
