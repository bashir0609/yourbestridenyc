import type { CollectionConfig } from 'payload';
import {
  displayFields,
  editorialAccess,
  editorialVersions,
  faqField,
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
  admin: { useAsTitle: 'title', group: 'Editorial' },
  access: editorialAccess,
  versions: editorialVersions,
  fields: [
    { name: 'title', type: 'text', required: true },
    slugField,
    { name: 'summary', type: 'textarea', required: true },
    { name: 'image', type: 'upload', relationTo: 'media' },
    { name: 'content', type: 'richText' },
    {
      name: 'benefits',
      type: 'array',
      maxRows: 12,
      fields: [
        { name: 'title', type: 'text', required: true, maxLength: 100 },
        { name: 'description', type: 'textarea', maxLength: 1000 },
      ],
    },
    {
      name: 'features',
      type: 'array',
      maxRows: 20,
      fields: [{ name: 'feature', type: 'text', required: true, maxLength: 200 }],
    },
    faqField,
    { name: 'serviceAreas', type: 'relationship', relationTo: 'locations', hasMany: true },
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
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField,
    { name: 'photo', type: 'upload', relationTo: 'media' },
    { name: 'summary', type: 'textarea', required: true, maxLength: 300 },
    {
      name: 'websiteApproved',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Confirm permission to publish this marketing profile.' },
    },
    { name: 'bio', type: 'richText', required: true },
    {
      name: 'experience',
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
    { name: 'serviceAreas', type: 'relationship', relationTo: 'locations', hasMany: true },
    {
      name: 'specialties',
      type: 'array',
      fields: [{ name: 'specialty', type: 'text', required: true }],
    },
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
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField,
    {
      name: 'category',
      type: 'select',
      required: true,
      options: ['sedan', 'suv', 'van', 'minibus', 'coach', 'other'],
    },
    { name: 'passengerCapacity', type: 'number', required: true, min: 1, max: 100 },
    { name: 'summary', type: 'textarea', required: true, maxLength: 300 },
    { name: 'luggageCapacity', type: 'number', min: 0 },
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
      type: 'array',
      fields: [{ name: 'image', type: 'upload', relationTo: 'media', required: true }],
    },
    {
      name: 'amenities',
      type: 'array',
      fields: [{ name: 'amenity', type: 'text', required: true }],
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
  admin: { useAsTitle: 'name', group: 'Editorial' },
  access: editorialAccess,
  versions: editorialVersions,
  fields: [
    { name: 'name', type: 'text', required: true },
    slugField,
    { name: 'city', type: 'text', required: true },
    { name: 'summary', type: 'textarea', required: true, maxLength: 300 },
    { name: 'region', type: 'text' },
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
    { name: 'description', type: 'richText' },
    {
      name: 'coverageAreas',
      type: 'array',
      maxRows: 30,
      fields: [{ name: 'area', type: 'text', required: true, maxLength: 150 }],
    },
    faqField,
    { name: 'image', type: 'upload', relationTo: 'media' },
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
