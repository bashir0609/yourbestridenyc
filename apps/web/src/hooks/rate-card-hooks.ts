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
  const drizzle = (req.payload?.db as unknown as { drizzle?: { execute: (query: unknown) => Promise<unknown> } })?.drizzle;
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

  const vehicleClassId = typeof data.vehicleClass === 'object' && data.vehicleClass !== null
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
    const exStart = existing.effectiveFrom ? new Date(existing.effectiveFrom as string).getTime() : 0;
    const exEnd = existing.effectiveTo ? new Date(existing.effectiveTo as string).getTime() : Infinity;

    // Overlap condition: max(startA, startB) < min(endA, endB)
    const overlaps = Math.max(newStart, exStart) < Math.min(newEnd, exEnd);

    if (overlaps) {
      if (data.serviceScope === 'service_specific') {
        // For service-specific cards, conflict only exists if they share a service
        const newServices = Array.isArray(data.services)
          ? data.services.map((s: unknown) => (typeof s === 'object' && s !== null ? (s as { id?: unknown }).id : s))
          : [];
        const exServices = Array.isArray(existing.services)
          ? existing.services.map((s: unknown) => (typeof s === 'object' && s !== null ? (s as { id?: unknown }).id : s))
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

export const enforceReconciliationGate: CollectionBeforeChangeHook = async ({
  data,
  req,
}) => {
  const isPublishing = data._status === 'published';
  const rec = data.reconciliation || {};

  // Restrict reconciliation status elevation to administrators
  if (['la_verified', 'published'].includes(rec.status) || isPublishing) {
    if (!hasRole(req.user, ['admin'])) {
      throw new ValidationError({
        errors: [
          {
            path: 'reconciliation.status',
            message: 'Unauthorized: Only an Administrator can mark rate cards as LA Verified or publish live pricing tariffs.',
          },
        ],
      });
    }
  }

  // Publication gate
  if (isPublishing) {
    if (rec.status !== 'la_verified' && rec.status !== 'published') {
      throw new ValidationError({
        errors: [
          {
            path: 'reconciliation.status',
            message: 'Cannot publish rate card: Rate card must be marked "LA Verified & Reconciled" before publishing.',
          },
        ],
      });
    }

    if (!rec.laReferenceCode || typeof rec.laReferenceCode !== 'string' || rec.laReferenceCode.trim().length < 3) {
      throw new ValidationError({
        errors: [
          {
            path: 'reconciliation.laReferenceCode',
            message: 'Cannot publish rate card: A valid Limo Anywhere Reference Code (Matrix ID, Table ID, or Quote #) is mandatory.',
          },
        ],
      });
    }

    if (!rec.reconciliationNotes || typeof rec.reconciliationNotes !== 'string' || rec.reconciliationNotes.trim().length < 10) {
      throw new ValidationError({
        errors: [
          {
            path: 'reconciliation.reconciliationNotes',
            message: 'Cannot publish rate card: Verification audit notes detailing the Limo Anywhere test quote are mandatory (minimum 10 characters).',
          },
        ],
      });
    }

    // Populate automated audit stamps
    data.reconciliation = {
      ...rec,
      status: 'published',
      verifiedBy: rec.verifiedBy || req.user?.id,
      verifiedAt: rec.verifiedAt || new Date().toISOString(),
    };
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
