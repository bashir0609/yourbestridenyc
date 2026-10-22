import type { CollectionConfig } from 'payload';
import { rateCardDelete, rateCardPublicRead, rateCardWrite } from '../access';
import {
  enforceReconciliationGate,
  preventConflictingRates,
  revalidateRateCardsAfterChange,
  revalidateRateCardsAfterDelete,
  validateRateCardDates,
} from '../hooks/rate-card-hooks';

export const RateCards: CollectionConfig = {
  slug: 'rate-cards',
  admin: {
    useAsTitle: 'title',
    group: 'Pricing',
    description:
      'Commercial tariffs and rate cards. Rate cards must be reconciled against Limo Anywhere before publishing.',
    defaultColumns: [
      'title',
      'vehicleClass',
      'pricingModel',
      'serviceScope',
      'effectiveFrom',
      'reconciliation.status',
      '_status',
    ],
  },
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
  access: {
    read: rateCardPublicRead,
    create: rateCardWrite,
    update: rateCardWrite,
    delete: rateCardDelete,
    readVersions: rateCardWrite,
  },
  hooks: {
    beforeChange: [validateRateCardDates, preventConflictingRates, enforceReconciliationGate],
    afterChange: [revalidateRateCardsAfterChange],
    afterDelete: [revalidateRateCardsAfterDelete],
  },
  fields: [
    {
      name: 'title',
      label: 'Rate card title',
      type: 'text',
      required: true,
      admin: {
        description: 'Internal descriptive title (e.g. "2026 Executive Sedan Airport Transfer Tariff").',
      },
    },
    {
      name: 'vehicleClass',
      label: 'Vehicle class',
      type: 'relationship',
      relationTo: 'vehicle-classes',
      required: true,
      index: true,
      admin: {
        description: 'The vehicle pricing class this rate applies to.',
      },
    },
    {
      name: 'serviceScope',
      label: 'Tariff scope',
      type: 'radio',
      required: true,
      defaultValue: 'global',
      options: [
        { label: 'Global Tariff (Default across all general services)', value: 'global' },
        { label: 'Service-Specific Tariff (Explicitly overrides global for selected services)', value: 'service_specific' },
      ],
      admin: {
        description: 'Global tariffs serve as general fallbacks; service-specific tariffs take priority.',
      },
    },
    {
      name: 'services',
      label: 'Applicable services',
      type: 'relationship',
      relationTo: 'services',
      hasMany: true,
      admin: {
        condition: (data) => data?.serviceScope === 'service_specific',
        description: 'Select services where this specific rate card applies and shadows the global tariff.',
      },
    },
    {
      name: 'pricingModel',
      label: 'Pricing model',
      type: 'select',
      required: true,
      options: [
        { label: 'Fixed Route / Airport Transfer', value: 'fixed' },
        { label: 'Hourly Charter (As-Directed)', value: 'hourly' },
        { label: 'Mileage-Based Travel (Distance & Time)', value: 'mileage' },
        { label: 'Custom / Bespoke Itinerary', value: 'custom' },
      ],
      admin: {
        description: 'Select the commercial pricing structure for this card.',
      },
    },
    {
      name: 'effectiveFrom',
      label: 'Effective from (Activation timestamp)',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Tariff goes live publicly on or after this timestamp. Leave blank for immediate upon publish.',
      },
    },
    {
      name: 'effectiveTo',
      label: 'Effective to (Expiration timestamp)',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
        description: 'Tariff ceases to display publicly after this timestamp. Leave blank for indefinite.',
      },
    },
    {
      name: 'currency',
      label: 'Currency',
      type: 'text',
      defaultValue: 'USD',
      maxLength: 3,
      admin: {
        position: 'sidebar',
        description: 'ISO-4217 three-letter currency code (e.g. USD).',
      },
    },

    // ── FIXED ROUTE MODEL ───────────────────────────────────────────────────
    {
      name: 'routes',
      label: 'Fixed route rate table',
      type: 'array',
      admin: {
        condition: (data) => data?.pricingModel === 'fixed',
        description: 'Pre-set point-to-point and airport transfer rates.',
      },
      fields: [
        {
          name: 'routeLabel',
          label: 'Route label',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "JFK Airport to Manhattan (All Zones)"' },
        },
        {
          name: 'originZone',
          label: 'Origin zone',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "JFK Airport", "LaGuardia", "Manhattan Midtown"' },
        },
        {
          name: 'destinationZone',
          label: 'Destination zone',
          type: 'text',
          required: true,
          admin: { description: 'e.g. "Manhattan (South of 96th)", "Brooklyn Downtown"' },
        },
        {
          name: 'originLocation',
          label: 'Linked origin location (Optional)',
          type: 'relationship',
          relationTo: 'locations',
        },
        {
          name: 'destinationLocation',
          label: 'Linked destination location (Optional)',
          type: 'relationship',
          relationTo: 'locations',
        },
        {
          name: 'flatRate',
          label: 'Base flat rate ($)',
          type: 'number',
          required: true,
          min: 0,
          admin: { description: 'Standard point-to-point flat fare in USD.' },
        },
        {
          name: 'additionalStopFee',
          label: 'Additional stop fee ($)',
          type: 'number',
          min: 0,
          defaultValue: 25,
          admin: { description: 'Charge per en-route passenger stop.' },
        },
        {
          name: 'notes',
          label: 'Route specific notes',
          type: 'text',
        },
      ],
    },

    // ── HOURLY CHARTER MODEL ────────────────────────────────────────────────
    {
      name: 'hourly',
      label: 'Hourly charter terms',
      type: 'group',
      admin: {
        condition: (data) => data?.pricingModel === 'hourly',
      },
      fields: [
        {
          name: 'hourlyRate',
          label: 'Hourly rate ($/hr)',
          type: 'number',
          required: true,
          min: 0,
        },
        {
          name: 'minimumHours',
          label: 'Minimum booking hours',
          type: 'number',
          required: true,
          min: 1,
          defaultValue: 2,
        },
        {
          name: 'additionalHourRate',
          label: 'Additional hour rate ($/hr)',
          type: 'number',
          min: 0,
          admin: { description: 'Rate for hours beyond minimum. Defaults to base hourly rate if blank.' },
        },
        {
          name: 'overtimeIncrementMinutes',
          label: 'Overtime billing increment (Minutes)',
          type: 'number',
          defaultValue: 15,
          min: 1,
        },
        {
          name: 'overtimeRate',
          label: 'Overtime hourly rate ($/hr)',
          type: 'number',
          min: 0,
        },
      ],
    },

    // ── MILEAGE BASED MODEL ─────────────────────────────────────────────────
    {
      name: 'mileage',
      label: 'Mileage formula parameters',
      type: 'group',
      admin: {
        condition: (data) => data?.pricingModel === 'mileage',
        description: 'Core parameters for informational formula breakdowns and quote calculations.',
      },
      fields: [
        {
          name: 'baseFare',
          label: 'Base flag drop fare ($)',
          type: 'number',
          required: true,
          min: 0,
          admin: { description: 'Initial vehicle dispatch fee.' },
        },
        {
          name: 'perMileRate',
          label: 'Rate per mile ($/mi)',
          type: 'number',
          required: true,
          min: 0,
          admin: { description: 'Exact billable rate per route mile.' },
        },
        {
          name: 'minimumFare',
          label: 'Minimum trip fare ($)',
          type: 'number',
          required: true,
          min: 0,
          admin: { description: 'Absolute trip minimum floor.' },
        },
        {
          name: 'perMinuteRate',
          label: 'Transit time rate ($/min)',
          type: 'number',
          min: 0,
          admin: { description: 'Minute rate for elapsed metropolitan traffic transit.' },
        },
        {
          name: 'deadheadThresholdMiles',
          label: 'Deadhead allowance threshold (Miles)',
          type: 'number',
          defaultValue: 35,
          min: 0,
          admin: { description: 'Company policy: Free miles before empty return billing starts.' },
        },
        {
          name: 'deadheadRatePerMile',
          label: 'Deadhead rate per mile ($/mi)',
          type: 'number',
          min: 0,
          admin: { description: 'Repositioning rate charged per mile beyond threshold.' },
        },
        {
          name: 'complimentaryWaitMinutes',
          label: 'Complimentary wait time (Minutes)',
          type: 'number',
          defaultValue: 15,
        },
        {
          name: 'waitingRatePerHour',
          label: 'Waiting time rate ($/hr)',
          type: 'number',
          min: 0,
        },
      ],
    },

    // ── EDITABLE COMPANY COMMERCIAL POLICIES ────────────────────────────────
    {
      name: 'commercialPolicies',
      label: 'Company commercial service policies',
      type: 'group',
      admin: {
        description:
          'Editable company operational policies (not statutory TLC mandates). Adjust as commercial conditions require.',
      },
      fields: [
        {
          name: 'curbsideGraceMinutes',
          label: 'Standard curbside grace minutes',
          type: 'number',
          defaultValue: 15,
          min: 0,
          admin: { description: 'Complimentary wait time for standard residential/hotel pickups.' },
        },
        {
          name: 'domesticAirportGraceMinutes',
          label: 'Domestic flight arrival grace minutes',
          type: 'number',
          defaultValue: 30,
          min: 0,
          admin: { description: 'Complimentary wait time tracked from airline wheels-down.' },
        },
        {
          name: 'internationalAirportGraceMinutes',
          label: 'International flight arrival grace minutes',
          type: 'number',
          defaultValue: 60,
          min: 0,
          admin: { description: 'Complimentary customs and baggage allowance from wheels-down.' },
        },
        {
          name: 'waitingHourlyRate',
          label: 'Excess wait time hourly rate ($/hr)',
          type: 'number',
          min: 0,
          admin: { description: 'Hourly rate charged when grace period is exceeded.' },
        },
        {
          name: 'waitingIncrementMinutes',
          label: 'Wait billing increment (Minutes)',
          type: 'number',
          defaultValue: 15,
          min: 1,
        },
        {
          name: 'lateNightSurcharge',
          label: 'Late night dispatch supplement ($)',
          type: 'number',
          defaultValue: 25,
          min: 0,
          admin: { description: 'Nighttime operational surcharge.' },
        },
        {
          name: 'lateNightWindowStart',
          label: 'Late night window start (HH:mm)',
          type: 'text',
          defaultValue: '23:00',
        },
        {
          name: 'lateNightWindowEnd',
          label: 'Late night window end (HH:mm)',
          type: 'text',
          defaultValue: '05:00',
        },
        {
          name: 'deadheadPolicyNote',
          label: 'Deadhead policy disclosure',
          type: 'text',
          admin: { description: 'e.g. "Trips originating >35 miles outside NYC incur repositioning fees."' },
        },
      ],
    },

    // ── FEE & STATUTORY SURCHARGE RULES ─────────────────────────────────────
    {
      name: 'applicableFees',
      label: 'Applicable fees and surcharges',
      type: 'array',
      admin: {
        description: 'Itemized statutory and commercial fees with explicit applicability rules.',
      },
      fields: [
        {
          name: 'feeIdentifier',
          label: 'Fee code',
          type: 'select',
          required: true,
          options: [
            { label: 'NYS Congestion Surcharge ($2.75 Tax Law § 1281)', value: 'nys_congestion_surcharge' },
            { label: 'MTA CBD Congestion Tolling (South of 60th St)', value: 'mta_cbd_tolling' },
            { label: 'Port Authority Airport Access Fee', value: 'panynj_airport_access' },
            { label: 'Commercial Crossings Tolls (EZPass Actual)', value: 'commercial_tolls' },
            { label: 'Additional En-Route Stop Fee', value: 'additional_stop' },
            { label: 'Child Safety Equipment Option', value: 'child_safety_seat' },
            { label: 'VIP Meet & Greet Service', value: 'vip_meet_and_greet' },
            { label: 'Custom Surcharge', value: 'custom_surcharge' },
          ],
        },
        {
          name: 'feeName',
          label: 'Fee display title',
          type: 'text',
          required: true,
        },
        {
          name: 'feeCategory',
          label: 'Fee category',
          type: 'select',
          required: true,
          options: [
            { label: 'Statutory Regulatory Mandate', value: 'statutory_mandate' },
            { label: 'Airport Authority Access Fee', value: 'airport_authority' },
            { label: 'Pass-Through Commercial Toll', value: 'toll_pass_through' },
            { label: 'Company Operating Policy', value: 'company_policy' },
            { label: 'Passenger Optional Add-on', value: 'passenger_option' },
          ],
        },
        {
          name: 'triggerCondition',
          label: 'Applicability trigger condition',
          type: 'select',
          required: true,
          options: [
            { label: 'Manhattan South of 96th St (NYS Tax Law § 1281)', value: 'nyc_manhattan_south_96' },
            { label: 'Manhattan CBD Entry South of 60th St (MTA CBD)', value: 'mta_cbd_entry_south_60' },
            { label: 'Airport Pickup or Dropoff', value: 'airport_origin_or_destination' },
            { label: 'Incurred Bridge / Tunnel Crossing', value: 'crossing_tolls_actual' },
            { label: 'Late Night Window (23:00 - 05:00)', value: 'late_night_window' },
            { label: 'Always Mandatory', value: 'always_mandatory' },
            { label: 'On-Demand Passenger Request', value: 'on_demand_request' },
          ],
        },
        {
          name: 'billingType',
          label: 'Billing calculation type',
          type: 'select',
          required: true,
          options: [
            { label: 'Fixed Dollar Amount', value: 'flat' },
            { label: 'Percentage of Base Fare', value: 'percentage' },
            { label: 'Actual Incurred Pass-Through', value: 'pass_through_actual' },
          ],
        },
        {
          name: 'amount',
          label: 'Fee amount ($ or %)',
          type: 'number',
          min: 0,
        },
        {
          name: 'customerDisclosure',
          label: 'Customer disclosure explanation',
          type: 'text',
          required: true,
        },
      ],
    },

    // ── FARE INCLUSIONS ─────────────────────────────────────────────────────
    {
      name: 'fareInclusions',
      label: 'Complimentary fare inclusions',
      type: 'array',
      fields: [
        {
          name: 'item',
          label: 'Included item',
          type: 'text',
          required: true,
        },
      ],
    },

    // ── RECONCILIATION & AUDIT GATE ─────────────────────────────────────────
    {
      name: 'reconciliation',
      label: 'Limo Anywhere reconciliation audit',
      type: 'group',
      admin: {
        position: 'sidebar',
        description: 'Mandatory reconciliation gate before public activation.',
      },
      fields: [
        {
          name: 'status',
          label: 'Reconciliation lifecycle state',
          type: 'select',
          required: true,
          defaultValue: 'draft',
          options: [
            { label: '1. Draft', value: 'draft' },
            { label: '2. Under Internal Review', value: 'internal_review' },
            { label: '3. Pending LA Verification', value: 'la_pending_verification' },
            { label: '4. LA Verified & Reconciled', value: 'la_verified' },
            { label: '5. Published / Active', value: 'published' },
            { label: '6. Archived', value: 'archived' },
          ],
        },
        {
          name: 'laReferenceCode',
          label: 'Limo Anywhere reference code',
          type: 'text',
          admin: {
            description: 'Rate Matrix ID, Fixed Rate Table Code, or Verification Quote #.',
          },
        },
        {
          name: 'reconciliationNotes',
          label: 'Verification test quote notes',
          type: 'textarea',
          admin: {
            description: 'Audit log detailing the test reservation quote executed in LA.',
          },
        },
        {
          name: 'verificationScreenshot',
          label: 'Verification proof (Optional)',
          type: 'upload',
          relationTo: 'media',
          admin: {
            description: 'Optional screenshot or PDF export of the verified Limo Anywhere test quote.',
          },
        },
        {
          name: 'verifiedBy',
          label: 'Verified by administrator',
          type: 'relationship',
          relationTo: 'users',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'verifiedAt',
          label: 'Verification timestamp',
          type: 'date',
          admin: {
            readOnly: true,
            date: { pickerAppearance: 'dayAndTime' },
          },
        },
      ],
    },
  ],
};
