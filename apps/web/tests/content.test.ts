import test from 'node:test';
import assert from 'node:assert/strict';
import { mapEditorial, mapDrivers, mapTestimonials, mapSettings } from '../src/lib/cms/mappers';

import { mapServicePage, mapDriverPage, mapLocationPage } from '../src/lib/cms/page-mappers';

const published = {
  _status: 'published',
  slug: 'sample',
  name: 'Approved display name',
  summary: 'Approved public description',
};

test('service booking CTA projects only an optional label of at most 80 characters', () => {
  for (const label of ['Reserve a ride', 'x'.repeat(80)]) {
    const page = mapServicePage({
      ...published,
      bookingCTA: { label, url: 'https://untrusted.test', internalNotes: 'private' },
    });
    assert.deepEqual(page?.bookingCTA, { label });
    assert.ok(!JSON.stringify(page).includes('untrusted'));
    assert.ok(!JSON.stringify(page).includes('private'));
  }
  for (const label of [undefined, null, 42, '', '   ', 'x'.repeat(81)])
    assert.equal(mapServicePage({ ...published, bookingCTA: { label } })?.bookingCTA, undefined);
  assert.equal(mapServicePage(published)?.bookingCTA, undefined);
});

test('driver years accept only integers from 0 through 80 without changing experience text', () => {
  const driver = {
    ...published,
    websiteApproved: true,
    experience: 'Professional chauffeur since 2010',
  };
  for (const experienceYears of [0, 1, 25, 80]) {
    const page = mapDriverPage({ ...driver, experienceYears });
    assert.equal(page?.experienceYears, experienceYears);
    assert.equal(page?.experience, driver.experience);
  }
  for (const experienceYears of [
    undefined,
    null,
    '12',
    true,
    -1,
    81,
    1.5,
    NaN,
    Infinity,
    -Infinity,
  ]) {
    const page = mapDriverPage({ ...driver, experienceYears });
    assert.equal(page?.experienceYears, undefined);
    assert.equal(page?.experience, driver.experience);
  }
});

test('location related services are published editorial projections, deduplicated and private-field free', () => {
  const service = {
    ...published,
    title: 'Airport transfers',
    internalNotes: 'private',
    bookingCTA: { url: 'https://untrusted.test' },
  };
  const page = mapLocationPage({
    ...published,
    id: 1,
    relatedServices: [
      service,
      service,
      { ...service, slug: 'draft-service', _status: 'draft' },
      { ...service, slug: 'unknown-status', _status: undefined },
      3,
      null,
    ],
  });
  assert.deepEqual(page?.relatedServices, [
    { slug: 'sample', title: 'Airport transfers', summary: published.summary },
  ]);
  for (const relatedServices of [undefined, null, 3, {}])
    assert.deepEqual(
      mapLocationPage({ ...published, id: 1, relatedServices })?.relatedServices,
      [],
    );
});

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
