import test from 'node:test';
import assert from 'node:assert/strict';
import { mapEditorial, mapDrivers, mapTestimonials, mapSettings } from '../src/lib/cms/mappers';

const published = {
  _status: 'published',
  slug: 'sample',
  name: 'Approved display name',
  summary: 'Approved public description',
};

test('malformed CMS responses degrade to empty collections', () => {
  for (const value of [
    null,
    undefined,
    [],
    'invalid',
    {},
    { docs: null },
    { docs: [null, false, 'invalid', {}] },
  ]) {
    assert.deepEqual(mapEditorial(value), []);
    assert.deepEqual(mapDrivers(value), []);
    assert.deepEqual(mapTestimonials(value), []);
  }
});
test('editorial mapping selects public fields, excludes drafts, and deduplicates', () => {
  const doc = {
    ...published,
    email: 'private@example.test',
    phone: 'secret',
    internalNotes: 'sensitive',
  };
  assert.deepEqual(
    mapEditorial({ docs: [doc, doc, { ...doc, _status: 'draft' }, { ...doc, slug: 'bad/slug' }] }),
    [{ slug: 'sample', title: published.name, summary: published.summary }],
  );
  assert.deepEqual(mapEditorial({ docs: [{ ...published, summary: 'x'.repeat(301) }] }), []);
});
test('driver profiles require both published state and literal approval', () => {
  for (const websiteApproved of [undefined, false, 'true', 1])
    assert.deepEqual(mapDrivers({ docs: [{ ...published, websiteApproved }] }), []);
  assert.deepEqual(
    mapDrivers({ docs: [{ ...published, websiteApproved: true, _status: 'draft' }] }),
    [],
  );
  assert.deepEqual(
    mapDrivers({ docs: [{ ...published, websiteApproved: true, email: 'private@example.test' }] }),
    [{ slug: 'sample', name: published.name, summary: published.summary }],
  );
});
test('testimonials require explicit approval and quote, never summary fallback or ratings', () => {
  assert.deepEqual(mapTestimonials({ docs: [{ ...published, websiteApproved: true }] }), []);
  assert.deepEqual(mapTestimonials({ docs: [{ ...published, quote: 'Approved quote' }] }), []);
  assert.deepEqual(
    mapTestimonials({
      docs: [{ ...published, websiteApproved: true, quote: 'Approved quote', rating: 5 }],
    }),
    [{ slug: 'sample', name: published.name, quote: 'Approved quote' }],
  );
});
test('settings map the public Payload global without requiring a draft status', () => {
  assert.deepEqual(mapSettings(null), {});
  assert.deepEqual(
    mapSettings({
      siteName: 'Your Best Ride Inc.',
      defaultSEO: { title: 'Website title', description: 'Public summary' },
      bookingURL: 'https://booking.example.test/',
      publicEmail: 'info@example.test',
      publicPhone: '+12125550123',
      token: 'private',
    }),
    {
      title: 'Website title',
      description: 'Public summary',
      bookingUrl: 'https://booking.example.test/',
      email: 'info@example.test',
      phone: '+12125550123',
    },
  );
  assert.equal(mapSettings({ bookingURL: 'javascript:alert(1)' }).bookingUrl, undefined);
});
test('testimonials use the CMS attribution field', () => {
  assert.deepEqual(
    mapTestimonials({
      docs: [
        {
          _status: 'published',
          slug: 'review',
          attribution: 'Approved customer',
          quote: 'Approved quote',
          websiteApproved: true,
        },
      ],
    }),
    [{ slug: 'review', name: 'Approved customer', quote: 'Approved quote' }],
  );
});
