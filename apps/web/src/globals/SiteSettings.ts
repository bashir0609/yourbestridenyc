import type { GlobalConfig } from 'payload';
import { editorialWrite, publicRead } from '../access';
import { httpsURL } from '../validation';

export const SiteSettings: GlobalConfig = {
  slug: 'site-settings',
  label: 'Site settings',
  access: { read: publicRead, update: editorialWrite },
  fields: [
    { name: 'siteName', type: 'text', required: true, defaultValue: 'Your Best Ride Inc.' },
    { name: 'tagline', type: 'text' },
    { name: 'logo', type: 'upload', relationTo: 'media' },
    {
      name: 'bookingURL',
      type: 'text',
      required: true,
      validate: httpsURL,
      admin: {
        description:
          'Absolute HTTPS URL for the external booking provider. Public; never include secrets.',
      },
    },
    { name: 'publicEmail', type: 'email' },
    { name: 'publicPhone', type: 'text' },
    {
      name: 'defaultSEO',
      type: 'group',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
        { name: 'image', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
};
