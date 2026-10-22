import 'server-only';
import { cache } from 'react';
import type { Where } from 'payload';
import type { RateCard } from '@/payload-types';
import { mapImage, record, text } from './mappers';
import {
  computeStartingPrice,
  isRateCardEligible,
  mapEligibleRateCardsToContent,
  type RateCardCandidate,
} from './pricing-rules';
import type {
  PricingSettingsView,
  RatesAndOptionsContent,
  ServicePricingInfo,
  VehicleClassCard,
} from './pricing-types';

const DEFAULT_SETTINGS: PricingSettingsView = {
  currency: 'USD',
  defaultTaxNote: 'Rates exclude local sales tax where applicable.',
  affiliateTariffNote:
    'Your Best Ride maintains a single universal customer tariff. All chauffeured rides fulfilled through our certified affiliate network are billed at published company rates.',
  globalInclusions: ['Complimentary bottled water', 'Real-time flight tracking', 'In-vehicle Wi-Fi'],
  defaultCurbsideGraceMinutes: 15,
  defaultDomesticAirportGraceMinutes: 30,
  defaultInternationalAirportGraceMinutes: 60,
  defaultLateNightWindowStart: '23:00',
  defaultLateNightWindowEnd: '05:00',
};

async function getPayloadClient() {
  const [{ getPayload }, { default: config }] = await Promise.all([
    import('payload'),
    import('@payload-config'),
  ]);
  return getPayload({ config });
}

export const getVehicleClasses = cache(async (): Promise<VehicleClassCard[]> => {
  try {
    const payload = await getPayloadClient();
    const mediaOrigin = process.env.CMS_MEDIA_URL;

    const res = await payload.find({
      collection: 'vehicle-classes',
      where: { _status: { equals: 'published' } },
      sort: 'displayOrder,id',
      limit: 50,
      overrideAccess: false,
    });

    return res.docs.map((rawDoc): VehicleClassCard => {
      const doc = record(rawDoc) || {};
      return {
        id: Number(doc.id),
        name: doc.name ? String(doc.name) : 'Vehicle Class',
        slug: doc.slug ? String(doc.slug) : String(doc.id),
        tier: doc.tier ? String(doc.tier) : 'other',
        passengerCapacity: Number(doc.passengerCapacity) || 4,
        luggageCapacity: doc.luggageCapacity ? Number(doc.luggageCapacity) : undefined,
        summary: doc.summary ? text(doc.summary, 300) : undefined,
        featured: Boolean(doc.featured),
        displayOrder: Number(doc.displayOrder) || 0,
        image: mapImage(doc.image, mediaOrigin),
      };
    });
  } catch {
    return [];
  }
});

export const getPricingSettings = cache(async (): Promise<PricingSettingsView> => {
  try {
    const payload = await getPayloadClient();
    const rawGlobal = await payload.findGlobal({
      slug: 'pricing-settings',
      overrideAccess: false,
    });
    const doc = record(rawGlobal);

    if (!doc) return DEFAULT_SETTINGS;

    const policies = record(doc.defaultCommercialPolicies);
    const inclusions = Array.isArray(doc.globalInclusions)
      ? doc.globalInclusions
          .map((i) => {
            const item = record(i);
            return item?.item ? String(item.item) : '';
          })
          .filter(Boolean)
      : DEFAULT_SETTINGS.globalInclusions;

    return {
      currency: doc.currency ? String(doc.currency) : DEFAULT_SETTINGS.currency,
      defaultTaxNote: doc.defaultTaxNote ? String(doc.defaultTaxNote) : DEFAULT_SETTINGS.defaultTaxNote,
      affiliateTariffNote: doc.affiliateTariffNote ? String(doc.affiliateTariffNote) : DEFAULT_SETTINGS.affiliateTariffNote,
      generalDisclosureText: doc.generalDisclosure ? text(JSON.stringify(doc.generalDisclosure), 1000) : undefined,
      globalInclusions: inclusions.length ? inclusions : DEFAULT_SETTINGS.globalInclusions,
      defaultCurbsideGraceMinutes: Number(policies?.defaultCurbsideGraceMinutes) || 15,
      defaultDomesticAirportGraceMinutes: Number(policies?.defaultDomesticAirportGraceMinutes) || 30,
      defaultInternationalAirportGraceMinutes: Number(policies?.defaultInternationalAirportGraceMinutes) || 60,
      defaultLateNightWindowStart: policies?.defaultLateNightWindowStart ? String(policies.defaultLateNightWindowStart) : '23:00',
      defaultLateNightWindowEnd: policies?.defaultLateNightWindowEnd ? String(policies.defaultLateNightWindowEnd) : '05:00',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export const getActiveRateCards = cache(async (serviceSlug?: string): Promise<RateCard[]> => {
  try {
    const payload = await getPayloadClient();
    const now = new Date();

    const whereConditions: Where[] = [
      { _status: { equals: 'published' } },
      { 'reconciliation.status': { equals: 'published' } },
    ];

    const res = await payload.find({
      collection: 'rate-cards',
      where: { and: whereConditions },
      limit: 100,
      depth: 2,
      overrideAccess: false,
    });

    return res.docs.filter((card: RateCard) =>
      isRateCardEligible(card as unknown as RateCardCandidate, now, serviceSlug),
    );
  } catch {
    return [];
  }
});

export const getRatesAndOptionsContent = cache(async (): Promise<RatesAndOptionsContent> => {
  try {
    const [classes, rateCards, settings] = await Promise.all([
      getVehicleClasses(),
      getActiveRateCards(),
      getPricingSettings(),
    ]);

    return mapEligibleRateCardsToContent(
      classes,
      rateCards as unknown as RateCardCandidate[],
      settings,
    );
  } catch {
    return {
      vehicleClasses: [],
      fixedRoutes: [],
      hourlyCharters: [],
      mileagePolicies: [],
      applicableFees: [],
      settings: DEFAULT_SETTINGS,
      status: 'unavailable',
    };
  }
});

export const getServicePricing = cache(async (service: {
  slug: string;
  pricingDisplay?: {
    showPricingOnPage?: boolean;
    pricingHeadline?: string;
    eligiblePricingModel?: 'fixed' | 'hourly' | 'mileage' | 'contact_only';
    showStartingFrom?: boolean;
    startingFromNote?: string;
  };
}): Promise<ServicePricingInfo> => {
  const display = service.pricingDisplay;

  if (display?.showPricingOnPage === false || display?.eligiblePricingModel === 'contact_only') {
    return {
      showPricing: false,
      quotationOnly: true,
      hasPublishedRate: false,
    };
  }

  const rateCards = await getActiveRateCards(service.slug);

  if (!rateCards.length) {
    return {
      showPricing: Boolean(display?.showPricingOnPage),
      pricingHeadline: display?.pricingHeadline || 'Transparent Pricing & Custom Quotation',
      eligiblePricingModel: display?.eligiblePricingModel,
      startingPriceNote: display?.startingFromNote || 'Quotes tailored to your destination and schedule.',
      hasPublishedRate: false,
      quotationOnly: true,
    };
  }

  const targetModel = display?.eligiblePricingModel;

  // Derive starting price strictly from comparable active cards
  const starting = computeStartingPrice(
    rateCards as unknown as Parameters<typeof computeStartingPrice>[0],
    targetModel,
  );

  return {
    showPricing: true,
    pricingHeadline: display?.pricingHeadline || 'Transparent, Direct Pricing',
    eligiblePricingModel: display?.eligiblePricingModel,
    startingPrice:
      display?.showStartingFrom !== false && starting
        ? `$${starting.amount.toFixed(0)}`
        : undefined,
    startingPriceNote:
      display?.startingFromNote ||
      (starting ? `Starting at $${starting.amount.toFixed(0)} (${starting.basis})` : undefined),
    hasPublishedRate: Boolean(starting),
    quotationOnly: !starting,
  };
});
