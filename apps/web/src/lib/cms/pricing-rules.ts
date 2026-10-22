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
  category: 'statutory_mandate' | 'airport_authority' | 'toll_pass_through' | 'company_policy' | 'passenger_option';
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

  // 1. Statutory NYS Congestion Surcharge
  if (qualifiesForNYSCongestionSurcharge(context) && !appliedIdentifiers.has('nys_congestion_surcharge')) {
    appliedIdentifiers.add('nys_congestion_surcharge');
    results.push({
      feeIdentifier: 'nys_congestion_surcharge',
      feeName: 'NYS Congestion Surcharge',
      category: 'statutory_mandate',
      amount: 2.75,
      billingType: 'flat',
      applied: true,
      reason: 'Mandatory statutory charge (NY Tax Law § 1281) for for-hire transportation touching Manhattan south of 96th St.',
    });
  }

  // 2. MTA Central Business District Tolling (Separate and non-mutually-exclusive)
  if (qualifiesForMTACBDCharge(context) && !appliedIdentifiers.has('mta_cbd_tolling')) {
    appliedIdentifiers.add('mta_cbd_tolling');
    results.push({
      feeIdentifier: 'mta_cbd_tolling',
      feeName: 'MTA CBD Tolling Charge',
      category: 'statutory_mandate',
      amount: 1.50,
      billingType: 'flat',
      applied: true,
      reason: 'MTA Congestion Relief Zone entry toll (Manhattan south of 60th St) for for-hire vehicles.',
    });
  }

  // 3. Airport Authority Access Fees
  const isAirport = (zone: GeographicZone) =>
    zone === 'nyc_airport_jfk' || zone === 'nyc_airport_lga' || zone === 'nyc_airport_ewr';

  if ((isAirport(context.originZone) || isAirport(context.destinationZone)) && !appliedIdentifiers.has('panynj_airport_access')) {
    appliedIdentifiers.add('panynj_airport_access');
    results.push({
      feeIdentifier: 'panynj_airport_access',
      feeName: 'Port Authority Airport Access Fee',
      category: 'airport_authority',
      amount: 3.50,
      billingType: 'flat',
      applied: true,
      reason: 'Port Authority of NY & NJ commercial ground transportation facility access fee.',
    });
  }

  // 4. Passenger options
  if (context.childSeatsCount && context.childSeatsCount > 0 && !appliedIdentifiers.has('child_safety_seat')) {
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
      reason: 'Chauffeur greeting inside passenger arrival terminal with custom name board and luggage assistance.',
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
        if (typeof route.flatRate === 'number' && route.flatRate > 0 && route.flatRate < lowestPrice) {
          lowestPrice = route.flatRate;
          selectedBasis = `${vcName} ${route.routeLabel || 'Airport Transfer'}`;
          selectedModel = 'fixed';
        }
      }
    } else if (card.pricingModel === 'hourly' && card.hourly?.hourlyRate) {
      const rate = card.hourly.hourlyRate;
      const minHours = card.hourly.minimumHours || 1;
      if (rate < lowestPrice) {
        lowestPrice = rate;
        selectedBasis = `${vcName} (Hourly, ${minHours}-hr minimum)`;
        selectedModel = 'hourly';
      }
    } else if (card.pricingModel === 'mileage' && (card.mileage?.minimumFare || card.mileage?.baseFare)) {
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
