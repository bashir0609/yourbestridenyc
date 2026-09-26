import type { CollectionConfig, Field } from 'payload';
import { editorialRead, editorialWrite } from '../access';
import { slugValue } from '../validation';

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
  type: 'group',
  fields: [
    { name: 'title', type: 'text', maxLength: 70 },
    { name: 'description', type: 'textarea', maxLength: 200 },
    { name: 'image', type: 'upload', relationTo: 'media' },
  ],
};

export const faqField: Field = {
  name: 'faqs',
  type: 'array',
  maxRows: 20,
  fields: [
    { name: 'question', type: 'text', required: true, maxLength: 200 },
    { name: 'answer', type: 'textarea', required: true, maxLength: 2000 },
  ],
};

export const displayFields: Field[] = [
  { name: 'featured', type: 'checkbox', defaultValue: false, index: true },
  { name: 'displayOrder', type: 'number', defaultValue: 0, min: 0, index: true },
];
