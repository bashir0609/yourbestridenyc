import assert from 'node:assert/strict';
import test from 'node:test';
import { readEnvironment } from '../src/env';
import { createR2StorageOptions } from '../src/storage';
import { Media } from '../src/collections/Media';
import { DriverApplications, TransportationLeads } from '../src/collections/Intake';

// Synthetic unit-test inputs only. These do not connect to any external service.
const env = readEnvironment({
  PAYLOAD_SECRET: 'unit-test-only-not-a-deployment-secret',
  DATABASE_URI: 'postgresql://localhost/unit_test',
  CMS_URL: 'https://cms.example.test',
  S3_BUCKET: 'public-media-test',
  S3_ACCESS_KEY_ID: 'unit-test-key',
  S3_SECRET_ACCESS_KEY: 'unit-test-secret',
  S3_REGION: 'auto',
  S3_ENDPOINT: 'https://00000000000000000000000000000000.r2.cloudflarestorage.com',
  S3_PUBLIC_URL: 'https://media.example.test',
});

test('Payload storage targets R2 with no AWS endpoint, ACL or local-storage fallback', () => {
  const options = createR2StorageOptions(env);
  assert.equal(options.bucket, env.bucket);
  assert.equal(options.clientUploads, false);
  assert.equal(options.disableLocalStorage, true);
  assert.equal(options.config.endpoint, env.endpoint);
  assert.equal(options.config.region, 'auto');
  assert.equal(options.config.forcePathStyle, true);
  assert.deepEqual(options.config.credentials, {
    accessKeyId: env.accessKeyId,
    secretAccessKey: env.secretAccessKey,
  });
  assert.equal('acl' in options, false);
});

test('only the public Media collection is mapped to R2 public delivery', async () => {
  const options = createR2StorageOptions(env);
  assert.deepEqual(Object.keys(options.collections), ['media']);
  const media = options.collections.media;
  assert.ok(media && typeof media === 'object');
  assert.equal(media.disablePayloadAccessControl, true);
  assert.equal(media.prefix, 'media');
  assert.equal('acl' in media, false);
  const generateURL = media.generateFileURL;
  assert.ok(generateURL);
  const url = await generateURL({ filename: 'fleet/black car.webp', prefix: 'media' } as Parameters<
    typeof generateURL
  >[0]);
  assert.equal(url, 'https://media.example.test/media/fleet/black%20car.webp');
  assert.ok(!url.includes('cloudflarestorage.com'));
  assert.ok(!url.includes(env.secretAccessKey));
});

test('private intake is not an upload collection or a public storage mapping', () => {
  const options = createR2StorageOptions(env);
  for (const collection of [DriverApplications, TransportationLeads]) {
    assert.equal(collection.upload, undefined);
    assert.equal(options.collections[collection.slug], undefined);
    assert.ok(!collection.fields.some((field) => field.type === 'upload'));
  }
  assert.equal(Media.slug, 'media');
  assert.ok(Media.upload && typeof Media.upload === 'object');
  assert.deepEqual(Media.upload.mimeTypes, ['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
});
