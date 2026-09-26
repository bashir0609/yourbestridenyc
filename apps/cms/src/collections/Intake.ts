import type { CollectionConfig, Field } from 'payload';
import { intakeAccess, isAdmin } from '../access';

const access: CollectionConfig['access'] = {
  create: isAdmin,
  read: intakeAccess,
  update: intakeAccess,
  delete: isAdmin,
};

const contactFields: Field[] = [
  { name: 'name', type: 'text', required: true },
  { name: 'email', type: 'email', required: true },
  { name: 'phone', type: 'text', required: true },
];

const reviewFields: Field[] = [
  {
    name: 'assignedTo',
    type: 'relationship',
    relationTo: 'users',
    index: true,
    filterOptions: { role: { in: ['admin', 'lead-manager'] } },
    admin: {
      description:
        'Administrators can choose any reviewer; lead managers can see only their own user record.',
    },
  },
  { name: 'sourceCampaign', type: 'text', index: true, maxLength: 200 },
  { name: 'consentToContact', type: 'checkbox', required: true, defaultValue: false },
  { name: 'consentRecordedAt', type: 'date' },
  { name: 'internalNotes', type: 'textarea' },
];

export const TransportationLeads: CollectionConfig = {
  slug: 'transportation-leads',
  admin: {
    useAsTitle: 'name',
    group: 'Private intake',
    defaultColumns: ['name', 'crmStatus', 'assignedTo', 'createdAt'],
    description:
      'Private inquiries, not reservations. Do not collect diagnoses, insurance details, or medical records. No public submission endpoint.',
  },
  access,
  fields: [
    ...contactFields,
    { name: 'service', type: 'relationship', relationTo: 'services' },
    { name: 'pickupLocation', type: 'text', required: true },
    { name: 'dropoffLocation', type: 'text', required: true },
    { name: 'pickupAt', type: 'date' },
    { name: 'passengers', type: 'number', min: 1 },
    { name: 'message', type: 'textarea' },
    {
      name: 'crmStatus',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: ['new', 'contacted', 'qualified', 'booked', 'lost', 'archived'],
    },
    {
      name: 'externalLeadId',
      type: 'text',
      index: true,
      maxLength: 200,
      admin: {
        description: 'Optional external CRM reference; not a uniqueness or idempotency guarantee.',
      },
    },
    ...reviewFields,
  ],
};

export const DriverApplications: CollectionConfig = {
  slug: 'driver-applications',
  admin: {
    useAsTitle: 'name',
    group: 'Private intake',
    defaultColumns: ['name', 'status', 'assignedTo', 'createdAt'],
    description: 'Private recruitment review. Do not put applicant documents in public Media.',
  },
  access,
  fields: [
    ...contactFields,
    { name: 'city', type: 'text', required: true },
    { name: 'yearsExperience', type: 'number', min: 0, max: 80 },
    { name: 'serviceAreas', type: 'relationship', relationTo: 'locations', hasMany: true },
    { name: 'availability', type: 'textarea' },
    { name: 'message', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'new',
      index: true,
      options: ['new', 'reviewing', 'interview', 'accepted', 'rejected', 'archived'],
    },
    ...reviewFields,
  ],
};
