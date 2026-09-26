import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { randomBytes } from 'node:crypto';

// Finite production-server harness. Run after a build, with no external integration required.
async function availablePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function withServer(secret, run) {
  const port = await availablePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      env: { ...process.env, REVALIDATION_SECRET: secret, NEXT_TELEMETRY_DISABLED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  child.stdout.on('data', (data) => {
    output += data.toString();
  });
  child.stderr.on('data', (data) => {
    output += data.toString();
  });
  const stopped = once(child, 'exit');
  const deadline = setTimeout(() => child.kill(), 35000);
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      if (child.exitCode !== null) throw new Error('Smoke server stopped before startup');
      try {
        const response = await fetch(`${base}/robots.txt`, { signal: AbortSignal.timeout(500) });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        /* Wait for the production server to bind its port. */
      }
      await delay(100);
    }
    assert.ok(ready, 'Production server must start within the bounded startup window');
    await run(base);
  } catch (error) {
    console.error(output);
    throw error;
  } finally {
    clearTimeout(deadline);
    child.kill();
    await stopped;
  }
}

await withServer('', async (base) => {
  for (const path of [
    '/',
    '/book',
    '/legal/privacy',
    '/legal/terms',
    '/robots.txt',
    '/sitemap.xml',
  ]) {
    const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200, path);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    const body = await response.text();
    if (path === '/')
      for (const id of ['services', 'fleet', 'drivers', 'testimonials', 'coverage', 'contact'])
        assert.ok(body.includes(`id="${id}"`), id);
    if (path.startsWith('/legal/')) assert.ok(body.includes('Unpublished placeholder'));
  }
  assert.equal((await fetch(`${base}/legal/missing`)).status, 404);
  assert.equal((await fetch(`${base}/api/revalidate`, { method: 'POST' })).status, 404);
  console.log('PASS: production pages, security headers, legal 404, disabled revalidation');
});

await withServer(randomBytes(32).toString('hex'), async (base) => {
  const response = await fetch(`${base}/api/revalidate`, { method: 'POST', body: '{}' });
  assert.equal(response.status, 401);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await fetch(`${base}/api/revalidate`)).status, 405);
  console.log('PASS: missing authorization and unsupported method rejected');
});

const secret = randomBytes(32).toString('hex');
await withServer(secret, async (base) => {
  const send = (body, type = 'application/json') =>
    fetch(`${base}/api/revalidate`, {
      method: 'POST',
      headers: { authorization: `Bearer ${secret}`, 'content-type': type },
      body,
      signal: AbortSignal.timeout(5000),
    });
  assert.equal((await send('{}', 'text/plain')).status, 415);
  assert.equal((await send('not json')).status, 400);
  assert.equal((await send(JSON.stringify({ tags: ['arbitrary'] }))).status, 400);
  assert.equal((await send(JSON.stringify({ tags: ['cms:drivers'], path: '/' }))).status, 400);
  assert.equal((await send(' '.repeat(2049))).status, 413);
  const valid = await send(JSON.stringify({ tags: ['cms:drivers', 'cms:drivers'] }));
  assert.equal(valid.status, 200);
  assert.deepEqual(await valid.json(), { revalidated: true, tags: ['cms:drivers'] });
  console.log(
    'PASS: content type, malformed JSON, allowlist, body limit, authenticated tag invalidation',
  );
});
