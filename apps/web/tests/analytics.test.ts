import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextPageViewPath,
  serializeAnalyticsEvent,
  trackEvent,
  trackPageView,
  validateGoogleTagManagerId,
} from '../src/lib/analytics';

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

test('events preserve an existing dataLayer and push one flat GTM custom event', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const dataLayer: Array<Record<string, string>> = [{ event: 'gtm.js' }];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dataLayer },
  });

  try {
    trackEvent('booking_click', { source_page: '/', button_location: 'hero' });
    assert.equal((globalThis.window as unknown as { dataLayer: unknown }).dataLayer, dataLayer);
    assert.deepEqual(dataLayer, [
      { event: 'gtm.js' },
      { event: 'booking_click', source_page: '/', button_location: 'hero' },
    ]);

    trackEvent('purchase', { source_page: '/' });
    trackEvent('contact_form_submit', { email: 'guest@example.com' });
    assert.equal(dataLayer.length, 2);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('tracking is a server-safe no-op when dataLayer is unavailable', () => {
  assert.doesNotThrow(() => trackEvent('contact_form_submit', { source_page: '/contact' }));
});

test('page-view transitions include initial load and distinct pathname changes once', () => {
  assert.equal(nextPageViewPath(undefined, '/'), '/');
  assert.equal(nextPageViewPath('/', '/'), undefined);
  assert.equal(nextPageViewPath('/', '/book'), '/book');
  assert.equal(nextPageViewPath('/book', '/book?passenger=name'), undefined);
  assert.equal(nextPageViewPath('/book', '//external.example'), undefined);
  assert.equal(nextPageViewPath('/book', '/book#payment'), undefined);
});

test('page views push safe location metadata without query strings or referrers', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const dataLayer: Array<Record<string, string>> = [];
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { dataLayer, location: { origin: 'https://yourbestridenyc.vercel.app' } },
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { title: 'Book Your Ride | YourBestRide' },
  });

  try {
    trackPageView('/book');
    trackPageView('/book?passenger=name');
    assert.deepEqual(dataLayer, [
      {
        event: 'page_view',
        page_path: '/book',
        page_location: 'https://yourbestridenyc.vercel.app/book',
        page_title: 'Book Your Ride | YourBestRide',
      },
    ]);
    assert.equal('page_referrer' in dataLayer[0]!, false);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});

test('GTM loads once on public routes with no direct gtag transport or admin installation', async () => {
  const { readFile } = await import('node:fs/promises');
  const gtm = await readFile(
    new URL('../src/components/analytics/google-tag-manager.tsx', import.meta.url),
    'utf8',
  );
  const pageViews = await readFile(
    new URL('../src/components/analytics/analytics-page-views.tsx', import.meta.url),
    'utf8',
  );
  const frontendLayout = await readFile(
    new URL('../src/app/(frontend)/layout.tsx', import.meta.url),
    'utf8',
  );
  const adminLayout = await readFile(
    new URL('../src/app/(payload)/layout.tsx', import.meta.url),
    'utf8',
  );

  assert.match(gtm, /strategy="beforeInteractive"/);
  assert.match(gtm, /'gtm.start':new Date\(\)\.getTime\(\),event:'gtm.js'/);
  assert.match(gtm, /https:\/\/www\.googletagmanager\.com\/gtm\.js\?id=/);
  assert.match(gtm, /https:\/\/www\.googletagmanager\.com\/ns\.html\?id=/);
  assert.doesNotMatch(pageViews, /gtag|googletagmanager\.com\/gtag/);
  assert.equal((frontendLayout.match(/<GoogleTagManager \/>/g) ?? []).length, 1);
  assert.equal((frontendLayout.match(/<GoogleTagManagerNoScript \/>/g) ?? []).length, 1);
  assert.equal((frontendLayout.match(/<AnalyticsPageViews \/>/g) ?? []).length, 1);
  assert.ok(
    frontendLayout.indexOf('<GoogleTagManagerNoScript />') <
      frontendLayout.indexOf('application/ld+json'),
  );
  assert.doesNotMatch(adminLayout, /GoogleTagManager|AnalyticsPageViews|GTM-/);
});
