import test from 'node:test';
import assert from 'node:assert/strict';
import {
  httpsUrl,
  siteOrigin,
  cmsOrigin,
  contactEmail,
  contactPhone,
  getPublicConfig,
} from '../src/lib/config';

test('booking allows explicit HTTPS URLs only', () => {
  assert.equal(
    httpsUrl('https://booking.example.test/reserve?account=demo'),
    'https://booking.example.test/reserve?account=demo',
  );
  for (const value of [
    undefined,
    '',
    'javascript:alert(1)',
    '//example.test',
    'http://example.test',
    'https://user:pass@example.test',
    ' https://example.test',
    'https://example.test/\nattack',
  ])
    assert.equal(httpsUrl(value), undefined);
});
test('canonical origin rejects paths, query strings, credentials, and fragments', () => {
  assert.equal(siteOrigin('https://example.test/'), 'https://example.test');
  for (const value of [
    'https://example.test/path',
    'https://example.test?x=1',
    'https://example.test/#x',
    'http://localhost:3000',
  ])
    assert.equal(siteOrigin(value), undefined);
});
test('CMS localhost exception applies only in development', () => {
  assert.equal(cmsOrigin('http://localhost:3001', true), 'http://localhost:3001');
  assert.equal(cmsOrigin('http://127.0.0.1:3001', true), 'http://127.0.0.1:3001');
  assert.equal(cmsOrigin('http://localhost:3001', false), undefined);
  assert.equal(cmsOrigin('http://external.test', true), undefined);
  assert.equal(cmsOrigin('http://localhost:3001/api', true), undefined);
});
test('contact links accept no injected headers or invented defaults', () => {
  assert.equal(contactEmail('hello@example.test'), 'hello@example.test');
  assert.equal(contactEmail('hello@example.test?subject=attack'), undefined);
  for (const email of [
    'name?subject=attack@example.test',
    'name#fragment@example.test',
    'name%0d%0abcc@example.test',
  ])
    assert.equal(contactEmail(email), undefined);
  assert.equal(contactEmail('hello@example.test\r\nBcc:a@example.test'), undefined);
  assert.equal(contactPhone('+12025550123'), '+12025550123');
  for (const value of ['123', '+12345678;123', '+12025550123\n', 'tel:+12025550123'])
    assert.equal(contactPhone(value), undefined);
  assert.deepEqual(getPublicConfig({}), {
    siteUrl: undefined,
    bookingUrl: undefined,
    email: undefined,
    phone: undefined,
  });
});
