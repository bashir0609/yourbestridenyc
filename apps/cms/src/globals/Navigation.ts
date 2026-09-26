import type { Field, GlobalConfig } from 'payload';
import { editorialWrite, publicRead } from '../access';
import { navigationURL } from '../validation';

const linkFields: Field[] = [
  { name: 'label', type: 'text', required: true },
  {
    name: 'href',
    type: 'text',
    required: true,
    validate: navigationURL,
    admin: { description: 'Root-relative path such as /services, or an absolute HTTPS URL.' },
  },
  { name: 'newTab', type: 'checkbox', defaultValue: false },
];

export const Navigation: GlobalConfig = {
  slug: 'navigation',
  access: { read: publicRead, update: editorialWrite },
  fields: [{ name: 'links', type: 'array', maxRows: 12, fields: linkFields }],
};

export const Footer: GlobalConfig = {
  slug: 'footer',
  access: { read: publicRead, update: editorialWrite },
  fields: [
    { name: 'description', type: 'textarea' },
    {
      name: 'columns',
      type: 'array',
      maxRows: 4,
      fields: [
        { name: 'heading', type: 'text', required: true },
        { name: 'links', type: 'array', maxRows: 12, fields: linkFields },
      ],
    },
    { name: 'legalLinks', type: 'array', maxRows: 8, fields: linkFields },
    { name: 'copyright', type: 'text' },
  ],
};
