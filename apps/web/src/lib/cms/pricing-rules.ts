import type {
  FeeRuleEntry,
  FixedRouteEntry,
  HourlyCharterEntry,
  MileagePolicyEntry,
  PricingSettingsView,
  RatesAndOptionsContent,
  VehicleClassCard,
} from './pricing-types';

export type GeographicZone =
  | 'manhattan_cbd' // South of 60th St
  | 'manhattan_north_60_south_96' // Between 60th St and 96th St
  | 'manhattan_north_96' // North of 96th St
  | 'outer_borough_ny' // Brooklyn, Queens, Bronx, Staten Island
  | 'nyc_airport_jfk'
  | 'nyc_airport_lga'
  | 'nyc_airport_ewr'
  | 'out_of_town'; // Westchester, Long Island, CT, NJ other

export interface TripContext {
  originZone: GeographicZone;
  destinationZone: GeographicZone;
  transitsManhattanSouthOf96?: boolean;
  entersManhattanCBDFromOutside?: boolean;
  pickupTimeLocal?: string; // "HH:mm"
  stopsCount?: number;
  childSeatsCount?: number;
  meetAndGreetRequested?: boolean;
}

export interface EvaluatedFee {
  feeIdentifier: string;
  feeName: string;
  category:
    | 'statutory_mandate'
    | 'airport_authority'
    | 'toll_pass_through'
    | 'company_policy'
    | 'passenger_option';
  amount: number;
  billingType: 'flat' | 'percentage' | 'pass_through_actual';
  applied: boolean;
  reason: string;
}

/**
 * NY State Congestion Surcharge (NY Tax Law § 1281)
 * Statutory fee: $2.75 for dispatched for-hire vehicles on trips that
 * begin in, end in, or pass through Manhattan south of 96th Street.
 */
export function qualifiesForNYSCongestionSurcharge(context: TripContext): boolean {
  const isSouthOf96 = (zone: GeographicZone) =>
    zone === 'manhattan_cbd' || zone === 'manhattan_north_60_south_96';

  if (isSouthOf96(context.originZone) || isSouthOf96(context.destinationZone)) {
    return true;
  }
  return Boolean(context.transitsManhattanSouthOf96);
}

/**
 * MTA Central Business District (CBD) Tolling Program
 * Applicable to black car / dispatched for-hire vehicles entering the
 * Manhattan Central Business District (south of 60th Street).
 * Applicable rate under approved plan: $1.50 per qualifying trip.
 */
export function qualifiesForMTACBDCharge(context: TripContext): boolean {
  // Trips entering the CBD from north of 60th St or outer areas/airports
  if (context.originZone !== 'manhattan_cbd' && context.destinationZone === 'manhattan_cbd') {
    return true;
  }
  // Trips originating outside entering through CBD en-route
  if (context.entersManhattanCBDFromOutside) {
    return true;
  }
  return false;
}

export function evaluateTripFees(
  context: TripContext,
  configuredFees?: Array<{
    feeIdentifier: string;
    feeName: string;
    feeCategory: EvaluatedFee['category'];
    triggerCondition: string;
    billingType: EvaluatedFee['billingType'];
    amount?: number;
    customerDisclosure: string;
  }>,
): EvaluatedFee[] {
  const appliedIdentifiers = new Set<string>();
  const results: EvaluatedFee[] = [];
  const configuredMap = new Map<string, NonNullable<typeof configuredFees>[number]>();
  if (configuredFees) {
    for (const f of configuredFees) {
      if (f.feeIdentifier) configuredMap.set(f.feeIdentifier, f);
    }
  }

  // 1. Statutory NYS Congestion Surcharge
  if (
    qualifiesForNYSCongestionSurcharge(context) &&
    !appliedIdentifiers.has('nys_congestion_surcharge')
  ) {
    appliedIdentifiers.add('nys_congestion_surcharge');
    const override = configuredMap.get('nys_congestion_surcharge');
    results.push({
      feeIdentifier: 'nys_congestion_surcharge',
      feeName: override?.feeName || 'NYS Congestion Surcharge',
      category: 'statutory_mandate',
      amount: override?.amount !== undefined ? override.amount : 2.75,
      billingType: override?.billingType || 'flat',
      applied: true,
      reason:
        override?.customerDisclosure ||
        'Mandatory statutory charge (NY Tax Law § 1281) for for-hire transportation touching Manhattan south of 96th St.',
    });
  }

  // 2. MTA Central Business District Tolling (Separate and non-mutually-exclusive)
  if (qualifiesForMTACBDCharge(context) && !appliedIdentifiers.has('mta_cbd_tolling')) {
    appliedIdentifiers.add('mta_cbd_tolling');
    const override = configuredMap.get('mta_cbd_tolling');
    results.push({
      feeIdentifier: 'mta_cbd_tolling',
      feeName: override?.feeName || 'MTA CBD Tolling Charge',
      category: 'statutory_mandate',
      amount: override?.amount !== undefined ? override.amount : 1.5,
      billingType: override?.billingType || 'flat',
      applied: true,
      reason:
        override?.customerDisclosure ||
        'MTA Congestion Relief Zone entry toll (Manhattan south of 60th St) for for-hire vehicles.',
    });
  }

  // 3. Airport Authority Access Fees
  const isAirport = (zone: GeographicZone) =>
    zone === 'nyc_airport_jfk' || zone === 'nyc_airport_lga' || zone === 'nyc_airport_ewr';

  if (
    (isAirport(context.originZone) || isAirport(context.destinationZone)) &&
    !appliedIdentifiers.has('panynj_airport_access')
  ) {
    appliedIdentifiers.add('panynj_airport_access');
    const override = configuredMap.get('panynj_airport_access');
    results.push({
      feeIdentifier: 'panynj_airport_access',
      feeName: override?.feeName || 'Port Authority Airport Access Fee',
      category: 'airport_authority',
      amount: override?.amount !== undefined ? override.amount : 3.5,
      billingType: override?.billingType || 'flat',
      applied: true,
      reason:
        override?.customerDisclosure ||
        'Port Authority of NY & NJ commercial ground transportation facility access fee.',
    });
  }

  // 4. Passenger options
  if (
    context.childSeatsCount &&
    context.childSeatsCount > 0 &&
    !appliedIdentifiers.has('child_safety_seat')
  ) {
    appliedIdentifiers.add('child_safety_seat');
    results.push({
      feeIdentifier: 'child_safety_seat',
      feeName: 'Child Safety Equipment',
      category: 'passenger_option',
      amount: 25.0 * context.childSeatsCount,
      billingType: 'flat',
      applied: true,
      reason: `Sanitized toddler/booster seat installation (${context.childSeatsCount} seat${context.childSeatsCount > 1 ? 's' : ''}).`,
    });
  }

  if (context.meetAndGreetRequested && !appliedIdentifiers.has('vip_meet_and_greet')) {
    appliedIdentifiers.add('vip_meet_and_greet');
    results.push({
      feeIdentifier: 'vip_meet_and_greet',
      feeName: 'VIP Terminal Meet & Greet',
      category: 'passenger_option',
      amount: 45.0,
      billingType: 'flat',
      applied: true,
      reason:
        'Chauffeur greeting inside passenger arrival terminal with custom name board and luggage assistance.',
    });
  }

  // Process any custom configured fees from CMS rate cards without duplicating
  if (configuredFees) {
    for (const f of configuredFees) {
      if (!appliedIdentifiers.has(f.feeIdentifier)) {
        appliedIdentifiers.add(f.feeIdentifier);
        results.push({
          feeIdentifier: f.feeIdentifier,
          feeName: f.feeName,
          category: f.feeCategory,
          amount: f.amount ?? 0,
          billingType: f.billingType,
          applied: true,
          reason: f.customerDisclosure,
        });
      }
    }
  }

  return results;
}

export interface StartingPriceComputation {
  amount: number;
  basis: string;
  pricingModel: 'fixed' | 'hourly' | 'mileage';
  currency: string;
}

/**
 * Calculates a service starting price strictly from eligible, published rate cards.
 * Only compares equivalent pricing models and products.
 */
export function computeStartingPrice(
  rateCards: Array<{
    _status?: string;
    reconciliation?: { status?: string };
    pricingModel: 'fixed' | 'hourly' | 'mileage' | 'custom';
    vehicleClass?: { name?: string };
    routes?: Array<{ flatRate?: number; routeLabel?: string }>;
    hourly?: { hourlyRate?: number; minimumHours?: number };
    mileage?: { baseFare?: number; minimumFare?: number };
    currency?: string;
  }>,
  targetPricingModel?: 'fixed' | 'hourly' | 'mileage',
): StartingPriceComputation | null {
  const eligible = rateCards.filter(
    (c) =>
      c._status === 'published' &&
      c.reconciliation?.status === 'published' &&
      (!targetPricingModel || c.pricingModel === targetPricingModel),
  );

  if (eligible.length === 0) return null;

  let lowestPrice = Infinity;
  let selectedBasis = '';
  let selectedModel: 'fixed' | 'hourly' | 'mileage' = 'fixed';
  let currency = 'USD';

  for (const card of eligible) {
    const vcName = card.vehicleClass?.name || 'Executive Vehicle';
    if (card.currency) currency = card.currency;

    if (card.pricingModel === 'fixed' && Array.isArray(card.routes)) {
      for (const route of card.routes) {
        if (
          typeof route.flatRate === 'number' &&
          route.flatRate > 0 &&
          route.flatRate < lowestPrice
        ) {
          lowestPrice = route.flatRate;
          selectedBasis = `${vcName} ${route.routeLabel || 'Airport Transfer'}`;
          selectedModel = 'fixed';
        }
      }
    } else if (card.pricingModel === 'hourly' && card.hourly?.hourlyRate) {
      const rate = card.hourly.hourlyRate;
      const minHours = card.hourly.minimumHours || 1;
      const minSubtotal = rate * minHours;
      if (rate < lowestPrice) {
        lowestPrice = rate;
        selectedBasis = `${vcName} ($${rate}/hr, ${minHours}-hr minimum, $${minSubtotal} min subtotal)`;
        selectedModel = 'hourly';
      }
    } else if (
      card.pricingModel === 'mileage' &&
      (card.mileage?.minimumFare || card.mileage?.baseFare)
    ) {
      const fare = card.mileage.minimumFare || card.mileage.baseFare || 0;
      if (fare > 0 && fare < lowestPrice) {
        lowestPrice = fare;
        selectedBasis = `${vcName} Base Fare`;
        selectedModel = 'mileage';
      }
    }
  }

  if (lowestPrice === Infinity) return null;

  return {
    amount: lowestPrice,
    basis: selectedBasis,
    pricingModel: selectedModel,
    currency,
  };
}

export interface RateCardCandidate {
  id?: number | string;
  title?: string | null;
  _status?: string | null;
  reconciliation?: {
    status?: string | null;
    laReferenceCode?: string | null;
    reconciliationNotes?: string | null;
  } | null;
  pricingModel: 'fixed' | 'hourly' | 'mileage' | 'custom';
  serviceScope?: 'global' | 'service_specific' | null;
  services?: Array<{ slug?: string } | unknown> | null;
  vehicleClass?: { id?: number | string; name?: string; slug?: string } | number | string | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  routes?: Array<{
    id?: string | null;
    routeLabel?: string | null;
    originZone?: string | null;
    destinationZone?: string | null;
    originLocation?:
      | { id?: number | string; name?: string; title?: string; slug?: string }
      | number
      | string
      | null;
    destinationLocation?:
      | { id?: number | string; name?: string; title?: string; slug?: string }
      | number
      | string
      | null;
    flatRate?: number | null;
    additionalStopFee?: number | null;
    notes?: string | null;
  }> | null;
  hourly?: {
    hourlyRate?: number | null;
    minimumHours?: number | null;
    additionalHourRate?: number | null;
    overtimeIncrementMinutes?: number | null;
    overtimeRate?: number | null;
  } | null;
  mileage?: {
    baseFare?: number | null;
    perMileRate?: number | null;
    minimumFare?: number | null;
    perMinuteRate?: number | null;
    deadheadThresholdMiles?: number | null;
    deadheadRatePerMile?: number | null;
    complimentaryWaitMinutes?: number | null;
    waitingRatePerHour?: number | null;
  } | null;
  commercialPolicies?: {
    curbsideGraceMinutes?: number | null;
    domesticAirportGraceMinutes?: number | null;
    internationalAirportGraceMinutes?: number | null;
    waitingHourlyRate?: number | null;
    lateNightSurcharge?: number | null;
    lateNightWindowStart?: string | null;
    lateNightWindowEnd?: string | null;
    deadheadPolicyNote?: string | null;
  } | null;
  applicableFees?: Array<{
    id?: string | null;
    feeIdentifier?: string | null;
    feeName?: string | null;
    feeCategory?: EvaluatedFee['category'] | null;
    triggerCondition?: string | null;
    billingType?: EvaluatedFee['billingType'] | null;
    amount?: number | null;
    customerDisclosure?: string | null;
  }> | null;
  currency?: string | null;
}

export function isRateCardEligible(
  card: RateCardCandidate,
  now: Date = new Date(),
  serviceSlug?: string,
): boolean {
  if (card._status !== 'published') return false;
  if (card.reconciliation?.status !== 'published') return false;
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
}

export function extractRelationId(val: unknown): number | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && !isNaN(Number(val))) return Number(val);
  if (typeof val === 'object' && 'id' in val) {
    const id = (val as { id: unknown }).id;
    if (typeof id === 'number') return id;
    if (typeof id === 'string' && !isNaN(Number(id))) return Number(id);
  }
  return undefined;
}

export function extractRelationSlug(val: unknown): string | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'object' && 'slug' in val) {
    const slug = (val as { slug: unknown }).slug;
    return typeof slug === 'string' ? slug : undefined;
  }
  return undefined;
}

export function extractRelationName(val: unknown): string | undefined {
  if (val === null || val === undefined) return undefined;
  if (typeof val === 'object') {
    if ('name' in val && typeof (val as { name: unknown }).name === 'string') {
      return (val as { name: string }).name;
    }
    if ('title' in val && typeof (val as { title: unknown }).title === 'string') {
      return (val as { title: string }).title;
    }
  }
  return undefined;
}

/**
 * Strict route-level location filtering.
 * Matches a selected location strictly against the route's explicit linked originLocation
 * canonical slug or numeric/string ID.
 *
 * Rules:
 * - When no location query is provided, all routes remain eligible.
 * - Matches strictly against the linked originLocation ID or canonical slug.
 * - Excludes routes originating from other locations (e.g. Manhattan routes excluded when filtering Brooklyn).
 * - Excludes unlinked routes when an explicit location filter is active.
 * - Does NOT perform substring matching on route names, labels, or zones.
 * - Does NOT infer inbound or reverse-direction fares (does not match destinationLocation).
 */
export function isRouteMatchingOriginLocation(
  route: FixedRouteEntry,
  locationQuery: string | undefined | null,
): boolean {
  if (!locationQuery || !locationQuery.trim()) {
    return true;
  }
  const cleanLoc = locationQuery.trim().toLowerCase();

  if (route.originLocationSlug && route.originLocationSlug.toLowerCase() === cleanLoc) {
    return true;
  }

  if (route.originLocationId !== undefined && String(route.originLocationId) === cleanLoc) {
    return true;
  }

  return false;
}

/**
 * Resolves customer-friendly location display name.
 * Uses linked originLocationName if available, or formats canonical slug.
 */
export function resolveLocationDisplayName(
  locationQuery: string | undefined | null,
  fixedRoutes?: FixedRouteEntry[],
): string {
  if (!locationQuery || !locationQuery.trim()) return '';
  const clean = locationQuery.trim().toLowerCase();

  if (fixedRoutes) {
    const matchedRoute = fixedRoutes.find(
      (r) =>
        (r.originLocationSlug && r.originLocationSlug.toLowerCase() === clean) ||
        (r.originLocationId !== undefined && String(r.originLocationId) === clean),
    );
    if (matchedRoute?.originLocationName) {
      const parts = matchedRoute.originLocationName.split(',');
      const first = parts[0];
      return first ? first.trim() : matchedRoute.originLocationName;
    }
  }

  return clean
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Strictly matches fixed routes against a vehicle class query parameter.
 * Matches linked vehicleClassId, canonical vehicleClassSlug, or exact vehicleClassName.
 * Never performs substring matching, never matches vehicle model names.
 */
export function isRouteMatchingVehicleClass(
  route: FixedRouteEntry,
  vehicleClassQuery?: string | number | null,
): boolean {
  if (vehicleClassQuery === undefined || vehicleClassQuery === null) return true;
  const raw = String(vehicleClassQuery).trim();
  if (!raw) return true;
  const query = raw.toLowerCase();

  // 1. Match against linked Payload vehicleClass relationship ID
  if (route.vehicleClassId !== undefined && String(route.vehicleClassId) === raw) {
    return true;
  }

  // 2. Match against canonical vehicleClass slug
  if (route.vehicleClassSlug && route.vehicleClassSlug.toLowerCase() === query) {
    return true;
  }

  // 3. Match against exact vehicleClass name (never substring)
  if (route.vehicleClassName && route.vehicleClassName.toLowerCase() === query) {
    return true;
  }

  return false;
}

/**
 * Strictly matches hourly charters against a vehicle class query parameter.
 */
export function isHourlyMatchingVehicleClass(
  charter: HourlyCharterEntry,
  vehicleClassQuery?: string | number | null,
): boolean {
  if (vehicleClassQuery === undefined || vehicleClassQuery === null) return true;
  const raw = String(vehicleClassQuery).trim();
  if (!raw) return true;
  const query = raw.toLowerCase();

  // 1. Match against linked Payload vehicleClass relationship ID
  if (charter.vehicleClassId !== undefined && String(charter.vehicleClassId) === raw) {
    return true;
  }

  // 2. Match against canonical vehicleClass slug
  if (charter.vehicleClassSlug && charter.vehicleClassSlug.toLowerCase() === query) {
    return true;
  }

  // 3. Match against exact vehicleClass name (never substring)
  if (charter.vehicleClassName && charter.vehicleClassName.toLowerCase() === query) {
    return true;
  }

  return false;
}

/**
 * Resolves customer-friendly vehicle class display name.
 */
export function resolveVehicleClassDisplayName(
  vehicleClassQuery?: string | number | null,
  vehicleClasses?: VehicleClassCard[],
): string {
  if (!vehicleClassQuery) return '';
  const raw = String(vehicleClassQuery).trim();
  if (!raw) return '';
  const query = raw.toLowerCase();

  if (Array.isArray(vehicleClasses)) {
    const matched = vehicleClasses.find(
      (c) =>
        String(c.id) === raw || c.slug.toLowerCase() === query || c.name.toLowerCase() === query,
    );
    if (matched) return matched.name;
  }

  if (query === 'standard-suv' || query === '1') return 'Standard SUV';
  if (query === 'premium-crossover-suv' || query === '2') return 'Premium Crossover SUV';

  return raw
    .split(/[-_ ]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export type FilterResetType = 'location' | 'vehicleClass' | 'all';

export interface RatesFilterBannerState {
  hasBanner: boolean;
  showLocation: boolean;
  showVehicleClass: boolean;
  buttonLabel: string;
  ariaLabel: string;
  resetType: FilterResetType | null;
}

/**
 * Resolves filter banner visibility, labels, and reset behavior for Rates & Options.
 * Strictly guarantees:
 * - Location filter only: "Filtered by Location: [Name]", button "Show All Locations ×", clears location.
 * - Vehicle class filter only: "Vehicle Class: [Name]", button "Show All Vehicle Classes ×", clears vehicleClass.
 * - Both filters active: Displays both, button "Clear All Filters ×", clears both.
 * - Neither active: hasBanner is false.
 */
export function resolveRatesFilterBanner(
  locationQuery?: string | null,
  vehicleClassQuery?: string | number | null,
): RatesFilterBannerState {
  const hasLoc = Boolean(locationQuery && String(locationQuery).trim());
  const hasClass = Boolean(
    vehicleClassQuery !== undefined &&
      vehicleClassQuery !== null &&
      String(vehicleClassQuery).trim(),
  );

  if (hasLoc && hasClass) {
    return {
      hasBanner: true,
      showLocation: true,
      showVehicleClass: true,
      buttonLabel: 'Clear All Filters \u00D7',
      ariaLabel: 'Clear all filters',
      resetType: 'all',
    };
  }

  if (hasLoc) {
    return {
      hasBanner: true,
      showLocation: true,
      showVehicleClass: false,
      buttonLabel: 'Show All Locations \u00D7',
      ariaLabel: 'Clear location filter',
      resetType: 'location',
    };
  }

  if (hasClass) {
    return {
      hasBanner: true,
      showLocation: false,
      showVehicleClass: true,
      buttonLabel: 'Show All Vehicle Classes \u00D7',
      ariaLabel: 'Clear vehicle class filter',
      resetType: 'vehicleClass',
    };
  }

  return {
    hasBanner: false,
    showLocation: false,
    showVehicleClass: false,
    buttonLabel: '',
    ariaLabel: '',
    resetType: null,
  };
}

/**
 * Computes updated URL when clearing rates-and-options filters.
 * Strictly preserves:
 * - Active pricing tab (e.g. ?tab=airport, ?tab=hourly, ?tab=fixed)
 * - All unrelated query parameters (e.g. ?promo=abc, ?source=google, ?ref=partner)
 * - Only deletes the designated filter parameter(s).
 */
export function computeClearedFilterUrl(
  currentUrl: string,
  filterToClear: FilterResetType,
  activeTab?: string,
): string {
  try {
    const isRelative = !currentUrl.startsWith('http://') && !currentUrl.startsWith('https://');
    const dummyBase = 'https://dummy.local';
    const parsed = new URL(currentUrl, dummyBase);

    if (filterToClear === 'location' || filterToClear === 'all') {
      parsed.searchParams.delete('location');
    }
    if (filterToClear === 'vehicleClass' || filterToClear === 'all') {
      parsed.searchParams.delete('vehicleClass');
    }

    if (activeTab && activeTab !== 'fixed' && !parsed.searchParams.has('tab')) {
      parsed.searchParams.set('tab', activeTab);
    }

    if (isRelative) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
    return parsed.toString();
  } catch {
    return currentUrl;
  }
}

export function mapEligibleRateCardsToContent(
  classes: VehicleClassCard[],
  rateCards: RateCardCandidate[],
  settings: PricingSettingsView,
  now: Date = new Date(),
): RatesAndOptionsContent {
  const eligible = rateCards.filter((card) => isRateCardEligible(card, now));

  const fixedRoutes: FixedRouteEntry[] = [];
  const hourlyCharters: HourlyCharterEntry[] = [];
  const mileagePolicies: MileagePolicyEntry[] = [];
  const feeMap = new Map<string, FeeRuleEntry>();

  for (const card of eligible) {
    const vClass =
      typeof card.vehicleClass === 'object' && card.vehicleClass !== null
        ? card.vehicleClass
        : null;
    const classId =
      vClass?.id !== undefined
        ? Number(vClass.id)
        : typeof card.vehicleClass === 'number'
          ? card.vehicleClass
          : undefined;
    const className = vClass?.name ? String(vClass.name) : 'Vehicle Class';
    const classSlug = vClass?.slug ? String(vClass.slug) : '';

    if (card.pricingModel === 'fixed' && Array.isArray(card.routes)) {
      for (const route of card.routes) {
        if (typeof route.flatRate === 'number' && route.flatRate > 0) {
          fixedRoutes.push({
            id: route.id || `${card.id ?? 'card'}-${fixedRoutes.length}`,
            routeLabel:
              route.routeLabel ||
              `${route.originZone || 'Origin'} to ${route.destinationZone || 'Destination'}`,
            originZone: route.originZone || 'Origin',
            destinationZone: route.destinationZone || 'Destination',
            originLocationId: extractRelationId(route.originLocation),
            originLocationSlug: extractRelationSlug(route.originLocation),
            originLocationName: extractRelationName(route.originLocation),
            destinationLocationId: extractRelationId(route.destinationLocation),
            destinationLocationSlug: extractRelationSlug(route.destinationLocation),
            destinationLocationName: extractRelationName(route.destinationLocation),
            flatRate: Number(route.flatRate),
            additionalStopFee:
              typeof route.additionalStopFee === 'number' ? route.additionalStopFee : undefined,
            notes: route.notes || undefined,
            vehicleClassName: className,
            vehicleClassSlug: classSlug,
            vehicleClassId: classId,
          });
        }
      }
    }

    if (card.pricingModel === 'hourly' && card.hourly?.hourlyRate) {
      const hourlyRate = Number(card.hourly.hourlyRate);
      const minimumHours = Number(card.hourly.minimumHours) || 2;
      const minimumSubtotal = hourlyRate * minimumHours;

      hourlyCharters.push({
        id: card.id ? Number(card.id) : hourlyCharters.length + 1,
        title: card.title || `${className} Hourly Charter`,
        vehicleClassName: className,
        vehicleClassSlug: classSlug,
        vehicleClassId: classId,
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

    if (card.pricingModel === 'mileage') {
      mileagePolicies.push({
        id: card.id ? Number(card.id) : mileagePolicies.length + 1,
        title: card.title || `${className} Mileage Rate`,
        vehicleClassName: className,
        vehicleClassSlug: classSlug,
        baseFare: typeof card.mileage?.baseFare === 'number' ? card.mileage.baseFare : undefined,
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

  const hasContent =
    fixedRoutes.length > 0 || hourlyCharters.length > 0 || mileagePolicies.length > 0;

  return {
    vehicleClasses: classes,
    fixedRoutes,
    hourlyCharters,
    mileagePolicies,
    applicableFees: Array.from(feeMap.values()),
    settings,
    status: hasContent || classes.length > 0 ? 'ready' : 'empty',
  };
}
