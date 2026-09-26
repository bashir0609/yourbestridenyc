import assert from 'node:assert/strict';
import test from 'node:test';
import { httpsURL, navigationURL, slugValue } from '../src/validation';
import { readEnvironment } from '../src/env';

const valid = {
  PAYLOAD_SECRET: 'a-test-secret-with-at-least-32-characters',
  DATABASE_URI: 'postgresql://localhost/cms',
  CMS_URL: 'https://cms.example.com',
  S3_PUBLIC_URL: 'https://media.example.com',
  S3_BUCKET: 'cms-media',
  S3_REGION: 'auto',
  S3_ENDPOINT: 'https://00000000000000000000000000000000.r2.cloudflarestorage.com',
  S3_ACCESS_KEY_ID: 'test',
  S3_SECRET_ACCESS_KEY: 'test',
};

test('booking URLs require HTTPS and reject credentials and executable schemes', () => {
  assert.equal(httpsURL('https://book.example.com/reserve?service=airport'), true);
  for (const value of [
    undefined,
    null,
    '',
    ' ',
    'http://example.com',
    '//example.com',
    '/book',
    'javascript:alert(1)',
    'https://user:pass@example.com',
    'invalid',
  ]) {
    assert.notEqual(httpsURL(value), true);
  }
});

test('navigation accepts safe relative paths or HTTPS, never protocol-relative paths', () => {
  for (const value of ['/', '/services/airport?from=nav', 'https://book.example.com'])
    assert.equal(navigationURL(value), true);
  for (const value of [
    '//evil.example.com',
    '/\\evil.example.com',
    '/\nevil.example.com',
    'javascript:alert(1)',
    'http://example.com',
  ]) {
    assert.notEqual(navigationURL(value), true);
  }
});

test('slugs are stable URL segments', () => {
  for (const value of ['airport-transfer', 'suv-7']) assert.equal(slugValue(value), true);
  for (const value of ['', 'Airport', 'two words', '-first', 'last-', 'a--b', '/path'])
    assert.notEqual(slugValue(value), true);
});

test('environment fails closed for missing credentials and insecure production settings', () => {
  assert.equal(readEnvironment(valid).push, false);
  assert.throws(() => readEnvironment({ ...valid, PAYLOAD_SECRET: '' }), /PAYLOAD_SECRET/);
  assert.throws(() => readEnvironment({ ...valid, PAYLOAD_SECRET: 'short' }), /32/);
  assert.throws(
    () => readEnvironment({ ...valid, S3_SECRET_ACCESS_KEY: '' }),
    /S3_SECRET_ACCESS_KEY/,
  );
  assert.throws(
    () => readEnvironment({ ...valid, NODE_ENV: 'production', DATABASE_PUSH: 'true' }),
    /production/,
  );
  assert.throws(
    () => readEnvironment({ ...valid, NODE_ENV: 'production', CMS_URL: 'http://cms.example.com' }),
    /HTTPS/,
  );
  assert.throws(() => readEnvironment({ ...valid, CMS_CORS_ORIGINS: '*' }));
  assert.throws(
    () => readEnvironment({ ...valid, S3_PUBLIC_URL: 'https://media.example.com?key=secret' }),
    /S3_PUBLIC_URL/,
  );

  assert.throws(() => readEnvironment({ ...valid, CMS_ALLOW_FIRST_USER: '1' }), /true or false/);
  assert.equal(readEnvironment({ ...valid, DATABASE_PUSH: 'true' }).push, true);
});

test('DATABASE_URI is required and no legacy DATABASE_URL fallback is used', () => {
  assert.equal(readEnvironment(valid).databaseURI, valid.DATABASE_URI);
  assert.throws(() => readEnvironment({ ...valid, DATABASE_URI: '' }), /DATABASE_URI/);
  assert.throws(
    () => readEnvironment({ ...valid, DATABASE_URI: '', DATABASE_URL: valid.DATABASE_URI }),
    /DATABASE_URI/,
  );
  assert.throws(
    () => readEnvironment({ ...valid, DATABASE_URI: 'mysql://localhost/cms' }),
    /PostgreSQL/,
  );
});

test('R2 requires an account endpoint and auto region instead of AWS defaults', () => {
  const account = '00000000000000000000000000000000';
  for (const jurisdiction of ['', '.eu', '.us', '.fedramp']) {
    const endpoint = `https://${account}${jurisdiction}.r2.cloudflarestorage.com`;
    assert.equal(readEnvironment({ ...valid, S3_ENDPOINT: endpoint }).endpoint, endpoint);
  }
  for (const endpoint of [
    '',
    'https://s3.amazonaws.com',
    'https://example.com',
    `http://${account}.r2.cloudflarestorage.com`,
    `${valid.S3_ENDPOINT}/bucket`,
    `${valid.S3_ENDPOINT}?secret=x`,
    `https://${account}.r2.cloudflarestorage.com.attacker.test`,
  ]) {
    assert.throws(() => readEnvironment({ ...valid, S3_ENDPOINT: endpoint }), /S3_ENDPOINT/);
  }
  assert.throws(() => readEnvironment({ ...valid, S3_REGION: 'us-east-1' }), /auto/);
  assert.throws(() => readEnvironment({ ...valid, S3_REGION: '' }), /S3_REGION/);
});

test('public delivery is separate from authenticated R2 and uses a production custom domain', () => {
  assert.throws(
    () => readEnvironment({ ...valid, S3_PUBLIC_URL: valid.S3_ENDPOINT }),
    /S3_PUBLIC_URL/,
  );
  assert.throws(
    () => readEnvironment({ ...valid, S3_PUBLIC_URL: 'https://media.example.com/bucket' }),
    /S3_PUBLIC_URL/,
  );
  assert.throws(
    () =>
      readEnvironment({
        ...valid,
        NODE_ENV: 'production',
        S3_PUBLIC_URL: 'https://pub-test.r2.dev',
      }),
    /custom domain/,
  );
  assert.equal(
    readEnvironment({ ...valid, NODE_ENV: 'development', S3_PUBLIC_URL: 'https://pub-test.r2.dev' })
      .publicURL,
    'https://pub-test.r2.dev',
  );
});
