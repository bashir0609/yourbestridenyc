import assert from 'node:assert/strict';
import test from 'node:test';
import type { CollectionBeforeChangeHook } from 'payload';
import { protectUserCreation, Users } from '../../src/collections/Users';
import { adminOrSelf, isAdmin } from '../../src/access';

type HookArgs = Parameters<CollectionBeforeChangeHook>[0];
const hookArgs = (role: string | undefined, operation: 'create' | 'update', count = 0): HookArgs =>
  ({
    data: { name: 'Test', role: 'lead-manager' },
    operation,
    originalDoc: { id: 1, role: 'content-manager' },
    req: {
      user: role ? { id: 1, collection: 'users', role } : null,
      payload: { count: async () => ({ totalDocs: count }) },
    },
  }) as unknown as HookArgs;

test('user operations retain admin creation and self read/update policies', () => {
  assert.equal(Users.access?.create, isAdmin);
  assert.equal(Users.access?.delete, isAdmin);
  assert.equal(Users.access?.read, adminOrSelf);
  assert.equal(Users.access?.update, adminOrSelf);
});

test('bootstrap is explicit, empty-database only, and forces admin role', async () => {
  const previous = process.env.CMS_ALLOW_FIRST_USER;
  try {
    process.env.CMS_ALLOW_FIRST_USER = 'false';
    await assert.rejects(
      () => protectUserCreation(hookArgs(undefined, 'create')),
      /Only administrators/,
    );
    process.env.CMS_ALLOW_FIRST_USER = 'true';
    const result = await protectUserCreation(hookArgs(undefined, 'create'));
    assert.equal(result.role, 'admin');
    await assert.rejects(
      () => protectUserCreation(hookArgs(undefined, 'create', 1)),
      /Only administrators/,
    );
    await assert.rejects(
      () => protectUserCreation(hookArgs('content-manager', 'create')),
      /Only administrators/,
    );
    await assert.rejects(
      () => protectUserCreation(hookArgs('lead-manager', 'create')),
      /Only administrators/,
    );
  } finally {
    if (previous === undefined) delete process.env.CMS_ALLOW_FIRST_USER;
    else process.env.CMS_ALLOW_FIRST_USER = previous;
  }
});

test('non-admin role changes fail even when a caller bypasses field access', async () => {
  await assert.rejects(
    () => protectUserCreation(hookArgs('content-manager', 'update')),
    /Only administrators/,
  );
  await assert.rejects(
    () => protectUserCreation(hookArgs(undefined, 'update')),
    /Only administrators/,
  );
  const admin = hookArgs('admin', 'update');
  assert.equal(await protectUserCreation(admin), admin.data);
  const ownProfile = hookArgs('content-manager', 'update');
  ownProfile.data = { name: 'Updated name' };
  assert.equal(await protectUserCreation(ownProfile), ownProfile.data);
});
