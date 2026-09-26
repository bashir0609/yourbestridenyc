import test from 'node:test';
import assert from 'node:assert/strict';
import { authorized, validateRevalidation } from '../src/lib/revalidation';

const secret = 'test-only-secret-with-at-least-32-characters';
test('revalidation is disabled without a sufficiently long secret', () => {
  assert.equal(authorized(`Bearer ${secret}`, undefined), false);
  assert.equal(authorized('Bearer short', 'short'), false);
});
test('bearer authentication rejects missing, malformed, and incorrect credentials', () => {
  assert.equal(authorized(`Bearer ${secret}`, secret), true);
  for (const header of [
    null,
    secret,
    `Basic ${secret}`,
    'Bearer wrong',
    `Bearer ${secret}x`,
    `Bearer ${'a'.repeat(1024)}`,
  ])
    assert.equal(authorized(header, secret), false);
});
test('only known CMS tags can be invalidated', () => {
  assert.deepEqual(validateRevalidation({ tags: ['cms:drivers', 'cms:services', 'cms:drivers'] }), [
    'cms:drivers',
    'cms:services',
  ]);
  for (const value of [
    null,
    [],
    {},
    { tags: [] },
    { tags: ['unknown'] },
    { tags: [null] },
    { tags: ['cms:services'], path: '/' },
    { path: '/' },
    { tags: Array(7).fill('cms:services') },
  ])
    assert.equal(validateRevalidation(value), undefined);
});
