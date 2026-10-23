import { sql } from '@payloadcms/db-postgres';
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
} from 'payload';
import { ValidationError } from 'payload';
import { hasRole } from '../access';
import { invalidateCmsPaths } from '../lib/cms/path-revalidation';

export const validateRateCardDates: CollectionBeforeChangeHook = ({ data }) => {
  if (data.effectiveFrom && data.effectiveTo) {
    if (new Date(data.effectiveTo) <= new Date(data.effectiveFrom)) {
      throw new ValidationError({
        errors: [
          {
            path: 'effectiveTo',
            message: 'Expiry date must be chronologically after the effective-from date.',
          },
        ],
      });
    }
  }
  return data;
};

export const preventConflictingRates: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
}) => {
  // Concurrency and conflict validation only applies when publishing
  if (data._status !== 'published') return data;

  // 1. Acquire transaction-scoped advisory lock if running on PostgreSQL/Drizzle
  const drizzle = (
    req.payload?.db as unknown as { drizzle?: { execute: (query: unknown) => Promise<unknown> } }
  )?.drizzle;
  if (drizzle && typeof drizzle.execute === 'function') {
    try {
      const lockKey = `rate_cards_${data.vehicleClass}_${data.pricingModel}_${data.serviceScope || 'global'}`;
      await drizzle.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
    } catch {
      // Advisory locks may not be supported in in-memory test mocks; fail open to payload.find check
    }
  }

  // 2. Validate route-level uniqueness for fixed route pricing models
  if (data.pricingModel === 'fixed' && Array.isArray(data.routes)) {
    const routeSignatures = new Set<string>();
    for (let i = 0; i < data.routes.length; i++) {
      const r = data.routes[i];
      if (r && r.originZone && r.destinationZone) {
        const sig = `${r.originZone.trim().toLowerCase()}->${r.destinationZone.trim().toLowerCase()}`;
        if (routeSignatures.has(sig)) {
          throw new ValidationError({
            errors: [
              {
                path: `routes.${i}.destinationZone`,
                message: `Duplicate route entry for ${sig}. Each origin and destination pair must be unique within a rate card.`,
              },
            ],
          });
        }
        routeSignatures.add(sig);
      }
    }
  }

  // 3. Overlap check against existing published rate cards
  const newStart = data.effectiveFrom ? new Date(data.effectiveFrom).getTime() : 0;
  const newEnd = data.effectiveTo ? new Date(data.effectiveTo).getTime() : Infinity;

  const vehicleClassId =
    typeof data.vehicleClass === 'object' && data.vehicleClass !== null
      ? (data.vehicleClass as { id?: unknown }).id
      : data.vehicleClass;

  const existingCards = await req.payload.find({
    collection: 'rate-cards',
    where: {
      and: [
        { vehicleClass: { equals: vehicleClassId } },
        { pricingModel: { equals: data.pricingModel } },
        { serviceScope: { equals: data.serviceScope || 'global' } },
        { _status: { equals: 'published' } },
        ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
      ],
    },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  for (const existing of existingCards.docs) {
    const exStart = existing.effectiveFrom
      ? new Date(existing.effectiveFrom as string).getTime()
      : 0;
    const exEnd = existing.effectiveTo
      ? new Date(existing.effectiveTo as string).getTime()
      : Infinity;

    // Overlap condition: max(startA, startB) < min(endA, endB)
    const overlaps = Math.max(newStart, exStart) < Math.min(newEnd, exEnd);

    if (overlaps) {
      if (data.serviceScope === 'service_specific') {
        // For service-specific cards, conflict only exists if they share a service
        const newServices = Array.isArray(data.services)
          ? data.services.map((s: unknown) =>
              typeof s === 'object' && s !== null ? (s as { id?: unknown }).id : s,
            )
          : [];
        const exServices = Array.isArray(existing.services)
          ? existing.services.map((s: unknown) =>
              typeof s === 'object' && s !== null ? (s as { id?: unknown }).id : s,
            )
          : [];

        const hasSharedService = newServices.some((s: unknown) => exServices.includes(s));
        if (hasSharedService) {
          throw new ValidationError({
            errors: [
              {
                path: 'services',
                message: `An active service-specific rate card for this service and vehicle class already exists during the specified effective dates.`,
              },
            ],
          });
        }
      } else {
        // Global rate cards have global exclusivity
        throw new ValidationError({
          errors: [
            {
              path: 'pricingModel',
              message: `A published global ${data.pricingModel} rate card already exists for this vehicle class during the specified effective period (Card: "${existing.title}"). Archive or expire the existing card first.`,
            },
          ],
        });
      }
    }
  }

  return data;
};

function toId(val: unknown): string | null | undefined {
  if (val === null || val === undefined) return val;
  if (typeof val === 'object' && val !== null && 'id' in val) {
    const idVal = (val as { id: unknown }).id;
    return idVal === null || idVal === undefined ? undefined : String(idVal);
  }
  return String(val);
}

function toIdArray(arr: unknown): Array<string> {
  if (!Array.isArray(arr)) return [];
  return arr
    .map(toId)
    .filter((v): v is string => v !== null && v !== undefined)
    .sort();
}

function toIsoDate(val: unknown): string | null | undefined {
  if (val === null || val === undefined) return val;
  const d = new Date(val as string | number | Date);
  return isNaN(d.getTime()) ? String(val) : d.toISOString();
}

function routesEqual(
  a: Array<Record<string, unknown>> | undefined,
  b: Array<Record<string, unknown>> | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  const normalizeRoute = (r: Record<string, unknown>) => ({
    originZone: (r.originZone ?? '').toString().trim().toLowerCase(),
    destinationZone: (r.destinationZone ?? '').toString().trim().toLowerCase(),
    originLocation: toId(r.originLocation),
    destinationLocation: toId(r.destinationLocation),
    flatRate: Number(r.flatRate ?? 0),
    additionalStopFee: Number(r.additionalStopFee ?? 0),
  });

  const aNorm = a
    .map(normalizeRoute)
    .sort((x, y) =>
      `${x.originZone}->${x.destinationZone}`.localeCompare(
        `${y.originZone}->${y.destinationZone}`,
      ),
    );
  const bNorm = b
    .map(normalizeRoute)
    .sort((x, y) =>
      `${x.originZone}->${x.destinationZone}`.localeCompare(
        `${y.originZone}->${y.destinationZone}`,
      ),
    );

  return JSON.stringify(aNorm) === JSON.stringify(bNorm);
}

function hourlyEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const norm = (h: Record<string, unknown>) => ({
    hourlyRate: Number(h.hourlyRate ?? 0),
    minimumHours: Number(h.minimumHours ?? 0),
    additionalHourRate:
      h.additionalHourRate !== undefined && h.additionalHourRate !== null
        ? Number(h.additionalHourRate)
        : null,
    overtimeIncrementMinutes: Number(h.overtimeIncrementMinutes ?? 15),
    overtimeRate:
      h.overtimeRate !== undefined && h.overtimeRate !== null ? Number(h.overtimeRate) : null,
  });

  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

function mileageEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const norm = (m: Record<string, unknown>) => ({
    baseFare: Number(m.baseFare ?? 0),
    perMileRate: Number(m.perMileRate ?? 0),
    minimumFare: Number(m.minimumFare ?? 0),
    perMinuteRate:
      m.perMinuteRate !== undefined && m.perMinuteRate !== null ? Number(m.perMinuteRate) : null,
    deadheadThresholdMiles: Number(m.deadheadThresholdMiles ?? 0),
    deadheadRatePerMile:
      m.deadheadRatePerMile !== undefined && m.deadheadRatePerMile !== null
        ? Number(m.deadheadRatePerMile)
        : null,
    complimentaryWaitMinutes: Number(m.complimentaryWaitMinutes ?? 0),
    waitingRatePerHour:
      m.waitingRatePerHour !== undefined && m.waitingRatePerHour !== null
        ? Number(m.waitingRatePerHour)
        : null,
  });

  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

function policiesEqual(
  a: Record<string, unknown> | undefined,
  b: Record<string, unknown> | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;

  const norm = (p: Record<string, unknown>) => ({
    curbsideGraceMinutes: Number(p.curbsideGraceMinutes ?? 0),
    domesticAirportGraceMinutes: Number(p.domesticAirportGraceMinutes ?? 0),
    internationalAirportGraceMinutes: Number(p.internationalAirportGraceMinutes ?? 0),
    waitingHourlyRate: Number(p.waitingHourlyRate ?? 0),
    waitingIncrementMinutes: Number(p.waitingIncrementMinutes ?? 0),
    lateNightSurcharge: Number(p.lateNightSurcharge ?? 0),
    lateNightWindowStart: (p.lateNightWindowStart ?? '').toString().trim(),
    lateNightWindowEnd: (p.lateNightWindowEnd ?? '').toString().trim(),
  });

  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
}

function feesEqual(
  a: Array<Record<string, unknown>> | undefined,
  b: Array<Record<string, unknown>> | undefined,
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  const norm = (f: Record<string, unknown>) => ({
    feeIdentifier: (f.feeIdentifier ?? '').toString().trim(),
    feeCategory: (f.feeCategory ?? '').toString().trim(),
    triggerCondition: (f.triggerCondition ?? '').toString().trim(),
    billingType: (f.billingType ?? '').toString().trim(),
    amount: f.amount !== undefined && f.amount !== null ? Number(f.amount) : null,
  });

  const aNorm = a.map(norm).sort((x, y) => x.feeIdentifier.localeCompare(y.feeIdentifier));
  const bNorm = b.map(norm).sort((x, y) => x.feeIdentifier.localeCompare(y.feeIdentifier));

  return JSON.stringify(aNorm) === JSON.stringify(bNorm);
}

export function hasMaterialTariffChanges(
  originalDoc: Record<string, unknown> | undefined,
  data: Record<string, unknown>,
): boolean {
  if (!originalDoc) return false;

  // 1. Vehicle Class
  if (
    data.vehicleClass !== undefined &&
    toId(data.vehicleClass) !== toId(originalDoc.vehicleClass)
  ) {
    return true;
  }

  // 2. Service Scope
  if (data.serviceScope !== undefined && data.serviceScope !== originalDoc.serviceScope) {
    return true;
  }

  // 3. Applicable Services
  if (data.services !== undefined) {
    const sNew = toIdArray(data.services);
    const sOld = toIdArray(originalDoc.services);
    if (sNew.length !== sOld.length || sNew.some((id, i) => id !== sOld[i])) {
      return true;
    }
  }

  // 4. Pricing Model
  if (data.pricingModel !== undefined && data.pricingModel !== originalDoc.pricingModel) {
    return true;
  }

  // 5. Currency
  if (data.currency !== undefined && data.currency !== originalDoc.currency) {
    return true;
  }

  // 6. Effective Dates
  if (
    data.effectiveFrom !== undefined &&
    toIsoDate(data.effectiveFrom) !== toIsoDate(originalDoc.effectiveFrom)
  ) {
    return true;
  }
  if (
    data.effectiveTo !== undefined &&
    toIsoDate(data.effectiveTo) !== toIsoDate(originalDoc.effectiveTo)
  ) {
    return true;
  }

  // 7. Fixed Routes
  if (
    data.routes !== undefined &&
    !routesEqual(
      data.routes as Array<Record<string, unknown>>,
      originalDoc.routes as Array<Record<string, unknown>>,
    )
  ) {
    return true;
  }

  // 8. Hourly Terms
  if (
    data.hourly !== undefined &&
    !hourlyEqual(
      data.hourly as Record<string, unknown>,
      originalDoc.hourly as Record<string, unknown>,
    )
  ) {
    return true;
  }

  // 9. Mileage Parameters
  if (
    data.mileage !== undefined &&
    !mileageEqual(
      data.mileage as Record<string, unknown>,
      originalDoc.mileage as Record<string, unknown>,
    )
  ) {
    return true;
  }

  // 10. Commercial Policies
  if (
    data.commercialPolicies !== undefined &&
    !policiesEqual(
      data.commercialPolicies as Record<string, unknown>,
      originalDoc.commercialPolicies as Record<string, unknown>,
    )
  ) {
    return true;
  }

  // 11. Applicable Fees & Surcharges
  if (
    data.applicableFees !== undefined &&
    !feesEqual(
      data.applicableFees as Array<Record<string, unknown>>,
      originalDoc.applicableFees as Array<Record<string, unknown>>,
    )
  ) {
    return true;
  }

  return false;
}

export const enforceReconciliationGate: CollectionBeforeChangeHook = async ({
  data,
  req,
  originalDoc,
}) => {
  const isPublishing =
    data._status === 'published' ||
    (data._status === undefined && originalDoc?._status === 'published');
  const origRec = { ...(originalDoc?.reconciliation || {}) } as Record<string, unknown>;
  const rec = { ...origRec, ...(data.reconciliation || {}) } as Record<string, unknown>;

  const origWasVerified = ['la_verified', 'published'].includes(origRec.status as string);
  const targetIsVerified = ['la_verified', 'published'].includes(rec.status as string);
  const origHasValidVerification =
    origWasVerified && Boolean(origRec.verifiedBy) && Boolean(origRec.verifiedAt);

  // 1. Restrict reconciliation status elevation to administrators
  if (targetIsVerified || isPublishing) {
    if (!hasRole(req.user, ['admin'])) {
      throw new ValidationError({
        errors: [
          {
            path: 'reconciliation.status',
            message:
              'Unauthorized: Only an Administrator can mark rate cards as LA Verified or publish live pricing tariffs.',
          },
        ],
      });
    }
  }

  // 2. Material tariff changes invalidate existing reconciliation
  if (
    origWasVerified &&
    hasMaterialTariffChanges(
      originalDoc as Record<string, unknown>,
      data as Record<string, unknown>,
    )
  ) {
    rec.status = 'draft';
    rec.verifiedBy = null;
    rec.verifiedAt = null;
    data.reconciliation = rec;
  } else if (!targetIsVerified) {
    // 3. Unverified lifecycle states (draft, internal_review, la_pending_verification, archived) must not carry stale verification stamps
    rec.verifiedBy = null;
    rec.verifiedAt = null;
    data.reconciliation = rec;
  } else if (origHasValidVerification) {
    // 4. Rate card was already legitimately verified: preserve original verification stamp across harmless subsequent edits
    rec.verifiedBy = origRec.verifiedBy;
    rec.verifiedAt = origRec.verifiedAt;
    data.reconciliation = rec;
  } else if (!origWasVerified && targetIsVerified) {
    // 5. Fresh, explicit transition to verified from an unverified state by an authorized administrator
    rec.verifiedBy = req.user?.id ?? null;
    rec.verifiedAt = new Date().toISOString();
    data.reconciliation = rec;
  } else {
    // 6. Legacy draft document that claimed 'la_verified' without valid verification stamps.
    // Do NOT falsely attribute historical verification to an administrator performing an unrelated later save.
    // Invalidate the legacy unverified status and reset to 'draft'.
    // A fresh, explicit administrator verification action (transition from draft to la_verified) is required.
    rec.status = 'draft';
    rec.verifiedBy = null;
    rec.verifiedAt = null;
    data.reconciliation = rec;
  }

  // 7. Publication gate
  if (isPublishing) {
    if (rec.status !== 'la_verified' && rec.status !== 'published') {
      throw new ValidationError({
        errors: [
          {
            path: 'reconciliation.status',
            message:
              'Cannot publish rate card: Rate card must be marked "LA Verified & Reconciled" before publishing.',
          },
        ],
      });
    }

    if (
      !rec.laReferenceCode ||
      typeof rec.laReferenceCode !== 'string' ||
      rec.laReferenceCode.trim().length < 3
    ) {
      throw new ValidationError({
        errors: [
          {
            path: 'reconciliation.laReferenceCode',
            message:
              'Cannot publish rate card: A valid Limo Anywhere Reference Code (Matrix ID, Table ID, or Quote #) is mandatory.',
          },
        ],
      });
    }

    if (
      !rec.reconciliationNotes ||
      typeof rec.reconciliationNotes !== 'string' ||
      rec.reconciliationNotes.trim().length < 10
    ) {
      throw new ValidationError({
        errors: [
          {
            path: 'reconciliation.reconciliationNotes',
            message:
              'Cannot publish rate card: Verification audit notes detailing the Limo Anywhere test quote are mandatory (minimum 10 characters).',
          },
        ],
      });
    }

    if (!rec.verifiedBy || !rec.verifiedAt) {
      throw new ValidationError({
        errors: [
          {
            path: 'reconciliation.status',
            message:
              'Cannot publish rate card: Rate card lacks valid administrator verification stamps. Transition through LA Verified & Reconciled first.',
          },
        ],
      });
    }

    // Set published status and ensure stamps exist
    rec.status = 'published';
    data.reconciliation = rec;
  }

  return data;
};

export const revalidateRateCardsAfterChange: CollectionAfterChangeHook = async ({ doc }) => {
  const paths = new Set<string>(['/rates-and-options', '/services', '/services/[slug]']);
  invalidateCmsPaths([...paths]);
  return doc;
};

export const revalidateRateCardsAfterDelete: CollectionAfterDeleteHook = async ({ doc }) => {
  const paths = new Set<string>(['/rates-and-options', '/services', '/services/[slug]']);
  invalidateCmsPaths([...paths]);
  return doc;
};
