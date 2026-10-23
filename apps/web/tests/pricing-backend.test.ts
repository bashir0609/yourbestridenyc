import assert from 'node:assert/strict';
import test from 'node:test';
import type { PayloadRequest } from 'payload';
import { rateCardDelete, rateCardPublicRead, rateCardWrite } from '../src/access';
import {
  enforceReconciliationGate,
  hasMaterialTariffChanges,
  preventConflictingRates,
  validateRateCardDates,
} from '../src/hooks/rate-card-hooks';
import {
  computeStartingPrice,
  evaluateTripFees,
  qualifiesForMTACBDCharge,
  qualifiesForNYSCongestionSurcharge,
} from '../src/lib/cms/pricing-rules';
import { pathsForCmsChange } from '../src/lib/cms/path-revalidation';

interface ValidationErrorShape {
  name?: string;
  message?: string;
  data?: {
    errors?: Array<{ path?: string; message?: string }>;
  };
}

function asRequest(mock: unknown): PayloadRequest {
  return mock as PayloadRequest;
}

type HookArgs = Parameters<typeof validateRateCardDates>[0];

function mockArgs<T extends Record<string, unknown>>(
  data: T,
  req: PayloadRequest,
  operation: 'create' | 'update' = 'create',
  originalDoc?: Record<string, unknown>,
): HookArgs {
  return {
    data,
    req,
    operation,
    originalDoc: originalDoc as unknown as HookArgs['originalDoc'],
    context: {},
    collection: {} as unknown as HookArgs['collection'],
  };
}

function isValidationError(err: unknown, expectedPath?: string): boolean {
  if (!err || typeof err !== 'object') return false;
  const v = err as ValidationErrorShape;
  if (v.name !== 'ValidationError') return false;
  if (!expectedPath) return true;
  const pathInErrors = v.data?.errors?.[0]?.path;
  const pathInMessage = typeof v.message === 'string' && v.message.includes(expectedPath);
  return pathInErrors === expectedPath || pathInMessage;
}

test('validateRateCardDates enforces chronological date ordering', () => {
  const dummyReq = asRequest({});

  // Valid ordering
  const valid = validateRateCardDates(
    mockArgs(
      {
        effectiveFrom: '2026-11-01T00:00:00.000Z',
        effectiveTo: '2026-12-01T00:00:00.000Z',
      },
      dummyReq,
    ),
  );
  assert.equal(valid.effectiveFrom, '2026-11-01T00:00:00.000Z');

  // Invalid ordering (expiry before effective)
  assert.throws(
    () =>
      validateRateCardDates(
        mockArgs(
          {
            effectiveFrom: '2026-12-01T00:00:00.000Z',
            effectiveTo: '2026-11-01T00:00:00.000Z',
          },
          dummyReq,
        ),
      ),
    (err: unknown) => isValidationError(err, 'effectiveTo'),
  );

  // Equal dates
  assert.throws(
    () =>
      validateRateCardDates(
        mockArgs(
          {
            effectiveFrom: '2026-11-01T00:00:00.000Z',
            effectiveTo: '2026-11-01T00:00:00.000Z',
          },
          dummyReq,
        ),
      ),
    (err: unknown) => isValidationError(err),
  );
});

test('preventConflictingRates rejects duplicate routes within fixed rate cards', async () => {
  const req = asRequest({
    payload: {
      find: async () => ({ docs: [] }),
    },
  });

  // Duplicate JFK->Manhattan route in same card
  await assert.rejects(
    async () =>
      preventConflictingRates(
        mockArgs(
          {
            _status: 'published',
            pricingModel: 'fixed',
            vehicleClass: 1,
            routes: [
              { originZone: 'JFK Airport', destinationZone: 'Manhattan Midtown', flatRate: 145 },
              { originZone: 'JFK Airport', destinationZone: 'Manhattan Midtown', flatRate: 165 },
            ],
          },
          req,
        ),
      ),
    (err: unknown) => isValidationError(err, 'destinationZone'),
  );

  // Distinct routes succeed
  const ok = await preventConflictingRates(
    mockArgs(
      {
        _status: 'published',
        pricingModel: 'fixed',
        vehicleClass: 1,
        routes: [
          { originZone: 'JFK Airport', destinationZone: 'Manhattan Midtown', flatRate: 145 },
          { originZone: 'LGA Airport', destinationZone: 'Manhattan Midtown', flatRate: 115 },
        ],
      },
      req,
    ),
  );
  assert.equal(Array.isArray(ok.routes) ? ok.routes.length : 0, 2);
});

test('preventConflictingRates detects overlapping effective dates for global tariffs', async () => {
  const mockExisting = {
    id: 10,
    title: 'Existing 2026 Q4 Tariff',
    vehicleClass: 1,
    pricingModel: 'hourly',
    serviceScope: 'global',
    effectiveFrom: '2026-10-01T00:00:00.000Z',
    effectiveTo: '2026-12-31T23:59:59.000Z',
    _status: 'published',
  };

  const req = asRequest({
    payload: {
      find: async () => ({ docs: [mockExisting] }),
    },
  });

  // Overlapping request: Nov 1 to Jan 15
  await assert.rejects(
    async () =>
      preventConflictingRates(
        mockArgs(
          {
            _status: 'published',
            pricingModel: 'hourly',
            vehicleClass: 1,
            serviceScope: 'global',
            effectiveFrom: '2026-11-01T00:00:00.000Z',
            effectiveTo: '2027-01-15T00:00:00.000Z',
          },
          req,
        ),
      ),
    (err: unknown) => isValidationError(err, 'pricingModel'),
  );

  // Non-overlapping request: Jan 1 2027 onwards (no conflict)
  const nonOverlappingReq = asRequest({
    payload: {
      find: async () => ({ docs: [] }),
    },
  });

  const valid = await preventConflictingRates(
    mockArgs(
      {
        _status: 'published',
        pricingModel: 'hourly',
        vehicleClass: 1,
        serviceScope: 'global',
        effectiveFrom: '2027-01-01T00:00:00.000Z',
        effectiveTo: '2027-06-30T00:00:00.000Z',
      },
      nonOverlappingReq,
    ),
  );
  assert.equal(valid.effectiveFrom, '2027-01-01T00:00:00.000Z');
});

test('enforceReconciliationGate blocks publishing unverified or incomplete rate cards', async () => {
  const adminReq = asRequest({
    user: { id: 1, collection: 'users', role: 'admin' },
  });

  const contentManagerReq = asRequest({
    user: { id: 2, collection: 'users', role: 'content-manager' },
  });

  // 1. Non-admin cannot publish or verify
  await assert.rejects(
    async () =>
      enforceReconciliationGate(
        mockArgs(
          {
            _status: 'published',
            reconciliation: {
              status: 'la_verified',
              laReferenceCode: 'LA-101',
              reconciliationNotes: 'Test quote verified',
            },
          },
          contentManagerReq,
          'update',
        ),
      ),
    (err: unknown) => isValidationError(err),
  );

  // 2. Cannot publish if reconciliation status is still 'draft'
  await assert.rejects(
    async () =>
      enforceReconciliationGate(
        mockArgs(
          {
            _status: 'published',
            reconciliation: {
              status: 'draft',
              laReferenceCode: 'LA-101',
              reconciliationNotes: 'Test quote verified',
            },
          },
          adminReq,
          'update',
        ),
      ),
    (err: unknown) => isValidationError(err, 'reconciliation.status'),
  );

  // 3. Cannot publish without laReferenceCode
  await assert.rejects(
    async () =>
      enforceReconciliationGate(
        mockArgs(
          {
            _status: 'published',
            reconciliation: { status: 'la_verified', reconciliationNotes: 'Test quote verified' },
          },
          adminReq,
          'update',
        ),
      ),
    (err: unknown) => isValidationError(err, 'reconciliation.laReferenceCode'),
  );

  // 4. Cannot publish with notes that are too short (< 10 chars)
  await assert.rejects(
    async () =>
      enforceReconciliationGate(
        mockArgs(
          {
            _status: 'published',
            reconciliation: {
              status: 'la_verified',
              laReferenceCode: 'LA-101',
              reconciliationNotes: 'ok',
            },
          },
          adminReq,
          'update',
        ),
      ),
    (err: unknown) => isValidationError(err, 'reconciliation.reconciliationNotes'),
  );

  // 5. Valid publication stamps audit metadata and succeeds
  const approved = await enforceReconciliationGate(
    mockArgs(
      {
        _status: 'published',
        reconciliation: {
          status: 'la_verified',
          laReferenceCode: 'MATRIX-JFK-2026',
          reconciliationNotes: 'Test quote #90812 matched $145 base + fees in LA.',
        },
      },
      adminReq,
      'update',
    ),
  );

  const rec = approved.reconciliation as Record<string, unknown>;
  assert.equal(rec.status, 'published');
  assert.equal(rec.verifiedBy, 1);
  assert.ok(rec.verifiedAt);
});

test('enforceReconciliationGate handles draft verification lifecycle, audit stamping, and tamper resistance', async () => {
  const adminReq = asRequest({
    user: { id: 1, collection: 'users', role: 'admin' },
  });

  const adminReq2 = asRequest({
    user: { id: 42, collection: 'users', role: 'admin' },
  });

  const contentManagerReq = asRequest({
    user: { id: 2, collection: 'users', role: 'content-manager' },
  });

  const initialDraftDoc = {
    id: 10,
    title: 'Standard SUV Airport Tariff',
    vehicleClass: 3,
    pricingModel: 'hourly',
    serviceScope: 'global',
    hourly: {
      hourlyRate: 100,
      minimumHours: 2,
    },
    reconciliation: {
      status: 'draft',
      verifiedBy: null,
      verifiedAt: null,
    },
    _status: 'draft',
  };

  // 1. Unauthorized verification attempt by content-manager is rejected
  await assert.rejects(
    async () =>
      enforceReconciliationGate(
        mockArgs(
          {
            ...initialDraftDoc,
            reconciliation: { status: 'la_verified' },
          },
          contentManagerReq,
          'update',
          initialDraftDoc,
        ),
      ),
    (err: unknown) => isValidationError(err, 'reconciliation.status'),
  );

  // 2. Draft to LA Verified transition automatically assigns server identity & timestamp
  const verifiedResult = await enforceReconciliationGate(
    mockArgs(
      {
        ...initialDraftDoc,
        reconciliation: {
          status: 'la_verified',
          laReferenceCode: 'LA-AIRPORT-SUV-01',
          reconciliationNotes: 'Test quote verified with dispatcher in LA.',
        },
      },
      adminReq,
      'update',
      initialDraftDoc,
    ),
  );

  const rec = verifiedResult.reconciliation as Record<string, unknown>;
  assert.equal(rec.status, 'la_verified');
  assert.equal(rec.verifiedBy, 1);
  assert.ok(typeof rec.verifiedAt === 'string');
  const originalTimestamp = rec.verifiedAt;

  const verifiedDoc = {
    ...initialDraftDoc,
    reconciliation: {
      ...rec,
    },
  };

  // 3. Subsequent draft save without modifications preserves the original stamp (does not overwrite)
  const subsequentSaveResult = await enforceReconciliationGate(
    mockArgs(
      {
        ...verifiedDoc,
      },
      adminReq2, // Even if another admin saves harmlessly
      'update',
      verifiedDoc,
    ),
  );
  const subsequentRec = subsequentSaveResult.reconciliation as Record<string, unknown>;
  assert.equal(subsequentRec.status, 'la_verified');
  assert.equal(subsequentRec.verifiedBy, 1, 'Original verifiedBy must be preserved');
  assert.equal(
    subsequentRec.verifiedAt,
    originalTimestamp,
    'Original verifiedAt timestamp must be preserved',
  );

  // 4. Preservation of verification metadata during harmless edits (e.g. changing title, notes, fare inclusions)
  const harmlessEditResult = await enforceReconciliationGate(
    mockArgs(
      {
        ...verifiedDoc,
        title: 'Updated Descriptive Marketing Title',
        reconciliation: {
          ...verifiedDoc.reconciliation,
          reconciliationNotes: 'Updated verification note with additional quote reference.',
        },
        fareInclusions: [{ item: 'Bottled Mineral Water' }, { item: 'Onboard Wi-Fi' }],
      },
      adminReq,
      'update',
      verifiedDoc,
    ),
  );
  const harmlessRec = harmlessEditResult.reconciliation as Record<string, unknown>;
  assert.equal(harmlessRec.status, 'la_verified');
  assert.equal(harmlessRec.verifiedBy, 1);
  assert.equal(harmlessRec.verifiedAt, originalTimestamp);

  // 5. API attempts to forge administrator or timestamp are ignored & derived server-side
  // Case A: Forgery on initial transition from draft
  const forgeryAttempt1 = await enforceReconciliationGate(
    mockArgs(
      {
        ...initialDraftDoc,
        reconciliation: {
          status: 'la_verified',
          verifiedBy: 9999, // Forged ID
          verifiedAt: '2020-01-01T00:00:00.000Z', // Forged ancient date
        },
      },
      adminReq2,
      'update',
      initialDraftDoc,
    ),
  );
  const forgeryRec1 = forgeryAttempt1.reconciliation as Record<string, unknown>;
  assert.equal(
    forgeryRec1.verifiedBy,
    42,
    'Server must enforce req.user.id and ignore client forgery',
  );
  assert.notEqual(
    forgeryRec1.verifiedAt,
    '2020-01-01T00:00:00.000Z',
    'Server must ignore client-forged timestamp',
  );

  // Case B: Forgery on update to an already verified doc
  const forgeryAttempt2 = await enforceReconciliationGate(
    mockArgs(
      {
        ...verifiedDoc,
        reconciliation: {
          status: 'la_verified',
          verifiedBy: 8888,
          verifiedAt: '1999-12-31T23:59:59.000Z',
        },
      },
      adminReq,
      'update',
      verifiedDoc,
    ),
  );
  const forgeryRec2 = forgeryAttempt2.reconciliation as Record<string, unknown>;
  assert.equal(
    forgeryRec2.verifiedBy,
    1,
    'Server must preserve original verifiedBy and ignore client forgery',
  );
  assert.equal(
    forgeryRec2.verifiedAt,
    originalTimestamp,
    'Server must preserve original verifiedAt',
  );

  // 6. Demoting back to Draft clears stale verification stamps
  const demoteResult = await enforceReconciliationGate(
    mockArgs(
      {
        ...verifiedDoc,
        reconciliation: {
          status: 'draft',
        },
      },
      adminReq,
      'update',
      verifiedDoc,
    ),
  );
  const demoteRec = demoteResult.reconciliation as Record<string, unknown>;
  assert.equal(demoteRec.status, 'draft');
  assert.equal(demoteRec.verifiedBy, null, 'verifiedBy must be cleared when returned to draft');
  assert.equal(demoteRec.verifiedAt, null, 'verifiedAt must be cleared when returned to draft');

  // 7. Material rate change after verification invalidates reconciliation and clears stamps
  const materialChangeResult = await enforceReconciliationGate(
    mockArgs(
      {
        ...verifiedDoc,
        hourly: {
          hourlyRate: 135, // Rate changed from 100 to 135
          minimumHours: 2,
        },
      },
      adminReq,
      'update',
      verifiedDoc,
    ),
  );
  const invalidatedRec = materialChangeResult.reconciliation as Record<string, unknown>;
  assert.equal(
    invalidatedRec.status,
    'draft',
    'Material rate change must invalidate reconciliation to draft',
  );
  assert.equal(invalidatedRec.verifiedBy, null, 'Stamps must be cleared upon invalidation');
  assert.equal(invalidatedRec.verifiedAt, null);

  // 8. Re-verification after material changes succeeds and stamps fresh verification
  const invalidatedDoc = {
    ...verifiedDoc,
    hourly: {
      hourlyRate: 135,
      minimumHours: 2,
    },
    reconciliation: {
      status: 'draft',
      verifiedBy: null,
      verifiedAt: null,
    },
  };

  const reVerifiedResult = await enforceReconciliationGate(
    mockArgs(
      {
        ...invalidatedDoc,
        reconciliation: {
          status: 'la_verified',
          laReferenceCode: 'LA-NEW-RATE-135',
          reconciliationNotes: 'Verified revised $135/hr rate matrix with LA.',
        },
      },
      adminReq2,
      'update',
      invalidatedDoc,
    ),
  );
  const reVerifiedRec = reVerifiedResult.reconciliation as Record<string, unknown>;
  assert.equal(reVerifiedRec.status, 'la_verified');
  assert.equal(reVerifiedRec.verifiedBy, 42);
  assert.ok(typeof reVerifiedRec.verifiedAt === 'string');
  assert.notEqual(reVerifiedRec.verifiedAt, originalTimestamp);

  // 9. Publishing gate: Cannot publish unverified or invalidated rates
  await assert.rejects(
    async () =>
      enforceReconciliationGate(
        mockArgs(
          {
            ...invalidatedDoc,
            _status: 'published',
            reconciliation: {
              status: 'draft',
            },
          },
          adminReq,
          'update',
          invalidatedDoc,
        ),
      ),
    (err: unknown) => isValidationError(err, 'reconciliation.status'),
  );

  // 10. Publishing with valid reconciliation promotes status to published and preserves stamps
  const publishedResult = await enforceReconciliationGate(
    mockArgs(
      {
        ...invalidatedDoc,
        _status: 'published',
        reconciliation: {
          status: 'la_verified',
          laReferenceCode: 'LA-PUBLISH-99',
          reconciliationNotes: 'Reconciliation quote #99 passed dispatch test.',
          verifiedBy: reVerifiedRec.verifiedBy,
          verifiedAt: reVerifiedRec.verifiedAt,
        },
      },
      adminReq2,
      'update',
      {
        ...invalidatedDoc,
        reconciliation: reVerifiedRec,
      },
    ),
  );
  const pubRec = publishedResult.reconciliation as Record<string, unknown>;
  assert.equal(pubRec.status, 'published');
  assert.equal(pubRec.verifiedBy, 42);
  assert.equal(pubRec.verifiedAt, reVerifiedRec.verifiedAt);
});

test('hasMaterialTariffChanges accurately distinguishes material commercial edits from harmless edits', () => {
  const baseDoc = {
    vehicleClass: 1,
    serviceScope: 'global',
    services: [1, 2],
    pricingModel: 'fixed',
    currency: 'USD',
    effectiveFrom: '2026-10-01T00:00:00.000Z',
    effectiveTo: '2026-12-31T23:59:59.000Z',
    routes: [
      {
        routeLabel: 'JFK to Midtown',
        originZone: 'JFK',
        destinationZone: 'Midtown',
        flatRate: 145,
        additionalStopFee: 25,
      },
    ],
    hourly: {
      hourlyRate: 95,
      minimumHours: 2,
    },
    mileage: {
      baseFare: 50,
      perMileRate: 4.5,
      minimumFare: 75,
    },
    commercialPolicies: {
      curbsideGraceMinutes: 15,
      domesticAirportGraceMinutes: 30,
    },
    applicableFees: [
      {
        feeIdentifier: 'nys_congestion_surcharge',
        feeCategory: 'statutory_mandate',
        triggerCondition: 'nyc_manhattan_south_96',
        billingType: 'flat',
        amount: 2.75,
      },
    ],
  };

  // Harmless edits
  assert.equal(
    hasMaterialTariffChanges(baseDoc, { title: 'New Marketing Title' }),
    false,
    'Title edit must be harmless',
  );
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      reconciliation: { reconciliationNotes: 'Updated notes from dispatcher' },
    }),
    false,
    'Reconciliation notes edit must be harmless',
  );

  // Material edits: vehicleClass
  assert.equal(hasMaterialTariffChanges(baseDoc, { vehicleClass: 2 }), true);
  // Material edits: serviceScope
  assert.equal(hasMaterialTariffChanges(baseDoc, { serviceScope: 'service_specific' }), true);
  // Material edits: services
  assert.equal(hasMaterialTariffChanges(baseDoc, { services: [1, 2, 3] }), true);
  // Material edits: pricingModel
  assert.equal(hasMaterialTariffChanges(baseDoc, { pricingModel: 'hourly' }), true);
  // Material edits: currency
  assert.equal(hasMaterialTariffChanges(baseDoc, { currency: 'EUR' }), true);
  // Material edits: effective dates
  assert.equal(
    hasMaterialTariffChanges(baseDoc, { effectiveFrom: '2026-11-01T00:00:00.000Z' }),
    true,
  );
  // Material edits: route fare
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      routes: [
        {
          routeLabel: 'JFK to Midtown',
          originZone: 'JFK',
          destinationZone: 'Midtown',
          flatRate: 155, // Changed from 145
          additionalStopFee: 25,
        },
      ],
    }),
    true,
  );
  // Material edits: hourly rate
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      hourly: {
        hourlyRate: 110,
        minimumHours: 2,
      },
    }),
    true,
  );
  // Material edits: mileage rate
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      mileage: {
        baseFare: 50,
        perMileRate: 5.0, // Changed from 4.5
        minimumFare: 75,
      },
    }),
    true,
  );
  // Material edits: commercial policy
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      commercialPolicies: {
        curbsideGraceMinutes: 20, // Changed from 15
        domesticAirportGraceMinutes: 30,
      },
    }),
    true,
  );
  // Material edits: fee amount
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      applicableFees: [
        {
          feeIdentifier: 'nys_congestion_surcharge',
          feeCategory: 'statutory_mandate',
          triggerCondition: 'nyc_manhattan_south_96',
          billingType: 'flat',
          amount: 3.0, // Changed from 2.75
        },
      ],
    }),
    true,
  );

  // Shape normalization: populated relationship objects vs scalar IDs
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      vehicleClass: { id: 1 },
    }),
    false,
    'vehicleClass { id: 1 } must match scalar 1 without triggering material change',
  );
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      vehicleClass: '1',
    }),
    false,
    'vehicleClass "1" string must match scalar 1 without triggering material change',
  );
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      services: [{ id: 1 }, { id: 2 }],
    }),
    false,
    'services [{ id: 1 }, { id: 2 }] must match scalar array [1, 2]',
  );
  assert.equal(
    hasMaterialTariffChanges(baseDoc, {
      effectiveFrom: '2026-10-01T00:00:00Z', // Same time, alternate ISO format
    }),
    false,
    'Alternative ISO timestamp format must not trigger false material change',
  );
});

test('enforceReconciliationGate blocks direct publication when material fields are edited in same request', async () => {
  const adminReq = asRequest({
    user: { id: 1, collection: 'users', role: 'admin' },
  });

  const verifiedDraftDoc = {
    id: 25,
    title: 'Verified Sedan Airport Transfer',
    vehicleClass: 1,
    pricingModel: 'fixed',
    serviceScope: 'global',
    routes: [
      {
        routeLabel: 'JFK to Midtown Manhattan',
        originZone: 'JFK',
        destinationZone: 'Midtown Manhattan',
        flatRate: 145,
        additionalStopFee: 25,
      },
    ],
    reconciliation: {
      status: 'la_verified',
      laReferenceCode: 'LA-MATRIX-JFK-145',
      reconciliationNotes: 'Verified test quote in LA dispatch.',
      verifiedBy: 1,
      verifiedAt: '2026-10-23T08:00:00.000Z',
    },
    _status: 'draft',
  };

  // Scenario 1: Admin modifies flatRate from 145 to 165 AND sets _status = 'published' in the same request.
  // The system must invalidate verification to draft and reject publication immediately!
  await assert.rejects(
    async () =>
      enforceReconciliationGate(
        mockArgs(
          {
            ...verifiedDraftDoc,
            routes: [
              {
                routeLabel: 'JFK to Midtown Manhattan',
                originZone: 'JFK',
                destinationZone: 'Midtown Manhattan',
                flatRate: 165, // Changed rate!
                additionalStopFee: 25,
              },
            ],
            _status: 'published', // Direct publication attempt
          },
          adminReq,
          'update',
          verifiedDraftDoc,
        ),
      ),
    (err: unknown) => isValidationError(err, 'reconciliation.status'),
  );
});

test('enforceReconciliationGate preserves verification across partial updates with omitted tariff fields', async () => {
  const adminReq = asRequest({
    user: { id: 1, collection: 'users', role: 'admin' },
  });

  const verifiedDraftDoc = {
    id: 30,
    title: 'Executive Sedan Tariff',
    vehicleClass: 1,
    pricingModel: 'hourly',
    serviceScope: 'global',
    hourly: {
      hourlyRate: 95,
      minimumHours: 2,
    },
    reconciliation: {
      status: 'la_verified',
      laReferenceCode: 'LA-HOURLY-95',
      reconciliationNotes: 'Test quote verified in LA matrix.',
      verifiedBy: 1,
      verifiedAt: '2026-10-23T08:00:00.000Z',
    },
    _status: 'draft',
  };

  // Scenario 2A: Legitimate partial update with only title provided (omitted reconciliation & tariff fields)
  const titleUpdateResult = await enforceReconciliationGate(
    mockArgs(
      {
        title: 'New Descriptive Title for Executive Sedan',
      },
      adminReq,
      'update',
      verifiedDraftDoc,
    ),
  );
  const recA = titleUpdateResult.reconciliation as Record<string, unknown>;
  assert.equal(recA.status, 'la_verified', 'Partial title update must preserve la_verified status');
  assert.equal(recA.verifiedBy, 1, 'verifiedBy must not be wiped by partial update');
  assert.equal(
    recA.verifiedAt,
    '2026-10-23T08:00:00.000Z',
    'verifiedAt must not be wiped by partial update',
  );

  // Scenario 2B: Legitimate partial update with only reconciliationNotes provided
  const notesUpdateResult = await enforceReconciliationGate(
    mockArgs(
      {
        reconciliation: {
          reconciliationNotes: 'Appended follow-up quote note after dispatch call.',
        },
      },
      adminReq,
      'update',
      verifiedDraftDoc,
    ),
  );
  const recB = notesUpdateResult.reconciliation as Record<string, unknown>;
  assert.equal(recB.status, 'la_verified', 'Partial notes update must preserve la_verified status');
  assert.equal(recB.verifiedBy, 1, 'verifiedBy must remain intact');
  assert.equal(recB.verifiedAt, '2026-10-23T08:00:00.000Z', 'verifiedAt must remain intact');

  // Scenario 2C: Legitimate update on published card with harmless partial update preserves published status
  const publishedDoc = {
    ...verifiedDraftDoc,
    _status: 'published',
    reconciliation: {
      ...verifiedDraftDoc.reconciliation,
      status: 'published',
    },
  };

  const harmlessPublishedResult = await enforceReconciliationGate(
    mockArgs(
      {
        title: 'Updated Published Rate Card Title',
      },
      adminReq,
      'update',
      publishedDoc,
    ),
  );
  const recC = harmlessPublishedResult.reconciliation as Record<string, unknown>;
  assert.equal(recC.status, 'published');
  assert.equal(recC.verifiedBy, 1);
  assert.equal(recC.verifiedAt, '2026-10-23T08:00:00.000Z');

  // Scenario 2D: Material rate modification on currently published card without re-verification is blocked
  await assert.rejects(
    async () =>
      enforceReconciliationGate(
        mockArgs(
          {
            hourly: {
              hourlyRate: 125, // Changed rate on published card!
              minimumHours: 2,
            },
          },
          adminReq,
          'update',
          publishedDoc,
        ),
      ),
    (err: unknown) => isValidationError(err, 'reconciliation.status'),
  );
});

test('rateCardPublicRead isolates draft, unverified, and inactive rates from public queries', () => {
  type AccessArgs = Parameters<typeof rateCardPublicRead>[0];
  const publicReq = { req: asRequest({ user: null }) } as unknown as AccessArgs;
  const query = rateCardPublicRead(publicReq);
  assert.deepEqual(query, {
    and: [
      { _status: { equals: 'published' } },
      { 'reconciliation.status': { equals: 'published' } },
    ],
  });

  const staffReq = {
    req: asRequest({ user: { collection: 'users', role: 'admin' } }),
  } as unknown as AccessArgs;
  assert.equal(rateCardPublicRead(staffReq), true);

  const cmReq = {
    req: asRequest({ user: { collection: 'users', role: 'content-manager' } }),
  } as unknown as AccessArgs;
  assert.equal(rateCardPublicRead(cmReq), true);

  // Write and delete restrictions
  assert.equal(rateCardWrite(publicReq), false);
  assert.equal(rateCardWrite(cmReq), true);
  assert.equal(rateCardDelete(cmReq), false);
  assert.equal(rateCardDelete(staffReq), true);
});

test('qualifiesForNYSCongestionSurcharge evaluates qualifying trip conditions independently', () => {
  assert.equal(
    qualifiesForNYSCongestionSurcharge({
      originZone: 'manhattan_cbd',
      destinationZone: 'nyc_airport_jfk',
    }),
    true,
  );

  assert.equal(
    qualifiesForNYSCongestionSurcharge({
      originZone: 'outer_borough_ny',
      destinationZone: 'manhattan_north_60_south_96',
    }),
    true,
  );

  assert.equal(
    qualifiesForNYSCongestionSurcharge({
      originZone: 'nyc_airport_jfk',
      destinationZone: 'outer_borough_ny',
      transitsManhattanSouthOf96: false,
    }),
    false,
  );

  assert.equal(
    qualifiesForNYSCongestionSurcharge({
      originZone: 'outer_borough_ny',
      destinationZone: 'out_of_town',
      transitsManhattanSouthOf96: true,
    }),
    true,
  );
});

test('qualifiesForMTACBDCharge evaluates Central Business District entry conditions', () => {
  assert.equal(
    qualifiesForMTACBDCharge({
      originZone: 'outer_borough_ny',
      destinationZone: 'manhattan_cbd',
    }),
    true,
  );

  assert.equal(
    qualifiesForMTACBDCharge({
      originZone: 'outer_borough_ny',
      destinationZone: 'nyc_airport_jfk',
    }),
    false,
  );

  assert.equal(
    qualifiesForMTACBDCharge({
      originZone: 'manhattan_cbd',
      destinationZone: 'manhattan_cbd',
      entersManhattanCBDFromOutside: false,
    }),
    false,
  );
});

test('evaluateTripFees applies NYS Congestion and MTA CBD charges independently without mutual exclusion or duplicate', () => {
  const fees = evaluateTripFees({
    originZone: 'nyc_airport_jfk',
    destinationZone: 'manhattan_cbd',
  });

  const identifiers = fees.map((f) => f.feeIdentifier);
  assert.ok(identifiers.includes('nys_congestion_surcharge'));
  assert.ok(identifiers.includes('mta_cbd_tolling'));
  assert.ok(identifiers.includes('panynj_airport_access'));

  const uniqueIdentifiers = new Set(identifiers);
  assert.equal(identifiers.length, uniqueIdentifiers.size);

  const nysFee = fees.find((f) => f.feeIdentifier === 'nys_congestion_surcharge');
  assert.equal(nysFee?.amount, 2.75);

  const mtaFee = fees.find((f) => f.feeIdentifier === 'mta_cbd_tolling');
  assert.equal(mtaFee?.amount, 1.5);
});

test('computeStartingPrice derives price strictly from eligible published comparable rate cards', () => {
  const cards = [
    {
      _status: 'draft',
      reconciliation: { status: 'draft' },
      pricingModel: 'fixed' as const,
      vehicleClass: { name: 'Executive Sedan' },
      routes: [{ flatRate: 99, routeLabel: 'Test Draft' }],
    },
    {
      _status: 'published',
      reconciliation: { status: 'internal_review' },
      pricingModel: 'fixed' as const,
      vehicleClass: { name: 'Executive Sedan' },
      routes: [{ flatRate: 105, routeLabel: 'Unverified' }],
    },
    {
      _status: 'published',
      reconciliation: { status: 'published' },
      pricingModel: 'fixed' as const,
      vehicleClass: { name: 'Executive Sedan' },
      currency: 'USD',
      routes: [
        { flatRate: 155, routeLabel: 'LGA Transfer' },
        { flatRate: 145, routeLabel: 'JFK Airport Transfer' },
      ],
    },
    {
      _status: 'published',
      reconciliation: { status: 'published' },
      pricingModel: 'fixed' as const,
      vehicleClass: { name: 'Luxury SUV' },
      currency: 'USD',
      routes: [{ flatRate: 185, routeLabel: 'JFK Airport Transfer' }],
    },
  ];

  const result = computeStartingPrice(cards, 'fixed');
  assert.ok(result);
  assert.equal(result.amount, 145);
  assert.equal(result.pricingModel, 'fixed');
  assert.ok(result.basis.includes('Executive Sedan'));
  assert.ok(result.basis.includes('JFK Airport Transfer'));
});

test('pathsForCmsChange invalidates rates-and-options and service routes on rate card change', () => {
  const publishedCard = {
    _status: 'published',
    reconciliation: { status: 'published' },
    slug: 'executive-sedan-fixed',
  };

  const paths = pathsForCmsChange('rate-cards', publishedCard);
  assert.ok(paths.includes('/rates-and-options'));
  assert.ok(paths.includes('/services'));
  assert.ok(paths.includes('/services/[slug]'));

  const draftCard = {
    _status: 'draft',
    reconciliation: { status: 'draft' },
  };
  const draftPaths = pathsForCmsChange('rate-cards', draftCard);
  assert.equal(draftPaths.length, 0);
});
