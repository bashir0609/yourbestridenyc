import assert from 'node:assert/strict';
import test from 'node:test';
import type { Access, AccessArgs, FieldAccess, PayloadRequest } from 'payload';
import {
  adminField,
  adminOrSelf,
  editorialRead,
  editorialWrite,
  hasRole,
  intakeAccess,
  isAdmin,
  roles,
  staffAccess,
} from '../../src/access';
import {
  BlogPosts,
  Drivers,
  FleetVehicles,
  Locations,
  Pages,
  Services,
  Testimonials,
} from '../../src/collections/Editorial';
import {
  DriverApplications,
  PublicIntakeRateLimits,
  TransportationLeads,
} from '../../src/collections/Intake';
import { Media } from '../../src/collections/Media';
import { Footer, Navigation } from '../../src/globals/Navigation';
import { SiteSettings } from '../../src/globals/SiteSettings';

const args = (role?: string): AccessArgs => ({
  req: { user: role ? { id: 7, collection: 'users', role } : null } as unknown as PayloadRequest,
});

const check = (access: Access | undefined, role?: string) => {
  assert.ok(access);
  return access(args(role));
};

test('editorial reads filter anonymous and lead managers to published records', async () => {
  for (const role of [undefined, 'lead-manager', 'unknown']) {
    assert.deepEqual(await editorialRead(args(role)), { _status: { equals: 'published' } });
    assert.equal(await editorialWrite(args(role)), false);
  }
  for (const role of ['admin', 'content-manager']) {
    assert.equal(await editorialRead(args(role)), true);
    assert.equal(await editorialWrite(args(role)), true);
  }
});

test('every editorial collection protects all writes and version reads', async () => {
  for (const collection of [
    Pages,
    Services,
    Drivers,
    FleetVehicles,
    Testimonials,
    Locations,
    BlogPosts,
  ]) {
    assert.ok(collection.versions);
    for (const operation of ['create', 'update', 'delete', 'readVersions'] as const) {
      for (const role of [undefined, 'lead-manager'])
        assert.equal(await check(collection.access?.[operation], role), false);
      for (const role of ['admin', 'content-manager'])
        assert.equal(await check(collection.access?.[operation], role), true);
    }
    assert.deepEqual(await check(collection.access?.read), { _status: { equals: 'published' } });
  }
});

test('private intake denies anonymous and editorial staff for every operation', async () => {
  for (const collection of [TransportationLeads, DriverApplications]) {
    assert.equal(collection.versions, undefined);
    for (const operation of ['create', 'read', 'update', 'delete'] as const) {
      for (const role of [undefined, 'content-manager', 'unknown'])
        assert.equal(await check(collection.access?.[operation], role), false);
      assert.equal(await check(collection.access?.[operation], 'admin'), true);
      assert.equal(
        await check(collection.access?.[operation], 'lead-manager'),
        operation === 'read' || operation === 'update',
      );
    }
  }
  assert.equal(await intakeAccess(args('content-manager')), false);
});

test('rate-limit records stay private and intake models expose only reviewed public fields', async () => {
  for (const operation of ['create', 'read', 'update', 'delete'] as const) {
    assert.equal(await check(PublicIntakeRateLimits.access?.[operation]), false);
    assert.equal(await check(PublicIntakeRateLimits.access?.[operation], 'admin'), false);
  }
  for (const collection of [TransportationLeads, DriverApplications]) {
    assert.notEqual(collection.timestamps, false);
    const names = new Set(collection.fields.map((field) => ('name' in field ? field.name : '')));
    assert.equal(names.has('source'), true);
    assert.equal(names.has('sourcePage'), true);
    assert.equal(names.has('consentRecordedAt'), true);
  }
  const leadStatus = TransportationLeads.fields.find(
    (field) => 'name' in field && field.name === 'crmStatus',
  );
  assert.ok(leadStatus && 'defaultValue' in leadStatus);
  assert.equal(leadStatus.defaultValue, 'new');
  const driverNames = new Set(
    DriverApplications.fields.map((field) => ('name' in field ? field.name : '')),
  );
  assert.equal(driverNames.has('licenseClass'), true);
  assert.equal(driverNames.has('drivingExperience'), true);
});

test('user access allows admin or authenticated self, never anonymous enumeration', async () => {
  assert.equal(await adminOrSelf(args()), false);
  assert.equal(await adminOrSelf(args('admin')), true);
  for (const role of ['content-manager', 'lead-manager']) {
    assert.deepEqual(await adminOrSelf(args(role)), { id: { equals: 7 } });
    assert.equal(await isAdmin(args(role)), false);
    assert.equal(await adminField(args(role) as Parameters<FieldAccess>[0]), false);
  }
  assert.equal(await adminField(args('admin') as Parameters<FieldAccess>[0]), true);
  assert.equal(
    hasRole({ id: 7, collection: 'another-auth-collection', role: 'admin' }, roles),
    false,
  );
  assert.equal(await staffAccess(args('unknown')), false);
});

test('globals and marketing images are public, but only editorial staff can modify them', async () => {
  for (const global of [SiteSettings, Navigation, Footer]) {
    assert.equal(await check(global.access?.read as Access), true);
    assert.equal(await check(global.access?.update as Access, 'content-manager'), true);
    assert.equal(await check(global.access?.update as Access, 'lead-manager'), false);
    assert.equal(await check(global.access?.update as Access), false);
  }
  assert.equal(await check(Media.access?.read), true);
  for (const operation of ['create', 'update', 'delete'] as const) {
    assert.equal(await check(Media.access?.[operation]), false);
    assert.equal(await check(Media.access?.[operation], 'lead-manager'), false);
    assert.equal(await check(Media.access?.[operation], 'content-manager'), true);
  }
});
