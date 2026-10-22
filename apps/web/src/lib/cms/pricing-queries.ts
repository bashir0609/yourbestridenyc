import 'server-only';
import { cache } from 'react';
import type { Where } from 'payload';
import type { RateCard, VehicleClass } from '@/payload-types';
import { mapImage, record, text } from './mappers';
import { computeStartingPrice } from './pricing-rules';
import type {
  FeeRuleEntry,
  FixedRouteEntry,
  HourlyCharterEntry,
  MileagePolicyEntry,
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
      { reconciliationStatus: { equals: 'active' } },
    ];

    const res = await payload.find({
      collection: 'rate-cards',
      where: { and: whereConditions },
      limit: 100,
      depth: 2,
      overrideAccess: false,
    });

    // Date window check in memory to guarantee no future or expired rates
    return res.docs.filter((card: RateCard) => {
      if (card.effectiveFrom && new Date(card.effectiveFrom) > now) return false;
      if (card.effectiveTo && new Date(card.effectiveTo) < now) return false;

      if (serviceSlug) {
        if (card.serviceScope === 'service_specific') {
          const serviceMatch =
            Array.isArray(card.services) &&
            card.services.some(
              (s) => typeof s === 'object' && s !== null && 'slug' in s && s.slug === serviceSlug,
            );
          if (!serviceMatch) return false;
        }
      }

      return true;
    });
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

    const fixedRoutes: FixedRouteEntry[] = [];
    const hourlyCharters: HourlyCharterEntry[] = [];
    const mileagePolicies: MileagePolicyEntry[] = [];
    const feeMap = new Map<string, FeeRuleEntry>();

    for (const card of rateCards) {
      const vClass =
        typeof card.vehicleClass === 'object' && card.vehicleClass !== null
          ? (card.vehicleClass as VehicleClass)
          : null;
      const className = vClass?.name ? String(vClass.name) : 'Vehicle Class';
      const classSlug = vClass?.slug ? String(vClass.slug) : '';

      // 1. Fixed routes
      if (card.pricingModel === 'fixed' && Array.isArray(card.routes)) {
        for (const route of card.routes) {
          if (route.flatRate !== undefined && route.flatRate !== null) {
            fixedRoutes.push({
              id: route.id || `${card.id}-${fixedRoutes.length}`,
              routeLabel:
                route.routeLabel ||
                `${route.originZone || 'Origin'} to ${route.destinationZone || 'Destination'}`,
              originZone: route.originZone || 'Origin',
              destinationZone: route.destinationZone || 'Destination',
              flatRate: Number(route.flatRate),
              additionalStopFee:
                typeof route.additionalStopFee === 'number' ? route.additionalStopFee : undefined,
              notes: route.notes || undefined,
              vehicleClassName: className,
              vehicleClassSlug: classSlug,
            });
          }
        }
      }

      // 2. Hourly charters
      if (card.pricingModel === 'hourly' && card.hourly?.hourlyRate) {
        const hourlyRate = Number(card.hourly.hourlyRate);
        const minimumHours = Number(card.hourly.minimumHours) || 2;
        const minimumSubtotal = hourlyRate * minimumHours;

        hourlyCharters.push({
          id: card.id,
          title: card.title || `${className} Hourly Charter`,
          vehicleClassName: className,
          vehicleClassSlug: classSlug,
          hourlyRate,
          minimumHours,
          minimumSubtotal,
          additionalHourRate:
            typeof card.hourly.additionalHourRate === 'number'
              ? card.hourly.additionalHourRate
              : undefined,
          overtimeIncrementMinutes:
            typeof card.hourly.overtimeIncrementMinutes === 'number'
              ? card.hourly.overtimeIncrementMinutes
              : 15,
          overtimeRate:
            typeof card.hourly.overtimeRate === 'number' ? card.hourly.overtimeRate : undefined,
          curbsideGraceMinutes:
            typeof card.commercialPolicies?.curbsideGraceMinutes === 'number'
              ? card.commercialPolicies.curbsideGraceMinutes
              : settings.defaultCurbsideGraceMinutes,
          domesticAirportGraceMinutes:
            typeof card.commercialPolicies?.domesticAirportGraceMinutes === 'number'
              ? card.commercialPolicies.domesticAirportGraceMinutes
              : settings.defaultDomesticAirportGraceMinutes,
          internationalAirportGraceMinutes:
            typeof card.commercialPolicies?.internationalAirportGraceMinutes === 'number'
              ? card.commercialPolicies.internationalAirportGraceMinutes
              : settings.defaultInternationalAirportGraceMinutes,
          waitingHourlyRate:
            typeof card.commercialPolicies?.waitingHourlyRate === 'number'
              ? card.commercialPolicies.waitingHourlyRate
              : undefined,
          lateNightSurcharge:
            typeof card.commercialPolicies?.lateNightSurcharge === 'number'
              ? card.commercialPolicies.lateNightSurcharge
              : undefined,
          lateNightWindowStart:
            card.commercialPolicies?.lateNightWindowStart || settings.defaultLateNightWindowStart,
          lateNightWindowEnd:
            card.commercialPolicies?.lateNightWindowEnd || settings.defaultLateNightWindowEnd,
        });
      }

      // 3. Mileage policies
      if (card.pricingModel === 'mileage') {
        mileagePolicies.push({
          id: card.id,
          title: card.title || `${className} Mileage Rate`,
          vehicleClassName: className,
          vehicleClassSlug: classSlug,
          baseFare:
            typeof card.mileage?.baseFare === 'number' ? card.mileage.baseFare : undefined,
          perMileRate:
            typeof card.mileage?.perMileRate === 'number' ? card.mileage.perMileRate : undefined,
          minimumFare:
            typeof card.mileage?.minimumFare === 'number' ? card.mileage.minimumFare : undefined,
          perMinuteRate:
            typeof card.mileage?.perMinuteRate === 'number' ? card.mileage.perMinuteRate : undefined,
          deadheadThresholdMiles:
            typeof card.mileage?.deadheadThresholdMiles === 'number'
              ? card.mileage.deadheadThresholdMiles
              : undefined,
          deadheadRatePerMile:
            typeof card.mileage?.deadheadRatePerMile === 'number'
              ? card.mileage.deadheadRatePerMile
              : undefined,
          complimentaryWaitMinutes:
            typeof card.mileage?.complimentaryWaitMinutes === 'number'
              ? card.mileage.complimentaryWaitMinutes
              : undefined,
          waitingRatePerHour:
            typeof card.mileage?.waitingRatePerHour === 'number'
              ? card.mileage.waitingRatePerHour
              : undefined,
          deadheadPolicyNote: card.commercialPolicies?.deadheadPolicyNote || undefined,
        });
      }

      // Collect fee rules deduplicated by feeIdentifier
      if (Array.isArray(card.applicableFees)) {
        for (const fee of card.applicableFees) {
          const key = fee.feeIdentifier || fee.feeName;
          if (key && !feeMap.has(key)) {
            feeMap.set(key, {
              id: fee.id || key,
              feeIdentifier: fee.feeIdentifier || 'custom_surcharge',
              feeName: fee.feeName || 'Standard Surcharge',
              feeCategory: fee.feeCategory || 'company_policy',
              triggerCondition: fee.triggerCondition || 'always_mandatory',
              billingType: fee.billingType || 'flat',
              amount: typeof fee.amount === 'number' ? fee.amount : undefined,
              customerDisclosure: fee.customerDisclosure || undefined,
            });
          }
        }
      }
    }

    const hasContent = fixedRoutes.length > 0 || hourlyCharters.length > 0 || mileagePolicies.length > 0;

    return {
      vehicleClasses: classes,
      fixedRoutes,
      hourlyCharters,
      mileagePolicies,
      applicableFees: Array.from(feeMap.values()),
      settings,
      status: hasContent || classes.length > 0 ? 'ready' : 'empty',
    };
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
