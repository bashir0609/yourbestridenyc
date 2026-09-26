import type { s3Storage } from '@payloadcms/storage-s3';
import type { readEnvironment } from './env';

/** Public marketing media only. Private documents must never use this adapter mapping. */
export function createR2StorageOptions(
  env: ReturnType<typeof readEnvironment>,
): Parameters<typeof s3Storage>[0] {
  return {
    bucket: env.bucket,
    clientUploads: false,
    disableLocalStorage: true,
    collections: {
      media: {
        prefix: 'media',
        // Only this marketing bucket has public delivery through a Cloudflare custom domain.
        disablePayloadAccessControl: true,
        generateFileURL: ({ filename, prefix }) =>
          `${env.publicURL}/${[prefix, filename]
            .filter(Boolean)
            .map((part) => part!.split('/').map(encodeURIComponent).join('/'))
            .join('/')}`,
      },
    },
    config: {
      region: env.region,
      endpoint: env.endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey },
    },
  };
}
