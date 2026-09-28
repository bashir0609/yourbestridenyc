import test from 'node:test';
import assert from 'node:assert/strict';
import {
  serializeAnalyticsEvent,
  trackEvent,
  validateGoogleAnalyticsId,
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
