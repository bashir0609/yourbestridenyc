import type { GlobalConfig } from 'payload';
import { editorialWrite, publicRead } from '../access';

export const PricingSettings: GlobalConfig = {
  slug: 'pricing-settings',
  admin: {
    group: 'Pricing',
    description: 'Global pricing presentation defaults, universal tariff disclosures, and default policies.',
  },
  access: {
    read: publicRead,
    update: editorialWrite,
  },
  fields: [
    {
      name: 'currency',
      label: 'Default currency',
      type: 'select',
      defaultValue: 'USD',
      options: ['USD', 'CAD', 'EUR', 'GBP'],
    },
    {
      name: 'defaultTaxNote',
      label: 'Default tax disclosure',
      type: 'text',
      defaultValue: 'Rates exclude local sales tax where applicable.',
      admin: {
        description: 'Standard disclosure line for tariff cards.',
      },
    },
    {
      name: 'affiliateTariffNote',
      label: 'Universal affiliate tariff guarantee',
      type: 'textarea',
      defaultValue:
        'Your Best Ride maintains a single universal customer tariff. All chauffeured rides fulfilled through our certified affiliate network are billed at published company rates.',
      admin: {
        description: 'Mandatory transparency disclosure for hybrid own-fleet and affiliate fulfillment.',
      },
    },
    {
      name: 'generalDisclosure',
      label: 'General booking & tariff disclosures',
      type: 'richText',
      admin: {
        description: 'Comprehensive legal and commercial terms displayed on public pricing comparison views.',
      },
    },
    {
      name: 'globalInclusions',
      label: 'Standard service inclusions',
      type: 'array',
      admin: {
        description: 'Amenities included on all bookings regardless of vehicle class.',
      },
      fields: [
        {
          name: 'item',
          label: 'Included amenity / service',
          type: 'text',
          required: true,
        },
      ],
    },
    {
      name: 'pricingLastReviewedAt',
      label: 'Pricing tariff last reviewed date',
      type: 'date',
      admin: {
        description: 'Compliance timestamp marking executive review of current tariff rates.',
      },
    },
    {
      name: 'defaultCommercialPolicies',
      label: 'Default operational policies',
      type: 'group',
      admin: {
        description: 'Fallback operational parameters when not explicitly overridden on a rate card.',
      },
      fields: [
        {
          name: 'defaultCurbsideGraceMinutes',
          label: 'Default curbside grace minutes',
          type: 'number',
          defaultValue: 15,
          min: 0,
        },
        {
          name: 'defaultDomesticAirportGraceMinutes',
          label: 'Default domestic airport grace minutes',
          type: 'number',
          defaultValue: 30,
          min: 0,
        },
        {
          name: 'defaultInternationalAirportGraceMinutes',
          label: 'Default international airport grace minutes',
          type: 'number',
          defaultValue: 60,
          min: 0,
        },
        {
          name: 'defaultDeadheadThresholdMiles',
          label: 'Default deadhead threshold (Miles)',
          type: 'number',
          defaultValue: 35,
          min: 0,
        },
        {
          name: 'defaultLateNightWindowStart',
          label: 'Default late night start (HH:mm)',
          type: 'text',
          defaultValue: '23:00',
        },
        {
          name: 'defaultLateNightWindowEnd',
          label: 'Default late night end (HH:mm)',
          type: 'text',
          defaultValue: '05:00',
        },
      ],
    },
  ],
};
