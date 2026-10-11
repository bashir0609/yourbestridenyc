import test from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeAnalyticsEvent,
  trackEvent,
  validateGoogleAnalyticsId,
  validateGoogleTagManagerId,
} from '../src/lib/analytics';

test('validates GA4 measurement IDs without normalizing unsafe input', () => {
  assert.equal(validateGoogleAnalyticsId('G-ABC12345'), 'G-ABC12345');
  for (const value of [
    undefined,
    '',
    'UA-12345-1',
    'G-',
    'G-abc12345',
    ' G-ABC12345',
    'G-ABC_123',
    'G-ABC12345\n',
  ])
    assert.equal(validateGoogleAnalyticsId(value), undefined);
});

test('validates GTM container IDs without normalizing unsafe input', () => {
  assert.equal(validateGoogleTagManagerId('GTM-PN2XW523'), 'GTM-PN2XW523');
  for (const value of [
    undefined,
    '',
    'G-PN2XW523',
    'GTM-',
    'GTM-pn2xw523',
    ' GTM-PN2XW523',
    'GTM-PN2X_W523',
    'GTM-PN2XW523\n',
  ])
    assert.equal(validateGoogleTagManagerId(value), undefined);
});

test('serializes only allowlisted PII-free events and parameters', () => {
  assert.deepEqual(
    serializeAnalyticsEvent('booking_click', {
      service_page: '/services/airport',
      source_page: '/',
      button_location: 'hero',
    }),
    {
      name: 'booking_click',
      params: {
        service_page: '/services/airport',
        source_page: '/',
        button_location: 'hero',
      },
    },
  );
  assert.deepEqual(serializeAnalyticsEvent('contact_form_submit', { source_page: '/contact' }), {
    name: 'contact_form_submit',
    params: { source_page: '/contact' },
  });
  assert.equal(serializeAnalyticsEvent('purchase', { source_page: '/' }), undefined);
  assert.equal(
    serializeAnalyticsEvent('booking_click', { source_page: '/', campaign: 'summer' }),
    undefined,
  );
});

test('rejects PII fields and PII-looking parameter values', () => {
  for (const parameters of [
    { email: 'guest@example.com' },
    { phone: '+12025550123' },
    { name: 'Guest' },
    { message: 'Please call' },
    { source_page: 'guest@example.com' },
    { button_location: '+1 (202) 555-0123' },
    { source_page: ' /contact' },
    { source_page: 'line\nbreak' },
  ])
    assert.equal(serializeAnalyticsEvent('contact_form_submit', parameters), undefined);
});

test('tracking is a server-safe no-op when gtag is unavailable', () => {
  assert.doesNotThrow(() => trackEvent('contact_form_submit', { source_page: '/contact' }));
});

test('GTM uses one official bootstrap and noscript fallback only in the frontend layout', async () => {
  const { readFile } = await import('node:fs/promises');
  const component = await readFile(
    new URL('../src/components/analytics/google-tag-manager.tsx', import.meta.url),
    'utf8',
  );
  const layout = await readFile(
    new URL('../src/app/(frontend)/layout.tsx', import.meta.url),
    'utf8',
  );

  assert.match(component, /strategy="beforeInteractive"/);
  assert.match(component, /'gtm.start':new Date\(\)\.getTime\(\),event:'gtm.js'/);
  assert.match(component, /https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=/);
  assert.match(component, /https:\/\/www\.googletagmanager\.com\/ns\.html\?id=/);
  assert.equal((layout.match(/<GoogleTagManager \/>/g) ?? []).length, 1);
  assert.equal((layout.match(/<GoogleTagManagerNoScript \/>/g) ?? []).length, 1);
  assert.ok(layout.indexOf('<GoogleTagManagerNoScript />') < layout.indexOf('application/ld+json'));
});
