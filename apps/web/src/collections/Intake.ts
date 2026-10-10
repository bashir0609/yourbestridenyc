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
  { name: 'phone', type: 'text', maxLength: 40 },
];

const sourceFields: Field[] = [
  {
    name: 'source',
    type: 'select',
    required: true,
    index: true,
    options: ['public-intake', 'staff', 'import'],
  },
  { name: 'sourcePage', type: 'text', required: true, maxLength: 2048 },
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
    {
      name: 'serviceType',
      type: 'text',
      required: true,
      maxLength: 60,
      admin: { description: 'Uses “Contact” for general contact messages.' },
    },
    {
      name: 'pickupLocation',
      type: 'text',
      admin: {
        description: 'Required for transportation inquiries; blank for general contact messages.',
      },
    },
    {
      name: 'dropoffLocation',
      type: 'text',
      admin: {
        description: 'Required for transportation inquiries; blank for general contact messages.',
      },
    },
    { name: 'pickupAt', type: 'date' },
    { name: 'preferredDate', type: 'text', maxLength: 20 },
    { name: 'preferredTime', type: 'text', maxLength: 20 },
    { name: 'passengers', type: 'number', min: 1 },
    { name: 'message', type: 'textarea' },
    ...sourceFields,
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

export const PublicIntakeRateLimits: CollectionConfig = {
  slug: 'public-intake-rate-limits',
  admin: { hidden: true },
  access: {
    create: () => false,
    read: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    { name: 'claimKey', type: 'text', required: true, unique: true, index: true },
    { name: 'fingerprint', type: 'text', required: true, index: true, maxLength: 64 },
    { name: 'windowStartedAt', type: 'date', required: true, index: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
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
    { name: 'drivingExperience', type: 'textarea', required: true, maxLength: 2000 },
    { name: 'licenseClass', type: 'text', required: true, maxLength: 60 },
    { name: 'serviceAreas', type: 'relationship', relationTo: 'locations', hasMany: true },
    { name: 'availability', type: 'textarea', required: true, maxLength: 500 },
    { name: 'message', type: 'textarea' },
    ...sourceFields,
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
