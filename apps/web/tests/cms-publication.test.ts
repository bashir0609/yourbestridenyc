import assert from 'node:assert/strict';
import test from 'node:test';
import { createCmsQueries } from '../src/lib/cms/queries';
import { createPageQueries } from '../src/lib/cms/page-queries';
import {
  allCmsPaths,
  invalidateCmsPaths,
  pathsForCmsChange,
} from '../src/lib/cms/path-revalidation';
import type { PayloadClient } from '../src/lib/cms/types';
import {
  Drivers,
  FleetVehicles,
  Locations,
  Services,
  Testimonials,
} from '../src/collections/Editorial';
import { Media } from '../src/collections/Media';

const published = {
  id: 1,
  _status: 'published',
  slug: 'approved-record',
  name: 'Approved record',
  title: 'Approved record',
  summary: 'Approved public summary',
  websiteApproved: true,
};

function clientWith(docs: unknown[]): PayloadClient {
  return {
    request: async () => ({
      ok: true,
      data: { docs, hasNextPage: false },
    }),
  };
}

test('publication state controls driver and fleet directories without fallback records', async () => {
  const driverQueries = createPageQueries(
    clientWith([
      { ...published, internalNotes: 'private', personalPhone: '+1 555 555 0000' },
      { ...published, id: 2, slug: 'draft-driver', _status: 'draft' },
      { ...published, id: 3, slug: 'unapproved-driver', websiteApproved: false },
    ]),
  );
  const drivers = await driverQueries.getDirectory('drivers');
  assert.deepEqual(
    drivers.items.map(({ slug }) => slug),
    ['approved-record'],
  );
  assert.equal(JSON.stringify(drivers).includes('internalNotes'), false);
  assert.equal(JSON.stringify(drivers).includes('personalPhone'), false);

  const fleetQueries = createPageQueries(
    clientWith([
      { ...published, category: 'suv', passengerCapacity: 6 },
      { ...published, id: 2, slug: 'draft-vehicle', _status: 'draft' },
    ]),
  );
  assert.deepEqual(
    (await fleetQueries.getDirectory('fleet-vehicles')).items.map(({ slug }) => slug),
    ['approved-record'],
  );
});

test('published services and locations appear while development seed records never do', async () => {
  const records = [published, { ...published, id: 2, slug: 'seed-record', developmentSeed: true }];
  const pageQueries = createPageQueries(clientWith(records));
  assert.deepEqual(
    (await pageQueries.getDirectory('services')).items.map(({ slug }) => slug),
    ['approved-record'],
  );
  assert.deepEqual(
    (await pageQueries.getDirectory('locations')).items.map(({ slug }) => slug),
    ['approved-record'],
  );

  const home = await createCmsQueries(clientWith(records)).getHomeContent();
  assert.deepEqual(
    home.services.map(({ slug }) => slug),
    ['approved-record'],
  );
  assert.deepEqual(
    home.locations.map(({ slug }) => slug),
    ['approved-record'],
  );
});

test('empty CMS results stay empty and CMS failures do not fabricate business records', async () => {
  const empty = await createPageQueries(clientWith([])).getDirectory('drivers');
  assert.deepEqual(empty.items, []);
  assert.equal(empty.status, 'empty');

  const unavailable: PayloadClient = {
    request: async () => ({ ok: false, reason: 'unavailable' }),
  };
  const failed = await createPageQueries(unavailable).getDirectory('fleet-vehicles');
  assert.deepEqual(failed.items, []);
  assert.equal(failed.status, 'unavailable');
});

test('publication, unpublication, approval and slug changes invalidate public driver paths', () => {
  const draft = { ...published, _status: 'draft' };
  const newlyPublished = pathsForCmsChange('drivers', published, draft);
  assert.ok(newlyPublished.includes('/'));
  assert.ok(newlyPublished.includes('/drivers'));
  assert.ok(newlyPublished.includes('/drivers/approved-record'));

  const unpublished = pathsForCmsChange('drivers', draft, published);
  assert.ok(unpublished.includes('/drivers/approved-record'));

  const unapproved = { ...published, websiteApproved: false };
  assert.ok(pathsForCmsChange('drivers', unapproved, published).includes('/drivers'));
  assert.deepEqual(pathsForCmsChange('drivers', unapproved, draft), []);

  const renamed = { ...published, slug: 'new-slug' };
  const renamedPaths = pathsForCmsChange('drivers', renamed, published);
  assert.ok(renamedPaths.includes('/drivers/approved-record'));
  assert.ok(renamedPaths.includes('/drivers/new-slug'));
});

test('service and location changes invalidate related route families and homepage', () => {
  const servicePaths = pathsForCmsChange('services', published);
  assert.ok(servicePaths.includes('/'));
  assert.ok(servicePaths.includes('/services'));
  assert.ok(servicePaths.includes('/services/[slug]'));
  assert.ok(servicePaths.includes('/locations/[slug]'));

  const locationPaths = pathsForCmsChange('locations', published);
  assert.ok(locationPaths.includes('/locations'));
  assert.ok(locationPaths.includes('/services/[slug]'));
  assert.ok(locationPaths.includes('/drivers/[slug]'));

  assert.deepEqual(pathsForCmsChange('services', { ...published, developmentSeed: true }), []);
});

test('Payload collections attach change, delete and media revalidation hooks', () => {
  for (const collection of [Drivers, FleetVehicles, Services, Locations, Testimonials]) {
    assert.equal(collection.hooks?.afterChange?.length, 1);
    assert.equal(collection.hooks?.afterDelete?.length, 1);
  }
  assert.equal(Media.hooks?.afterChange?.length, 1);
  assert.equal(Media.hooks?.afterDelete?.length, 1);
});

test('path invalidation marks dynamic patterns as pages and covers all media-backed CMS routes', () => {
  const calls: Array<[string, 'page' | 'layout' | undefined]> = [];
  invalidateCmsPaths(allCmsPaths, (path, type) => calls.push([path, type]));
  assert.equal(calls.length, new Set(allCmsPaths).size);
  assert.ok(calls.some(([path, type]) => path === '/drivers/[slug]' && type === 'page'));
  assert.ok(calls.some(([path, type]) => path === '/fleet' && type === undefined));
});
