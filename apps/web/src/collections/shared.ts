import type { CollectionConfig, Field } from 'payload';
import { editorialRead, editorialWrite } from '../access';
import { slugValue } from '../validation';

export const optionalWholeNumber = (value: unknown): true | string =>
  value === undefined ||
  value === null ||
  (typeof value === 'number' && Number.isSafeInteger(value))
    ? true
    : 'Enter a whole number.';

// Unnamed sections organize the admin without nesting existing API fields.
export const editorialSection = (label: string, fields: Field[]): Field => ({
  type: 'collapsible',
  label,
  fields,
});

export const developmentSeedField: Field = {
  name: 'developmentSeed',
  label: 'Development seed content',
  type: 'checkbox',
  defaultValue: false,
  admin: {
    position: 'sidebar',
    description:
      'Marks development fixtures, not approved public content. Seed scripts must save these records as drafts (_status: draft). This marker does not itself prevent publication; review and replace sample content before publishing.',
  },
};

export const bookingCTAField: Field = {
  name: 'bookingCTA',
  label: 'Booking call to action',
  type: 'group',
  admin: {
    description:
      'Optional button text. Destination always uses the configured Limo Anywhere handoff through /book; no per-service URL overrides.',
  },
  fields: [
    {
      name: 'label',
      label: 'Button text',
      type: 'text',
      maxLength: 80,
      admin: { description: 'Leave blank to use the default booking button text.' },
    },
  ],
};

export const editorialAccess: CollectionConfig['access'] = {
  create: editorialWrite,
  read: editorialRead,
  update: editorialWrite,
  delete: editorialWrite,
  readVersions: editorialWrite,
};

export const editorialVersions: CollectionConfig['versions'] = {
  drafts: true,
  maxPerDoc: 30,
};

export const slugField: Field = {
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  index: true,
  validate: slugValue,
  admin: { description: 'Stable public URL identifier. Coordinate redirects before changing it.' },
};

export const seoFields: Field = {
  name: 'seo',
  label: 'Search engine optimization',
  type: 'group',
  admin: {
    description: 'Optional search and social sharing overrides. Keep copy specific to this page.',
  },
  fields: [
    {
      name: 'title',
      label: 'SEO title',
      type: 'text',
      maxLength: 70,
      admin: { description: 'Aim for 50–60 characters; maximum 70.' },
    },
    {
      name: 'description',
      label: 'Meta description',
      type: 'textarea',
      maxLength: 200,
      admin: { description: 'Aim for 140–160 characters; maximum 200.' },
    },
    { name: 'image', label: 'Social sharing image', type: 'upload', relationTo: 'media' },
  ],
};

export const faqField: Field = {
  name: 'faqs',
  label: 'Frequently asked questions',
  type: 'array',
  labels: { singular: 'FAQ', plural: 'FAQs' },
  admin: {
    description: 'Public questions and plain-text answers, shown in the order entered. Maximum 20.',
  },
  maxRows: 20,
  fields: [
    { name: 'question', type: 'text', required: true, maxLength: 200 },
    { name: 'answer', type: 'textarea', required: true, maxLength: 2000 },
  ],
};

export const displayFields: Field[] = [
  {
    name: 'featured',
    label: 'Featured content',
    type: 'checkbox',
    defaultValue: false,
    index: true,
    admin: {
      position: 'sidebar',
      description: 'Eligible for featured website placements; does not publish a draft.',
    },
  },
  {
    name: 'displayOrder',
    label: 'Display order',
    type: 'number',
    defaultValue: 0,
    min: 0,
    index: true,
    validate: optionalWholeNumber,
    admin: {
      position: 'sidebar',
      description:
        'Non-negative whole number. Lower numbers appear first where ordered lists are used.',
    },
  },
];
