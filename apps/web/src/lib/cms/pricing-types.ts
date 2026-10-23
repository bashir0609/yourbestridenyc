import type { PublicImage } from './types';

export type VehicleClassCard = {
  id: number;
  name: string;
  slug: string;
  tier: string;
  passengerCapacity: number;
  luggageCapacity?: number;
  summary?: string;
  featured?: boolean;
  displayOrder?: number;
  image?: PublicImage;
};

export type FixedRouteEntry = {
  id: string;
  routeLabel: string;
  originZone: string;
  destinationZone: string;
  originLocationId?: number;
  originLocationSlug?: string;
  originLocationName?: string;
  destinationLocationId?: number;
  destinationLocationSlug?: string;
  destinationLocationName?: string;
  flatRate: number;
  additionalStopFee?: number;
  notes?: string;
  vehicleClassName: string;
  vehicleClassSlug: string;
};

export type LocationRoutePrice = {
  id: string;
  routeLabel: string;
  originZone: string;
  destinationZone: string;
  originLocationId?: number;
  originLocationSlug?: string;
  destinationLocationId?: number;
  destinationLocationSlug?: string;
  flatRate: number;
  additionalStopFee?: number;
  notes?: string;
  vehicleClassName: string;
  vehicleClassSlug: string;
  direction: 'outbound' | 'inbound';
};

export type HourlyCharterEntry = {
  id: number;
  title: string;
  vehicleClassName: string;
  vehicleClassSlug: string;
  hourlyRate: number;
  minimumHours: number;
  minimumSubtotal: number;
  additionalHourRate?: number;
  overtimeIncrementMinutes?: number;
  overtimeRate?: number;
  curbsideGraceMinutes?: number;
  domesticAirportGraceMinutes?: number;
  internationalAirportGraceMinutes?: number;
  waitingHourlyRate?: number;
  lateNightSurcharge?: number;
  lateNightWindowStart?: string;
  lateNightWindowEnd?: string;
};

export type MileagePolicyEntry = {
  id: number;
  title: string;
  vehicleClassName: string;
  vehicleClassSlug: string;
  baseFare?: number;
  perMileRate?: number;
  minimumFare?: number;
  perMinuteRate?: number;
  deadheadThresholdMiles?: number;
  deadheadRatePerMile?: number;
  complimentaryWaitMinutes?: number;
  waitingRatePerHour?: number;
  deadheadPolicyNote?: string;
};

export type FeeRuleEntry = {
  id: string;
  feeIdentifier: string;
  feeName: string;
  feeCategory: string;
  triggerCondition: string;
  billingType: string;
  amount?: number;
  customerDisclosure?: string;
};

export type PricingSettingsView = {
  currency: string;
  defaultTaxNote: string;
  affiliateTariffNote: string;
  generalDisclosureText?: string;
  globalInclusions: string[];
  defaultCurbsideGraceMinutes: number;
  defaultDomesticAirportGraceMinutes: number;
  defaultInternationalAirportGraceMinutes: number;
  defaultLateNightWindowStart: string;
  defaultLateNightWindowEnd: string;
};

export type RatesAndOptionsContent = {
  vehicleClasses: VehicleClassCard[];
  fixedRoutes: FixedRouteEntry[];
  hourlyCharters: HourlyCharterEntry[];
  mileagePolicies: MileagePolicyEntry[];
  applicableFees: FeeRuleEntry[];
  settings: PricingSettingsView;
  status: 'ready' | 'empty' | 'unavailable';
};

export type ServicePricingInfo = {
  showPricing: boolean;
  pricingHeadline?: string;
  eligiblePricingModel?: 'fixed' | 'hourly' | 'mileage' | 'contact_only';
  startingPrice?: string;
  startingPriceNote?: string;
  hasPublishedRate: boolean;
  quotationOnly: boolean;
};
