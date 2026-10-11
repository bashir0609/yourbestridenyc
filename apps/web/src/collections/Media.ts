import type { CollectionConfig } from 'payload';
import { editorialWrite, publicRead } from '../access';
import { mediaRevalidationHooks } from '../lib/cms/path-revalidation';

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    useAsTitle: 'alt',
    group: 'Editorial',
    description:
      'PUBLIC marketing images only. Never upload applications, licenses, resumes, or other private documents.',
  },
  access: {
    read: publicRead,
    create: editorialWrite,
    update: editorialWrite,
    delete: editorialWrite,
  },
  hooks: mediaRevalidationHooks,
  upload: {
    disableLocalStorage: true,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    imageSizes: [{ name: 'thumbnail', width: 480, height: 320, position: 'centre' }],
    adminThumbnail: 'thumbnail',
  },
  fields: [
    { name: 'alt', type: 'text', required: true, maxLength: 250 },
    { name: 'caption', type: 'text' },
  ],
};
