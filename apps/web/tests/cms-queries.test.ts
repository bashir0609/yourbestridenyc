import test from 'node:test';
import assert from 'node:assert/strict';
import { createCmsQueries } from '../src/lib/cms/queries';
import { mapImage, mapFleet } from '../src/lib/cms/mappers';
import type { CmsResource, PayloadClient } from '../src/lib/cms/types';

const origin = 'https://media.example.test';
const image = {
  url: `${origin}/media/fleet.webp`,
  alt: 'Approved vehicle photo',
  width: 1200,
  height: 800,
  mimeType: 'image/webp',
};
const doc = {
  _status: 'published',
  slug: 'sample',
  name: 'Published name',
  title: 'Published title',
  summary: 'Approved summary',
  websiteApproved: true,
};

test('all five homepage sections map Payload collection fields, including R2 media', async () => {
  const requested: CmsResource[] = [];
  const fixtures: Record<CmsResource, unknown> = {
    services: { docs: [{ ...doc, image }] },
    'fleet-vehicles': {
      docs: [{ ...doc, images: [{ image }], passengerCapacity: 6, luggageCapacity: 3 }],
    },
    drivers: { docs: [{ ...doc, photo: image, internalNotes: 'never public' }] },
    testimonials: {
      docs: [{ ...doc, attribution: 'Consented customer', quote: 'Approved feedback' }],
    },
    locations: { docs: [{ ...doc, name: 'Published coverage area' }] },
    'site-settings': {
      siteName: 'Your Best Ride Inc.',
      bookingURL: 'https://booking.example.test/',
    },
  };
  const client: PayloadClient = {
    request: async (resource) => {
      requested.push(resource);
      return { ok: true, data: fixtures[resource] };
    },
  };
  const queries = createCmsQueries(client, origin);
  const home = await queries.getHomeContent();
  assert.deepEqual(
    new Set(requested),
    new Set(['services', 'fleet-vehicles', 'drivers', 'testimonials', 'locations']),
  );
  assert.equal(home.services[0]?.image?.url, image.url);
  assert.equal(home.fleet[0]?.passengerCapacity, 6);
  assert.equal(home.fleet[0]?.luggageCapacity, 3);
  assert.equal(home.fleet[0]?.image?.url, image.url);
  assert.equal(home.drivers[0]?.image?.url, image.url);
  assert.equal(home.testimonials[0]?.name, 'Consented customer');
  assert.equal(home.locations.length, 1);
  assert.deepEqual(Object.values(home.status), ['ready', 'ready', 'ready', 'ready', 'ready']);
  assert.ok(!JSON.stringify(home).includes('internalNotes'));
  assert.equal((await queries.getSiteSettings()).bookingUrl, 'https://booking.example.test/');
});

test('empty, invalid, unconfigured and unavailable sections are distinct and independent', async () => {
  const client: PayloadClient = {
    request: async (resource) => {
      if (resource === 'services') return { ok: true, data: { docs: [doc] } };
      if (resource === 'drivers') return { ok: false, reason: 'unavailable' };
      if (resource === 'fleet-vehicles') return { ok: true, data: { wrong: [] } };
      if (resource === 'testimonials') return { ok: false, reason: 'unconfigured' };
      return { ok: true, data: { docs: [] } };
    },
  };
  const result = await createCmsQueries(client).getHomeContent();
  assert.equal(result.services.length, 1);
  assert.deepEqual(result.fleet, []);
  assert.deepEqual(result.drivers, []);
  assert.deepEqual(result.status, {
    services: 'ready',
    'fleet-vehicles': 'invalid',
    drivers: 'unavailable',
    testimonials: 'unconfigured',
    locations: 'empty',
  });
});

test('queries filter drafts and unapproved records even if an upstream ignores filters', async () => {
  const records = [
    doc,
    { ...doc, slug: 'draft', _status: 'draft' },
    { ...doc, slug: 'no-consent', websiteApproved: false },
  ];
  const client: PayloadClient = { request: async () => ({ ok: true, data: { docs: records } }) };
  assert.deepEqual(
    (await createCmsQueries(client).getDrivers()).items.map(({ slug }) => slug),
    ['sample'],
  );
  assert.deepEqual(
    (await createCmsQueries(client).getServices()).items.map(({ slug }) => slug),
    ['sample', 'no-consent'],
  );
});

test('homepage queries apply display limits even when an upstream ignores limit', async () => {
  const client: PayloadClient = {
    request: async () => ({
      ok: true,
      data: { docs: Array.from({ length: 20 }, (_, i) => ({ ...doc, slug: `record-${i}` })) },
    }),
  };
  const home = await createCmsQueries(client).getHomeContent();
  assert.equal(home.services.length, 8);
  assert.equal(home.fleet.length, 6);
  assert.equal(home.drivers.length, 6);
  assert.equal(home.locations.length, 12);
});

test('media mapping requires explicit origin, safe public path, image format and metadata', () => {
  assert.equal(mapImage(image), undefined);
  assert.equal(mapImage(123, origin), undefined);
  for (const invalid of [
    { ...image, url: 'https://attacker.test/media/image.webp' },
    { ...image, url: `${origin}/private/file.webp` },
    { ...image, url: `${image.url}?token=secret` },
    { ...image, url: `${image.url}#fragment` },
    { ...image, url: 'javascript:alert(1)' },
    { ...image, mimeType: 'image/svg+xml' },
    { ...image, alt: '' },
    { ...image, width: -1 },
  ])
    assert.equal(mapImage(invalid, origin), undefined);
  assert.deepEqual(mapImage(image, origin), {
    url: image.url,
    alt: image.alt,
    width: image.width,
    height: image.height,
  });
});

test('fleet data tolerates unpopulated relationships and omits invalid capacities', () => {
  const fleet = mapFleet(
    {
      docs: [
        { ...doc, images: [{ image: 123 }], passengerCapacity: -1, luggageCapacity: 'unknown' },
      ],
    },
    origin,
  );
  assert.equal(fleet.length, 1);
  assert.equal(fleet[0]?.image, undefined);
  assert.equal(fleet[0]?.passengerCapacity, undefined);
  assert.equal(fleet[0]?.luggageCapacity, undefined);
});
