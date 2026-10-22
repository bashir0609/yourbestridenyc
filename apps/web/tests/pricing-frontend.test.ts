import assert from 'node:assert/strict';
import test from 'node:test';
import { mapFleet } from '../src/lib/cms/mappers';
import { mapFleetPage, mapServicePage } from '../src/lib/cms/page-mappers';
import { computeStartingPrice, evaluateTripFees } from '../src/lib/cms/pricing-rules';

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
  assert.equal(service.pricingDisplay?.startingFromNote, 'Fares include flight tracking and tolls.');
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
  assert.equal(draftOnlyResult, null, 'Unpublished draft rate cards must not produce starting prices');

  const unverifiedResult = computeStartingPrice([
    {
      _status: 'published',
      reconciliation: { status: 'unreconciled' },
      pricingModel: 'fixed',
      routes: [{ flatRate: 120, routeLabel: 'JFK to Manhattan' }],
    },
  ]);
  assert.equal(unverifiedResult, null, 'Unreconciled rate cards must not produce public starting prices');
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

  assert.equal(isCardActive({ effectiveFrom: farPast, effectiveTo: past }), false, 'Expired card must be excluded');
  assert.equal(isCardActive({ effectiveFrom: future, effectiveTo: farFuture }), false, 'Future-dated card must be excluded');
  assert.equal(isCardActive({ effectiveFrom: past, effectiveTo: future }), true, 'Currently active card must be included');
  assert.equal(isCardActive({ effectiveFrom: null, effectiveTo: null }), true, 'Indefinite active card must be included');
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
  assert.equal(matchesService(specificCard, 'hourly-as-directed'), false, 'Service-specific card must not bleed into other services');
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
      amount: 1.50,
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
  assert.equal(nys.reason, 'NYS Tax Law § 1281 verified congestion surcharge for south of 96th St.');

  const mta = evaluated.find((f) => f.feeIdentifier === 'mta_cbd_tolling');
  assert.ok(mta, 'MTA CBD fee should be applied');
  assert.equal(mta.amount, 1.50);
  assert.equal(mta.feeName, 'MTA Central Business District Tolling (Configured)');
  assert.equal(mta.reason, 'MTA Congestion Relief Zone entry toll under adopted program schedule.');
});

