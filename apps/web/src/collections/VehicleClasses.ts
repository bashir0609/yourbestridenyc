import type { CollectionConfig } from 'payload';
import { editorialAccess, editorialVersions, slugField } from './shared';
import { createPublicRevalidationHooks } from '../lib/cms/path-revalidation';

export const VehicleClasses: CollectionConfig = {
  slug: 'vehicle-classes',
  admin: {
    useAsTitle: 'name',
    group: 'Pricing',
    description:
      'Fleet pricing tiers and vehicle classes. Fleet vehicles link to a class to inherit published rate cards.',
    defaultColumns: ['name', 'tier', 'passengerCapacity', 'luggageCapacity', 'displayOrder', '_status'],
  },
  versions: editorialVersions,
  access: editorialAccess,
  hooks: createPublicRevalidationHooks('vehicle-classes'),
  fields: [
    {
      name: 'name',
      label: 'Vehicle class name',
      type: 'text',
      required: true,
      maxLength: 100,
      admin: {
        description: 'Commercial class name (e.g. "Executive Sedan", "Luxury SUV", "Executive Jet Sprinter").',
      },
    },
    slugField,
    {
      name: 'tier',
      label: 'Vehicle tier',
      type: 'select',
      required: true,
      options: [
        { label: 'Executive Sedan', value: 'executive_sedan' },
        { label: 'Luxury Sedan', value: 'luxury_sedan' },
        { label: 'Full-Size Luxury SUV', value: 'fullsize_suv' },
        { label: 'Executive Sprinter Van', value: 'executive_sprinter' },
        { label: 'Mini Bus / Motor Coach', value: 'minibus_coach' },
        { label: 'Specialty / Other', value: 'other' },
      ],
      admin: {
        description: 'Standardized fleet tier for tariff grouping.',
      },
    },
    {
      name: 'passengerCapacity',
      label: 'Passenger capacity',
      type: 'number',
      required: true,
      min: 1,
      max: 100,
      admin: {
        description: 'Standard comfortable passenger seating capacity.',
      },
    },
    {
      name: 'luggageCapacity',
      label: 'Luggage capacity',
      type: 'number',
      min: 0,
      max: 100,
      admin: {
        description: 'Standard airline luggage capacity (pieces).',
      },
    },
    {
      name: 'summary',
      label: 'Public summary',
      type: 'textarea',
      maxLength: 300,
      admin: {
        description: 'Brief commercial description displayed on public rate comparison tables.',
      },
    },
    {
      name: 'image',
      label: 'Class representative photo',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description: 'High-resolution marketing image representing this vehicle class.',
      },
    },
    {
      name: 'displayOrder',
      label: 'Display sort order',
      type: 'number',
      defaultValue: 0,
      admin: {
        position: 'sidebar',
        description: 'Sort order hint for comparison tables (lowest number first).',
      },
    },
    {
      name: 'featured',
      label: 'Featured class',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Highlight this class as a recommended choice.',
      },
    },
  ],
};
