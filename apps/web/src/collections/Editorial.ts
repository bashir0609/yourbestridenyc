import type { CollectionConfig } from 'payload';
import { createPublicRevalidationHooks } from '../lib/cms/path-revalidation';
import {
  bookingCTAField,
  developmentSeedField,
  displayFields,
  editorialAccess,
  editorialSection,
  editorialVersions,
  faqField,
  optionalWholeNumber,
  pricingDisplayField,
  seoFields,
  slugField,
} from './shared';

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title', group: 'Editorial' },
  access: editorialAccess,
  versions: editorialVersions,
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField,
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'summary', type: 'textarea' },
    { name: 'content', type: 'richText', required: true },
    seoFields,
  ],
};

export const Services: CollectionConfig = {
  slug: 'services',
  admin: {
    useAsTitle: 'title',
    group: 'Editorial',
    description: 'Public service information and booking links, not booking operations.',
    defaultColumns: ['title', 'slug', '_status', 'featured'],
  },
  access: editorialAccess,
  versions: editorialVersions,
  hooks: createPublicRevalidationHooks('services'),
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField,
    developmentSeedField,
    editorialSection('Hero and overview', [
      {
        name: 'summary',
        label: 'Hero summary',
        type: 'textarea',
        required: true,
        maxLength: 300,
        admin: { description: 'Short public introduction used in the hero and service cards.' },
      },
      { name: 'image', label: 'Hero image', type: 'upload', relationTo: 'media' },
      { name: 'content', label: 'Service overview', type: 'richText', required: true },
    ]),
    editorialSection('Benefits and features', [
      {
        name: 'benefits',
        label: 'Customer benefits',
        type: 'array',
        admin: { description: 'Explain customer outcomes, not unverified promises. Maximum 12.' },
        maxRows: 12,
        fields: [
          { name: 'title', type: 'text', required: true, maxLength: 100 },
          { name: 'description', type: 'textarea', maxLength: 1000 },
        ],
      },
      {
        name: 'features',
        label: 'Service features',
        type: 'array',
        admin: { description: 'Short, verified inclusions. Maximum 20.' },
        maxRows: 20,
        fields: [{ name: 'feature', type: 'text', required: true, maxLength: 200 }],
      },
    ]),
    faqField,
    {
      name: 'serviceAreas',
      label: 'Related locations',
      type: 'relationship',
      relationTo: 'locations',
      hasMany: true,
      admin: {
        description:
          'Select locations where this service is offered. Publish related locations before linking publicly.',
      },
    },
    bookingCTAField,
    pricingDisplayField,
    ...displayFields,
    seoFields,
  ],
};

export const Drivers: CollectionConfig = {
  slug: 'drivers',
  admin: {
    useAsTitle: 'name',
    group: 'Editorial',
    description:
      'Marketing profiles only. No contact details, licenses, background checks, or employment records.',
  },
  access: editorialAccess,
  versions: editorialVersions,
  hooks: createPublicRevalidationHooks('drivers'),
  fields: [
    {
      name: 'name',
      label: 'Public display name',
      type: 'text',
      required: true,
      maxLength: 120,
      admin: {
        description: 'Approved name for the website; do not enter private identity details.',
      },
    },
    slugField,
    editorialSection('Public profile', [
      { name: 'photo', label: 'Public profile photo', type: 'upload', relationTo: 'media' },
      {
        name: 'summary',
        label: 'Short biography',
        type: 'textarea',
        required: true,
        maxLength: 300,
      },
      {
        name: 'websiteApproved',
        type: 'checkbox',
        defaultValue: false,
        admin: { description: 'Confirm permission to publish this marketing profile.' },
      },
      { name: 'bio', label: 'Full biography', type: 'richText', required: true },
    ]),
    editorialSection('Experience and specialties', [
      {
        name: 'experienceYears',
        label: 'Years of experience',
        type: 'number',
        min: 0,
        max: 80,
        validate: optionalWholeNumber,
        admin: {
          description:
            'Optional verified whole years of experience (0–80). Leave blank if unknown.',
        },
      },
      {
        name: 'experience',
        label: 'Public experience summary',
        type: 'textarea',
        maxLength: 1500,
        admin: {
          description:
            'Approved public experience summary only; no private employment or trip records.',
        },
      },
      {
        name: 'languages',
        type: 'array',
        maxRows: 20,
        fields: [{ name: 'language', type: 'text', required: true, maxLength: 80 }],
      },
      {
        name: 'serviceAreas',
        label: 'Public service areas',
        type: 'relationship',
        relationTo: 'locations',
        hasMany: true,
        admin: { description: 'Marketing coverage only, not live location or availability.' },
      },
      {
        name: 'specialties',
        type: 'array',
        maxRows: 20,
        admin: { description: 'Approved public specialties only. Maximum 20.' },
        fields: [{ name: 'specialty', type: 'text', required: true, maxLength: 150 }],
      },
    ]),
    ...displayFields,
    seoFields,
  ],
};

export const FleetVehicles: CollectionConfig = {
  slug: 'fleet-vehicles',
  admin: {
    useAsTitle: 'name',
    group: 'Editorial',
    description: 'Public fleet marketing, not dispatch or vehicle registration records.',
  },
  access: editorialAccess,
  versions: editorialVersions,
  hooks: createPublicRevalidationHooks('fleet-vehicles'),
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField,
    {
      name: 'category',
      type: 'select',
      required: true,
      options: ['sedan', 'suv', 'van', 'minibus', 'coach', 'other'],
    },
    editorialSection('Capacity and vehicle details', [
      {
        name: 'passengerCapacity',
        label: 'Passenger capacity',
        type: 'number',
        required: true,
        min: 1,
        max: 100,
        validate: (value: unknown) =>
          typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 100
            ? true
            : 'Enter a whole passenger capacity from 1 to 100.',
        admin: { description: 'Verified passenger seats, excluding the driver.' },
      },
      { name: 'summary', type: 'textarea', required: true, maxLength: 300 },
      {
        name: 'luggageCapacity',
        label: 'Luggage capacity',
        type: 'number',
        min: 0,
        validate: optionalWholeNumber,
        admin: { description: 'Number of standard bags. Use 0 for none; leave blank if unknown.' },
      },
      { name: 'description', type: 'richText' },
      {
        name: 'accessibilityInformation',
        type: 'textarea',
        maxLength: 2000,
        admin: {
          description:
            'Verified accessibility information only. Do not imply equipment or assistance that has not been confirmed.',
        },
      },
      {
        name: 'images',
        label: 'Hero image and gallery',
        type: 'array',
        maxRows: 12,
        admin: {
          description:
            'The first image is the public hero/card image. Drag to reorder; up to 12 images.',
        },
        fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
      },
      {
        name: 'amenities',
        type: 'array',
        maxRows: 20,
        admin: { description: 'List only verified amenities for this vehicle. Maximum 20.' },
        fields: [{ name: 'amenity', type: 'text', required: true, maxLength: 150 }],
      },
    ]),
    {
      name: 'vehicleClass',
      label: 'Pricing vehicle class',
      type: 'relationship',
      relationTo: 'vehicle-classes',
      admin: {
        position: 'sidebar',
        description: 'Pricing class for this vehicle. Links this fleet model to published rate cards.',
      },
    },
    ...displayFields,
    seoFields,
  ],
};

export const Testimonials: CollectionConfig = {
  slug: 'testimonials',
  admin: {
    useAsTitle: 'attribution',
    group: 'Editorial',
    description: 'Publish only with permission; attribution is public.',
  },
  access: editorialAccess,
  versions: editorialVersions,
  hooks: createPublicRevalidationHooks('testimonials'),
  fields: [
    { name: 'attribution', type: 'text', required: true },
    slugField,
    {
      name: 'websiteApproved',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Confirm permission to publish this customer feedback.' },
    },
    { name: 'quote', type: 'textarea', required: true },
    { name: 'rating', type: 'number', min: 1, max: 5 },
    { name: 'service', type: 'relationship', relationTo: 'services' },
    ...displayFields,
  ],
};

export const Locations: CollectionConfig = {
  slug: 'locations',
  admin: {
    useAsTitle: 'name',
    group: 'Editorial',
    description: 'Public service-area pages, not dispatch zones or live coverage.',
    defaultColumns: ['name', 'city', '_status', 'developmentSeed'],
  },
  access: editorialAccess,
  versions: editorialVersions,
  hooks: createPublicRevalidationHooks('locations'),
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField,
    developmentSeedField,
    editorialSection('Location and introduction', [
      { name: 'city', type: 'text', required: true, maxLength: 120 },
      { name: 'summary', type: 'textarea', required: true, maxLength: 300 },
      { name: 'region', label: 'State or region', type: 'text', maxLength: 120 },
      {
        name: 'countryCode',
        type: 'text',
        required: true,
        minLength: 2,
        maxLength: 2,
        validate: (value: unknown) =>
          typeof value === 'string' && /^[A-Z]{2}$/.test(value)
            ? true
            : 'Use a two-letter uppercase country code.',
      },
      { name: 'description', label: 'Location introduction', type: 'richText', required: true },
      { name: 'image', label: 'Location hero image', type: 'upload', relationTo: 'media' },
    ]),
    editorialSection('Neighborhoods and services', [
      {
        name: 'coverageAreas',
        label: 'Neighborhoods and coverage areas',
        admin: { description: 'Verified neighborhoods and nearby areas served. Maximum 30.' },
        type: 'array',
        maxRows: 30,
        fields: [{ name: 'area', type: 'text', required: true, maxLength: 150 }],
      },
      {
        name: 'relatedServices',
        label: 'Related services',
        type: 'relationship',
        relationTo: 'services',
        hasMany: true,
        admin: {
          description:
            'Editorial service recommendations for this location. Keep consistent with each service’s related locations; this does not synchronize serviceAreas.',
        },
      },
    ]),
    faqField,
    ...displayFields,
    seoFields,
  ],
};

export const BlogPosts: CollectionConfig = {
  slug: 'blog-posts',
  admin: { useAsTitle: 'title', group: 'Editorial' },
  access: editorialAccess,
  versions: editorialVersions,
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField,
    { name: 'excerpt', type: 'textarea', required: true },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    // Public bylines do not expose private user accounts through relationships.
    { name: 'authorName', type: 'text', required: true },
    { name: 'publishedAt', type: 'date', required: true },
    { name: 'content', type: 'richText', required: true },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text', required: true }] },
    ...displayFields,
    seoFields,
  ],
};
