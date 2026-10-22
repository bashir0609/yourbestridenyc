import assert from 'node:assert/strict';
import test from 'node:test';
import type { PayloadRequest } from 'payload';
import { rateCardDelete, rateCardPublicRead, rateCardWrite } from '../src/access';
import {
  enforceReconciliationGate,
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
): HookArgs {
  return {
    data,
    req,
    operation,
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
            reconciliation: { status: 'la_verified', laReferenceCode: 'LA-101', reconciliationNotes: 'Test quote verified' },
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
            reconciliation: { status: 'draft', laReferenceCode: 'LA-101', reconciliationNotes: 'Test quote verified' },
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
            reconciliation: { status: 'la_verified', laReferenceCode: 'LA-101', reconciliationNotes: 'ok' },
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

  const staffReq = { req: asRequest({ user: { collection: 'users', role: 'admin' } }) } as unknown as AccessArgs;
  assert.equal(rateCardPublicRead(staffReq), true);

  const cmReq = { req: asRequest({ user: { collection: 'users', role: 'content-manager' } }) } as unknown as AccessArgs;
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
  assert.equal(mtaFee?.amount, 1.50);
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
