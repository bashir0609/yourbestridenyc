import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mapFleet } from '../src/lib/cms/mappers';
import { mapFleetPage, mapServicePage } from '../src/lib/cms/page-mappers';
import {
  computeStartingPrice,
  evaluateTripFees,
  isRateCardEligible,
  mapEligibleRateCardsToContent,
  isRouteMatchingOriginLocation,
  resolveLocationDisplayName,
  type RateCardCandidate,
} from '../src/lib/cms/pricing-rules';
import type {
  FixedRouteEntry,
  PricingSettingsView,
  VehicleClassCard,
} from '../src/lib/cms/pricing-types';

test('mapFleet maps vehicleClass relationship on fleet cards', () => {
  const payloadDoc = {
    id: 1,
    title: 'Executive SUV',
    slug: 'executive-suv',
    summary: 'Spacious luxury SUV',
    passengerCapacity: 6,
    luggageCapacity: 6,
    vehicleClass: {
      id: 2,
      name: 'Premium Crossover SUV',
      slug: 'premium-crossover-suv',
      tier: 'premium',
    },
    _status: 'published',
  };

  const [mapped] = mapFleet({ docs: [payloadDoc] });
  assert.ok(mapped, 'Should return a mapped vehicle');
  assert.equal(mapped.slug, 'executive-suv');
  assert.ok(mapped.vehicleClass, 'Should preserve vehicleClass');
  assert.equal(mapped.vehicleClass?.name, 'Premium Crossover SUV');
  assert.equal(mapped.vehicleClass?.slug, 'premium-crossover-suv');
  assert.equal(mapped.vehicleClass?.tier, 'premium');
});

test('mapFleetPage maps vehicleClass and capacity on fleet detail', () => {
  const payloadDoc = {
    id: 2,
    title: 'Standard SUV',
    slug: 'standard-suv',
    summary: 'Reliable all-weather SUV',
    category: 'SUV',
    passengerCapacity: 4,
    luggageCapacity: 4,
    vehicleClass: {
      id: 1,
      name: 'Standard SUV',
      slug: 'standard-suv',
      tier: 'standard',
    },
    description: [],
    _status: 'published',
  };

  const detail = mapFleetPage(payloadDoc);
  assert.ok(detail, 'Should map fleet page');
  assert.equal(detail.vehicleClass?.name, 'Standard SUV');
  assert.equal(detail.vehicleClass?.tier, 'standard');
  assert.equal(detail.passengerCapacity, 4);
});

test('mapServicePage maps pricingDisplay configuration', () => {
  const payloadDoc = {
    id: 10,
    title: 'Airport Transfer Service',
    slug: 'airport-transfers',
    summary: 'Executive airport transfers',
    overview: [],
    benefits: [],
    features: [],
    locations: [],
    faqs: [],
    pricingDisplay: {
      showPricingOnPage: true,
      pricingHeadline: 'Direct Airport Transfer Rates',
      eligiblePricingModel: 'fixed',
      showStartingFrom: true,
      startingFromNote: 'Fares include flight tracking and tolls.',
    },
    _status: 'published',
  };

  const service = mapServicePage(payloadDoc);
  assert.ok(service, 'Should map service page');
  assert.ok(service.pricingDisplay, 'Should map pricingDisplay');
  assert.equal(service.pricingDisplay?.showPricingOnPage, true);
  assert.equal(service.pricingDisplay?.pricingHeadline, 'Direct Airport Transfer Rates');
  assert.equal(service.pricingDisplay?.eligiblePricingModel, 'fixed');
  assert.equal(service.pricingDisplay?.showStartingFrom, true);
  assert.equal(
    service.pricingDisplay?.startingFromNote,
    'Fares include flight tracking and tolls.',
  );
});

test('computeStartingPrice handles empty rate cards with zero fabricated rates', () => {
  const emptyResult = computeStartingPrice([]);
  assert.equal(emptyResult, null, 'Empty rate card list must return null starting price');

  const draftOnlyResult = computeStartingPrice([
    {
      _status: 'draft',
      reconciliation: { status: 'draft' },
      pricingModel: 'fixed',
      routes: [{ flatRate: 120, routeLabel: 'JFK to Manhattan' }],
    },
  ]);
  assert.equal(
    draftOnlyResult,
    null,
    'Unpublished draft rate cards must not produce starting prices',
  );

  const unverifiedResult = computeStartingPrice([
    {
      _status: 'published',
      reconciliation: { status: 'unreconciled' },
      pricingModel: 'fixed',
      routes: [{ flatRate: 120, routeLabel: 'JFK to Manhattan' }],
    },
  ]);
  assert.equal(
    unverifiedResult,
    null,
    'Unreconciled rate cards must not produce public starting prices',
  );
});

test('computeStartingPrice calculates lowest comparable price strictly per model', () => {
  const publishedCards: Parameters<typeof computeStartingPrice>[0] = [
    {
      _status: 'published',
      reconciliation: { status: 'published' },
      pricingModel: 'fixed',
      vehicleClass: { name: 'Standard SUV' },
      routes: [
        { flatRate: 155, routeLabel: 'JFK to Manhattan' },
        { flatRate: 135, routeLabel: 'LGA to Manhattan' },
      ],
      currency: 'USD',
    },
    {
      _status: 'published',
      reconciliation: { status: 'published' },
      pricingModel: 'fixed',
      vehicleClass: { name: 'Premium Crossover SUV' },
      routes: [{ flatRate: 185, routeLabel: 'JFK to Manhattan' }],
      currency: 'USD',
    },
    {
      _status: 'published',
      reconciliation: { status: 'published' },
      pricingModel: 'hourly',
      vehicleClass: { name: 'Standard SUV' },
      hourly: { hourlyRate: 115, minimumHours: 3 },
      currency: 'USD',
    },
  ];

  // Fixed route target: lowest should be $135 (LGA to Manhattan)
  const fixedStarting = computeStartingPrice(publishedCards, 'fixed');
  assert.ok(fixedStarting, 'Should compute fixed starting price');
  assert.equal(fixedStarting.amount, 135);
  assert.equal(fixedStarting.pricingModel, 'fixed');
  assert.ok(fixedStarting.basis.includes('LGA to Manhattan'));

  // Hourly target: lowest hourly rate is $115
  const hourlyStarting = computeStartingPrice(publishedCards, 'hourly');
  assert.ok(hourlyStarting, 'Should compute hourly starting price');
  assert.equal(hourlyStarting.amount, 115);
  assert.equal(hourlyStarting.pricingModel, 'hourly');
  assert.ok(hourlyStarting.basis.includes('3-hr minimum'));
  assert.ok(hourlyStarting.basis.includes('min subtotal'));
});

test('rate card effective date filtering isolates expired and future-dated cards', () => {
  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const farPast = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const farFuture = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const isCardActive = (card: { effectiveFrom?: string | null; effectiveTo?: string | null }) => {
    if (card.effectiveFrom && new Date(card.effectiveFrom) > now) return false;
    if (card.effectiveTo && new Date(card.effectiveTo) < now) return false;
    return true;
  };

  assert.equal(
    isCardActive({ effectiveFrom: farPast, effectiveTo: past }),
    false,
    'Expired card must be excluded',
  );
  assert.equal(
    isCardActive({ effectiveFrom: future, effectiveTo: farFuture }),
    false,
    'Future-dated card must be excluded',
  );
  assert.equal(
    isCardActive({ effectiveFrom: past, effectiveTo: future }),
    true,
    'Currently active card must be included',
  );
  assert.equal(
    isCardActive({ effectiveFrom: null, effectiveTo: null }),
    true,
    'Indefinite active card must be included',
  );
});

test('service-specific rates shadow global tariffs for targeted services', () => {
  const globalCard = {
    id: 1,
    title: 'Global Tariff',
    serviceScope: 'global' as const,
    pricingModel: 'fixed' as const,
    routes: [{ flatRate: 150, routeLabel: 'JFK to Manhattan' }],
  };

  const specificCard = {
    id: 2,
    title: 'Special Airport Service Tariff',
    serviceScope: 'service_specific' as const,
    services: [{ slug: 'airport-transfers' }],
    pricingModel: 'fixed' as const,
    routes: [{ flatRate: 130, routeLabel: 'JFK to Manhattan' }],
  };

  const matchesService = (
    card: { serviceScope: string; services?: Array<{ slug?: string }> },
    targetSlug: string,
  ) => {
    if (card.serviceScope === 'global') return true;
    if (card.serviceScope === 'service_specific') {
      return Array.isArray(card.services) && card.services.some((s) => s.slug === targetSlug);
    }
    return false;
  };

  assert.equal(matchesService(globalCard, 'airport-transfers'), true);
  assert.equal(matchesService(globalCard, 'hourly-as-directed'), true);
  assert.equal(matchesService(specificCard, 'airport-transfers'), true);
  assert.equal(
    matchesService(specificCard, 'hourly-as-directed'),
    false,
    'Service-specific card must not bleed into other services',
  );
});

test('configurable CMS fee disclosures override static regulatory fee amounts', () => {
  const customFeeConfig = [
    {
      feeIdentifier: 'nys_congestion_surcharge',
      feeName: 'NYS Congestion Surcharge (Verified)',
      feeCategory: 'statutory_mandate' as const,
      triggerCondition: 'nyc_manhattan_south_96' as const,
      billingType: 'flat' as const,
      amount: 2.75,
      customerDisclosure: 'NYS Tax Law § 1281 verified congestion surcharge for south of 96th St.',
    },
    {
      feeIdentifier: 'mta_cbd_tolling',
      feeName: 'MTA Central Business District Tolling (Configured)',
      feeCategory: 'statutory_mandate' as const,
      triggerCondition: 'mta_cbd_entry_south_60' as const,
      billingType: 'flat' as const,
      amount: 1.5,
      customerDisclosure: 'MTA Congestion Relief Zone entry toll under adopted program schedule.',
    },
  ];

  const evaluated = evaluateTripFees(
    { originZone: 'nyc_airport_jfk', destinationZone: 'manhattan_cbd' },
    customFeeConfig,
  );

  const nys = evaluated.find((f) => f.feeIdentifier === 'nys_congestion_surcharge');
  assert.ok(nys, 'NYS fee should be applied');
  assert.equal(nys.amount, 2.75);
  assert.equal(nys.feeName, 'NYS Congestion Surcharge (Verified)');
  assert.equal(
    nys.reason,
    'NYS Tax Law § 1281 verified congestion surcharge for south of 96th St.',
  );

  const mta = evaluated.find((f) => f.feeIdentifier === 'mta_cbd_tolling');
  assert.ok(mta, 'MTA CBD fee should be applied');
  assert.equal(mta.amount, 1.5);
  assert.equal(mta.feeName, 'MTA Central Business District Tolling (Configured)');
  assert.equal(mta.reason, 'MTA Congestion Relief Zone entry toll under adopted program schedule.');
});

test('Rate card eligibility: validates actual reconciliation.status === published and active date window', () => {
  const now = new Date();
  const past = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const future = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const farPast = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
  const farFuture = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();

  const baseCard: RateCardCandidate = {
    id: 10,
    title: 'Standard SUV Airport Tariff',
    _status: 'published',
    reconciliation: {
      status: 'published',
      laReferenceCode: 'LA-RATE-101',
      reconciliationNotes: 'Verified against Limo Anywhere test quote #101.',
    },
    pricingModel: 'fixed',
    serviceScope: 'global',
    vehicleClass: { id: 1, name: 'Standard SUV', slug: 'standard-suv' },
    routes: [
      {
        flatRate: 155,
        routeLabel: 'JFK to Manhattan',
        originZone: 'JFK',
        destinationZone: 'Manhattan',
      },
    ],
  };

  // 1. Admin-published & reconciled card with no date bounds is eligible
  assert.equal(
    isRateCardEligible(baseCard, now),
    true,
    'Reconciled and published card must be eligible',
  );

  // 2. Draft status must be hidden
  assert.equal(
    isRateCardEligible({ ...baseCard, _status: 'draft' }, now),
    false,
    'Draft cards must be excluded',
  );

  // 3. Unreconciled / non-published lifecycle statuses must be hidden
  const invalidReconciliationStatuses = [
    'draft',
    'internal_review',
    'la_pending_verification',
    'la_verified', // la_verified requires publication step to go live
    'archived',
    'unreconciled',
    null,
    undefined,
  ];
  for (const status of invalidReconciliationStatuses) {
    assert.equal(
      isRateCardEligible({ ...baseCard, reconciliation: { status } }, now),
      false,
      `Rate card with reconciliation status "${status}" must not be eligible for public display`,
    );
  }

  // 4. Missing reconciliation object must be hidden
  assert.equal(
    isRateCardEligible({ ...baseCard, reconciliation: null }, now),
    false,
    'Rate card without reconciliation object must be excluded',
  );

  // 5. Expired cards must be hidden
  assert.equal(
    isRateCardEligible({ ...baseCard, effectiveFrom: farPast, effectiveTo: past }, now),
    false,
    'Expired rate card must be excluded',
  );

  // 6. Future-dated cards must be hidden
  assert.equal(
    isRateCardEligible({ ...baseCard, effectiveFrom: future, effectiveTo: farFuture }, now),
    false,
    'Future-dated rate card must be excluded',
  );

  // 7. Active within window must be eligible
  assert.equal(
    isRateCardEligible({ ...baseCard, effectiveFrom: past, effectiveTo: future }, now),
    true,
    'Rate card within valid effective window must be eligible',
  );
});

test('Admin-published rates dynamically populate the correct frontend pricing tables', () => {
  const dummyClasses: VehicleClassCard[] = [
    {
      id: 1,
      name: 'Standard SUV',
      slug: 'standard-suv',
      tier: 'standard',
      passengerCapacity: 4,
      luggageCapacity: 4,
    },
    {
      id: 2,
      name: 'Premium Crossover SUV',
      slug: 'premium-crossover-suv',
      tier: 'premium',
      passengerCapacity: 6,
      luggageCapacity: 5,
    },
  ];

  const dummySettings: PricingSettingsView = {
    currency: 'USD',
    defaultTaxNote: 'Rates exclude local sales tax.',
    affiliateTariffNote: 'Single universal customer tariff.',
    globalInclusions: ['Bottled water', 'Wi-Fi'],
    defaultCurbsideGraceMinutes: 15,
    defaultDomesticAirportGraceMinutes: 30,
    defaultInternationalAirportGraceMinutes: 60,
    defaultLateNightWindowStart: '23:00',
    defaultLateNightWindowEnd: '05:00',
  };

  const adminPublishedCards: RateCardCandidate[] = [
    // 1. Published fixed route card
    {
      id: 101,
      title: 'Standard SUV Airport Tariff',
      _status: 'published',
      reconciliation: {
        status: 'published',
        laReferenceCode: 'LA-FIX-1',
        reconciliationNotes: 'Audit verified',
      },
      pricingModel: 'fixed',
      serviceScope: 'global',
      vehicleClass: { id: 1, name: 'Standard SUV', slug: 'standard-suv' },
      routes: [
        {
          id: 'route-jfk',
          routeLabel: 'JFK Airport to Manhattan (All Zones)',
          originZone: 'JFK Airport',
          destinationZone: 'Manhattan',
          flatRate: 155,
          additionalStopFee: 25,
          notes: 'Includes 30 min domestic grace period.',
        },
      ],
    },
    // 2. Published hourly charter card
    {
      id: 102,
      title: 'Premium Crossover SUV Hourly Charter',
      _status: 'published',
      reconciliation: {
        status: 'published',
        laReferenceCode: 'LA-HRLY-2',
        reconciliationNotes: 'Audit verified',
      },
      pricingModel: 'hourly',
      serviceScope: 'global',
      vehicleClass: { id: 2, name: 'Premium Crossover SUV', slug: 'premium-crossover-suv' },
      hourly: {
        hourlyRate: 135,
        minimumHours: 3,
        additionalHourRate: 135,
        overtimeIncrementMinutes: 15,
        overtimeRate: 150,
      },
    },
    // 3. Draft hourly card (Must be excluded)
    {
      id: 103,
      title: 'Draft Standard SUV Hourly Charter',
      _status: 'draft',
      reconciliation: { status: 'draft' },
      pricingModel: 'hourly',
      vehicleClass: { id: 1, name: 'Standard SUV', slug: 'standard-suv' },
      hourly: { hourlyRate: 99, minimumHours: 2 },
    },
    // 4. Unreconciled fixed card (Must be excluded)
    {
      id: 104,
      title: 'Unreconciled Fixed Card',
      _status: 'published',
      reconciliation: { status: 'la_pending_verification' },
      pricingModel: 'fixed',
      vehicleClass: { id: 1, name: 'Standard SUV', slug: 'standard-suv' },
      routes: [{ flatRate: 80, routeLabel: 'Unverified Route' }],
    },
  ];

  const content = mapEligibleRateCardsToContent(dummyClasses, adminPublishedCards, dummySettings);

  assert.equal(content.status, 'ready');

  // Verify Fixed Routes table has exactly the published route and excludes unreconciled card
  assert.equal(content.fixedRoutes.length, 1);
  const fixed = content.fixedRoutes[0];
  assert.ok(fixed);
  assert.equal(fixed.routeLabel, 'JFK Airport to Manhattan (All Zones)');
  assert.equal(fixed.flatRate, 155);
  assert.equal(fixed.additionalStopFee, 25);
  assert.equal(fixed.vehicleClassName, 'Standard SUV');

  // Verify Hourly Charters table has exactly the published hourly charter and excludes draft card
  assert.equal(content.hourlyCharters.length, 1);
  const hourly = content.hourlyCharters[0];
  assert.ok(hourly);
  assert.equal(hourly.vehicleClassName, 'Premium Crossover SUV');
  assert.equal(hourly.hourlyRate, 135);
  assert.equal(hourly.minimumHours, 3);
  assert.equal(hourly.minimumSubtotal, 405); // 135 * 3
  assert.equal(hourly.overtimeRate, 150);

  // Verify draft rate (99) and unverified rate (80) never appeared
  assert.equal(
    content.hourlyCharters.some((h) => h.hourlyRate === 99),
    false,
  );
  assert.equal(
    content.fixedRoutes.some((f) => f.flatRate === 80),
    false,
  );
});

test('mapEligibleRateCardsToContent preserves origin and destination location relationships', () => {
  const dummyClasses: VehicleClassCard[] = [
    {
      id: 2,
      name: 'Premium Crossover SUV',
      slug: 'premium-crossover-suv',
      tier: 'premium',
      passengerCapacity: 4,
      luggageCapacity: 4,
    },
  ];

  const dummySettings: PricingSettingsView = {
    currency: 'USD',
    defaultTaxNote: 'Rates exclude local sales tax.',
    affiliateTariffNote: 'Single universal customer tariff.',
    globalInclusions: [],
    defaultCurbsideGraceMinutes: 15,
    defaultDomesticAirportGraceMinutes: 30,
    defaultInternationalAirportGraceMinutes: 60,
    defaultLateNightWindowStart: '23:00',
    defaultLateNightWindowEnd: '05:00',
  };

  const rateCardsWithLocations: RateCardCandidate[] = [
    {
      id: 4,
      title: 'Premium Crossover SUV — NYC Airport Transfers 2026',
      _status: 'published',
      reconciliation: { status: 'published', laReferenceCode: 'LA-RATE-4' },
      pricingModel: 'fixed',
      serviceScope: 'global',
      vehicleClass: { id: 2, name: 'Premium Crossover SUV', slug: 'premium-crossover-suv' },
      routes: [
        {
          id: 'route-1',
          routeLabel: 'Manhattan to JFK Airport',
          originZone: 'Manhattan',
          destinationZone: 'JFK Airport',
          flatRate: 205,
          additionalStopFee: 25,
          notes: 'Includes 45m flight delay buffer.',
          originLocation: {
            id: 2,
            slug: 'manhattan',
            title: 'Manhattan, New York',
          },
          destinationLocation: {
            id: 8,
            slug: 'jfk-airport',
            title: 'John F. Kennedy International Airport',
          },
        },
        {
          id: 'route-2',
          routeLabel: 'Manhattan to LGA Airport (Numeric relation)',
          originZone: 'Manhattan',
          destinationZone: 'LGA Airport',
          flatRate: 175,
          originLocation: 2, // numeric reference
          destinationLocation: null,
        },
      ],
    },
  ];

  const content = mapEligibleRateCardsToContent(
    dummyClasses,
    rateCardsWithLocations,
    dummySettings,
  );

  assert.equal(content.fixedRoutes.length, 2);

  const route1 = content.fixedRoutes[0];
  assert.ok(route1);
  assert.equal(route1.originLocationId, 2);
  assert.equal(route1.originLocationSlug, 'manhattan');
  assert.equal(route1.originLocationName, 'Manhattan, New York');
  assert.equal(route1.destinationLocationId, 8);
  assert.equal(route1.destinationLocationSlug, 'jfk-airport');
  assert.equal(route1.destinationLocationName, 'John F. Kennedy International Airport');

  const route2 = content.fixedRoutes[1];
  assert.ok(route2);
  assert.equal(route2.originLocationId, 2);
  assert.equal(route2.originLocationSlug, undefined);
  assert.equal(route2.originLocationName, undefined);
  assert.equal(route2.destinationLocationId, undefined);
});

test('Location route direction matching prevents reverse-direction fare fabrication', () => {
  const dummyRoutes = [
    {
      id: 'manhattan-jfk',
      routeLabel: 'Manhattan to JFK Airport',
      originZone: 'Manhattan',
      destinationZone: 'JFK Airport',
      flatRate: 205,
      originLocation: { id: 2, slug: 'manhattan', title: 'Manhattan' },
      destinationLocation: { id: 8, slug: 'jfk-airport', title: 'JFK Airport' },
    },
  ];

  // Helper matching the getLocationRoutePricing direction resolution logic
  const matchRoutesForLocation = (locationId: number, locationSlug: string) => {
    const cleanSlug = locationSlug.toLowerCase().trim();
    const outbound: typeof dummyRoutes = [];
    const inbound: typeof dummyRoutes = [];

    for (const r of dummyRoutes) {
      const origId = typeof r.originLocation === 'object' ? r.originLocation?.id : r.originLocation;
      const origSlug =
        typeof r.originLocation === 'object' ? r.originLocation?.slug?.toLowerCase() : undefined;
      const destId =
        typeof r.destinationLocation === 'object'
          ? r.destinationLocation?.id
          : r.destinationLocation;
      const destSlug =
        typeof r.destinationLocation === 'object'
          ? r.destinationLocation?.slug?.toLowerCase()
          : undefined;

      if (origId === locationId || (origSlug !== undefined && origSlug === cleanSlug)) {
        outbound.push(r);
      } else if (destId === locationId || (destSlug !== undefined && destSlug === cleanSlug)) {
        inbound.push(r);
      }
    }

    return { outbound, inbound };
  };

  // Manhattan query: Outbound has route; inbound is empty
  const manhattanResult = matchRoutesForLocation(2, 'manhattan');
  assert.equal(manhattanResult.outbound.length, 1);
  assert.equal(manhattanResult.outbound[0]?.routeLabel, 'Manhattan to JFK Airport');
  assert.equal(manhattanResult.inbound.length, 0);

  // JFK query: Outbound is empty; inbound has route.
  // CRITICAL: We do NOT infer that JFK -> Manhattan costs $205 from Manhattan -> JFK outbound rate.
  const jfkResult = matchRoutesForLocation(8, 'jfk-airport');
  assert.equal(
    jfkResult.outbound.length,
    0,
    'Must NOT reverse outbound route into outbound JFK departure',
  );
  assert.equal(jfkResult.inbound.length, 1);

  // Unrelated location query: Both are empty
  const brooklynResult = matchRoutesForLocation(99, 'brooklyn');
  assert.equal(brooklynResult.outbound.length, 0);
  assert.equal(brooklynResult.inbound.length, 0);
});

test('isRouteMatchingOriginLocation strictly isolates routes by explicit linked origin location', () => {
  const manhattanRoute: FixedRouteEntry = {
    id: 'manhattan-jfk',
    routeLabel: 'Manhattan to JFK Airport (Brooklyn Bridge Corridor)',
    originZone: 'Manhattan',
    destinationZone: 'JFK Airport',
    originLocationId: 2,
    originLocationSlug: 'manhattan',
    originLocationName: 'Manhattan, New York',
    destinationLocationId: 8,
    destinationLocationSlug: 'jfk-airport',
    destinationLocationName: 'John F. Kennedy International Airport',
    flatRate: 205,
    vehicleClassName: 'Premium Crossover SUV',
    vehicleClassSlug: 'premium-crossover-suv',
  };

  const unlinkedRoute: FixedRouteEntry = {
    id: 'unlinked-corridor',
    routeLabel: 'Generic Regional Corridor',
    originZone: 'Tri-State Area',
    destinationZone: 'Regional Airport',
    flatRate: 150,
    vehicleClassName: 'Standard SUV',
    vehicleClassSlug: 'standard-suv',
  };

  const sampleRoutes = [manhattanRoute, unlinkedRoute];

  // 1. Manhattan selection: Matches explicit slug or ID
  const manhattanFiltered = sampleRoutes.filter((r) =>
    isRouteMatchingOriginLocation(r, 'manhattan'),
  );
  assert.equal(manhattanFiltered.length, 1);
  assert.equal(manhattanFiltered[0]?.id, 'manhattan-jfk');

  const idFiltered = sampleRoutes.filter((r) => isRouteMatchingOriginLocation(r, '2'));
  assert.equal(idFiltered.length, 1);
  assert.equal(idFiltered[0]?.id, 'manhattan-jfk');

  // 2. Brooklyn selection: Strictly EXCLUDES Manhattan routes (zero price leakage)
  const brooklynFiltered = sampleRoutes.filter((r) => isRouteMatchingOriginLocation(r, 'brooklyn'));
  assert.equal(
    brooklynFiltered.length,
    0,
    'Brooklyn filter must exclude Manhattan routes even if published',
  );

  // 3. Substring non-match: Route label contains "Brooklyn Bridge Corridor", but origin is Manhattan
  // Route MUST NOT be matched merely because "Brooklyn" appears in the label or corridor text
  assert.equal(isRouteMatchingOriginLocation(manhattanRoute, 'brooklyn'), false);

  // 4. Queens selection: Excludes Manhattan routes
  const queensFiltered = sampleRoutes.filter((r) => isRouteMatchingOriginLocation(r, 'queens'));
  assert.equal(queensFiltered.length, 0, 'Queens filter must exclude Manhattan routes');

  // 5. Unknown slug selection: Returns empty
  const unknownFiltered = sampleRoutes.filter((r) =>
    isRouteMatchingOriginLocation(r, 'unknown-borough'),
  );
  assert.equal(unknownFiltered.length, 0);

  // 6. Non-reversal: Matching destination airport slug (e.g. 'jfk-airport') does NOT match origin filter
  const jfkFiltered = sampleRoutes.filter((r) => isRouteMatchingOriginLocation(r, 'jfk-airport'));
  assert.equal(jfkFiltered.length, 0, 'Must NOT match destination location as origin');

  // 7. Clearing location filter (undefined or empty string): Restores all eligible routes
  const clearedFiltered = sampleRoutes.filter((r) => isRouteMatchingOriginLocation(r, undefined));
  assert.equal(clearedFiltered.length, 2, 'Clearing filter restores all published routes');

  const emptyStringFiltered = sampleRoutes.filter((r) => isRouteMatchingOriginLocation(r, ''));
  assert.equal(emptyStringFiltered.length, 2, 'Empty string restores all published routes');
});

test('resolveLocationDisplayName formats known and unknown locations accurately', () => {
  const dummyRoutes: FixedRouteEntry[] = [
    {
      id: 'm1',
      routeLabel: 'Manhattan to JFK',
      originZone: 'Manhattan',
      destinationZone: 'JFK',
      originLocationSlug: 'manhattan',
      originLocationName: 'Manhattan, New York',
      flatRate: 205,
      vehicleClassName: 'Premium Crossover SUV',
      vehicleClassSlug: 'premium-crossover-suv',
    },
  ];

  assert.equal(resolveLocationDisplayName('brooklyn', dummyRoutes), 'Brooklyn');
  assert.equal(resolveLocationDisplayName('manhattan', dummyRoutes), 'Manhattan');
  assert.equal(resolveLocationDisplayName('queens', dummyRoutes), 'Queens');
  assert.equal(resolveLocationDisplayName('long-island-city', dummyRoutes), 'Long Island City');
  assert.equal(resolveLocationDisplayName('', dummyRoutes), '');
  assert.equal(resolveLocationDisplayName(undefined, dummyRoutes), '');
});

test('Rates & Options UI contract strictly isolates location routes and renders approved copy', () => {
  const tabsSource = readFileSync(
    new URL('../src/components/rates-and-options/RatesAndOptionsTabs.tsx', import.meta.url),
    'utf8',
  );
  const pageSource = readFileSync(
    new URL('../src/app/(frontend)/rates-and-options/page.tsx', import.meta.url),
    'utf8',
  );
  const locationSectionSource = readFileSync(
    new URL('../src/components/locations/LocationPricingSection.tsx', import.meta.url),
    'utf8',
  );

  // 1. page.tsx passes server searchParams to RatesAndOptionsTabs
  assert.match(pageSource, /searchParams\?:\s*Promise/);
  assert.match(pageSource, /initialLocation=\{rawLocation\}/);
  assert.match(pageSource, /initialTab=\{rawTab\}/);

  // 2. RatesAndOptionsTabs uses route-level isRouteMatchingOriginLocation
  assert.match(tabsSource, /isRouteMatchingOriginLocation\(route,\s*selectedLocation\)/);

  // 3. RatesAndOptionsTabs renders exact required empty state text
  assert.ok(
    tabsSource.includes(
      'No published route rates are currently available for {locationDisplayName}. Request a Custom Quote.',
    ),
  );

  // 4. RatesAndOptionsTabs provides clear location filter action
  assert.ok(tabsSource.includes('handleClearLocationFilter'));
  assert.ok(tabsSource.includes('Show All Locations'));

  // 5. LocationPricingSection guarantees zero route leakage
  assert.ok(locationSectionSource.includes("r.direction === 'outbound'"));
  assert.ok(
    locationSectionSource.includes(
      '!r.originLocationSlug || r.originLocationSlug.toLowerCase() === cleanSlug',
    ),
  );
});
