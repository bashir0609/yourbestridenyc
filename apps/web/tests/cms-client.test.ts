import test from 'node:test';
import assert from 'node:assert/strict';
import { createPayloadClient } from '../src/lib/cms/payload-client';
import { CMS_RESOURCES, type CmsResource } from '../src/lib/cms/types';
import { REVALIDATION_TAGS } from '../src/lib/revalidation';

const origin = 'https://cms.example.test';

test('public client sends publication-filtered, cached, credential-free requests', async () => {
  const calls: { url: URL; init?: RequestInit }[] = [];
  const fetcher: typeof fetch = async (url, init) => {
    calls.push({ url: new URL(String(url)), init });
    return Response.json({ docs: [] });
  };
  const client = createPayloadClient({ origin, fetcher });
  for (const resource of CMS_RESOURCES) assert.equal((await client.request(resource)).ok, true);
  assert.equal(calls.length, 6);
  for (const call of calls) {
    assert.equal(call.url.origin, origin);
    assert.equal(call.init?.credentials, 'omit');
    assert.equal(call.init?.redirect, 'error');
    assert.equal(call.init?.method, 'GET');
    assert.deepEqual(call.init?.headers, { Accept: 'application/json' });
    assert.equal(call.init?.next?.revalidate, 300);
    assert.ok(
      REVALIDATION_TAGS.includes(call.init?.next?.tags?.[0] as (typeof REVALIDATION_TAGS)[number]),
    );
    assert.equal(call.url.searchParams.get('draft'), 'false');
    if (!call.url.pathname.includes('/globals/')) {
      assert.equal(call.url.searchParams.get('where[_status][equals]'), 'published');
      assert.equal(call.url.searchParams.get('sort'), '-featured,displayOrder,id');
      assert.equal(call.url.searchParams.get('depth'), '1');
      assert.ok(Number(call.url.searchParams.get('limit')) <= 12);
    }
    if (/drivers|testimonials/.test(call.url.pathname))
      assert.equal(call.url.searchParams.get('where[websiteApproved][equals]'), 'true');
  }
  assert.equal(calls[0]?.url.searchParams.get('select[summary]'), 'true');
  assert.equal(calls[0]?.url.searchParams.has('select[content]'), false);
});

test('client rejects private resources and unconfigured or unsafe origins without fetching', async () => {
  let fetched = false;
  const fetcher: typeof fetch = async () => {
    fetched = true;
    return Response.json({});
  };
  for (const badOrigin of [
    undefined,
    'https://user:password@cms.example.test',
    'http://localhost:3001',
    'https://cms.example.test/path',
  ]) {
    assert.deepEqual(
      await createPayloadClient({ origin: badOrigin, fetcher }).request('services'),
      { ok: false, reason: 'unconfigured' },
    );
  }
  assert.deepEqual(
    await createPayloadClient({ origin, fetcher }).request('driver-applications' as CmsResource),
    { ok: false, reason: 'invalid' },
  );
  assert.equal(fetched, false);
  assert.equal(
    (
      await createPayloadClient({
        origin: 'http://localhost:3001',
        development: true,
        fetcher,
      }).request('services')
    ).ok,
    true,
  );
});

test('network, HTTP, non-JSON, malformed and oversized responses fail closed', async () => {
  const cases: [() => Promise<Response>, string][] = [
    [
      async () => {
        throw new Error('private upstream details');
      },
      'unavailable',
    ],
    [async () => new Response('secret upstream response', { status: 503 }), 'unavailable'],
    [async () => new Response('<html>login</html>'), 'invalid'],
    [
      async () => new Response('not-json', { headers: { 'content-type': 'application/json' } }),
      'invalid',
    ],
    [
      async () =>
        new Response('{}', {
          headers: { 'content-type': 'application/json', 'content-length': '262145' },
        }),
      'invalid',
    ],
    [async () => Response.json({ huge: 'x'.repeat(262145) }), 'invalid'],
  ];
  for (const [fetcher, reason] of cases) {
    const result = await createPayloadClient({ origin, fetcher }).request('services');
    assert.deepEqual(result, { ok: false, reason });
    assert.ok(!JSON.stringify(result).includes('private'));
  }
});

test('request deadline also bounds a fetch implementation that ignores abort', async () => {
  const started = Date.now();
  const result = await createPayloadClient({
    origin,
    fetcher: () => new Promise<Response>(() => {}),
  }).request('services');
  assert.deepEqual(result, { ok: false, reason: 'unavailable' });
  assert.ok(Date.now() - started < 6000);
});
