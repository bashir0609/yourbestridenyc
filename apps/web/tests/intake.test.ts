import test from 'node:test';
import assert from 'node:assert/strict';
import { contactFormSchema } from '@yourbestride/types';
import { createFingerprint, createIntakeHandler, getTrustedRequestIp } from '../src/lib/intake';

const env = {
  SITE_URL: 'https://www.example.com',
  INTAKE_API_SECRET: 'intake-secret',
  INTAKE_HASH_SECRET: 'hash-secret',
};
const valid = {
  data: {
    name: 'Alex',
    email: 'alex@example.com',
    phone: '+1 202 555 0123',
    message: 'Please contact me about a ride.',
  },
  sourcePage: '/',
  website: '',
};

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://www.example.com/api/inquiries/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.10', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function handler(fetcher: typeof fetch, notify = async () => {}) {
  return createIntakeHandler(
    { kind: 'contact', source: 'web', schema: contactFormSchema },
    { fetch: fetcher, notify, env },
  );
}

test('extracts trusted proxy IP and creates deterministic non-reversible fingerprint', () => {
  assert.equal(
    getTrustedRequestIp(new Headers({ 'x-forwarded-for': '203.0.113.1, 10.0.0.1' })),
    '203.0.113.1',
  );
  assert.equal(
    createFingerprint('203.0.113.1', 'secret'),
    createFingerprint('203.0.113.1', 'secret'),
  );
  assert.notEqual(
    createFingerprint('203.0.113.1', 'secret'),
    createFingerprint('203.0.113.2', 'secret'),
  );
});

test('forwards the exact internal intake contract and notifies after storage', async () => {
  const events: string[] = [];
  let forwarded: Record<string, unknown> | undefined;
  const post = handler(
    async (_input, init) => {
      events.push('stored');
      const headers = new Headers(init?.headers);
      assert.equal(headers.get('authorization'), 'Bearer intake-secret');
      assert.equal(
        headers.get('x-intake-fingerprint'),
        createFingerprint('203.0.113.10', 'hash-secret'),
      );
      forwarded = JSON.parse(String(init?.body));
      return new Response(null, { status: 202 });
    },
    async () => {
      events.push('notified');
    },
  );
  const response = await post(request(valid));
  assert.equal(response.status, 201);
  assert.deepEqual(events, ['stored', 'notified']);
  assert.deepEqual(forwarded, {
    type: 'contact-lead',
    sourcePage: '/',
    sourceCampaign: 'web',
    data: valid.data,
  });
});

test('fails closed for missing configuration or trusted IP', async () => {
  const fetcher: typeof fetch = async () => new Response(null, { status: 202 });
  const unconfigured = createIntakeHandler(
    { kind: 'contact', source: 'web', schema: contactFormSchema },
    { fetch: fetcher, notify: async () => {}, env: {} },
  );
  assert.equal((await unconfigured(request(valid))).status, 503);
  const noIp = new Request('https://www.example.com/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(valid),
  });
  assert.equal((await handler(fetcher)(noIp)).status, 400);
});

test('rejects wrong content type, oversized bodies, malformed JSON, and invalid fields', async () => {
  const fetcher: typeof fetch = async () => new Response(null, { status: 202 });
  const post = handler(fetcher);
  assert.equal((await post(request(valid, { 'content-type': 'text/plain' }))).status, 415);
  assert.equal((await post(request(valid, { 'content-length': '40000' }))).status, 413);
  assert.equal((await post(request('{'))).status, 400);
  assert.equal((await post(request({ ...valid, unexpected: true }))).status, 400);
});

test('honeypot returns generic success without storage or email', async () => {
  let called = false;
  const post = handler(
    async () => {
      called = true;
      return new Response(null, { status: 202 });
    },
    async () => {
      called = true;
    },
  );
  assert.equal((await post(request({ ...valid, website: 'spam.example' }))).status, 201);
  assert.equal(called, false);
});

test('passes through internal rate limiting and does not notify failed storage', async () => {
  let notified = false;
  const post = handler(
    async () => new Response(null, { status: 429 }),
    async () => {
      notified = true;
    },
  );
  assert.equal((await post(request(valid))).status, 429);
  assert.equal(notified, false);
});

test('email failure does not turn a stored submission into failure', async () => {
  const post = handler(
    async () => new Response(null, { status: 202 }),
    async () => {
      throw new Error('email unavailable');
    },
  );
  assert.equal((await post(request(valid))).status, 201);
});
