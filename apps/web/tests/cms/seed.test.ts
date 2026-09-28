import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDevelopmentSeedAllowed } from '../../src/seed/guard';
import { seedLocations, seedServices } from '../../src/seed/content';
import { seedDevelopmentContent, type SeedStore } from '../../src/seed/run';

const env = {
  NODE_ENV: 'development',
  ALLOW_DEVELOPMENT_SEED: 'true',
  DATABASE_URI: 'postgresql://localhost/development_seed_test',
};

test('guard accepts only explicit local development opt-in', () => {
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    assert.doesNotThrow(() =>
      assertDevelopmentSeedAllowed({
        ...env,
        DATABASE_URI: `postgres://user:password@${host}:5432/local`,
      }),
    );
  }
  for (const NODE_ENV of [undefined, '', 'test', 'production', 'Development']) {
    assert.throws(() => assertDevelopmentSeedAllowed({ ...env, NODE_ENV }));
  }
  for (const ALLOW_DEVELOPMENT_SEED of [undefined, '', 'false', '1', 'TRUE']) {
    assert.throws(() => assertDevelopmentSeedAllowed({ ...env, ALLOW_DEVELOPMENT_SEED }));
  }
  for (const marker of ['CI', 'VERCEL']) {
    for (const value of ['', 'false', '0', 'true']) {
      assert.throws(() => assertDevelopmentSeedAllowed({ ...env, [marker]: value }));
    }
  }
});

test('guard rejects remote, ambiguous, malformed and overridden database destinations', () => {
  for (const DATABASE_URI of [
    undefined,
    '',
    'not a URL',
    'https://localhost/db',
    'postgres://localhost',
    'postgres://production.example/db',
    'postgres://localhost.example/db',
    'postgres://localhost@production.example/db',
    'postgres://0.0.0.0/db',
    'postgres://[::]/db',
    'postgres://127.1/db',
    'postgres://2130706433/db',
    'postgres://%6cocalhost/db',
    'postgres://localhost,production.example/db',
    'postgres://localhost/db?host=production.example',
    'postgres://localhost/db?hostaddr=203.0.113.1',
    'postgres://localhost/db?sslmode=require',
    'postgres://localhost/db#remote',
  ]) {
    assert.throws(() => assertDevelopmentSeedAllowed({ ...env, DATABASE_URI }));
  }
});

test('fixtures contain exactly the requested draft services and boroughs, without claims or media', () => {
  assert.deepEqual(
    seedServices.map((record) => record.slug),
    ['medical', 'airport', 'corporate', 'private'],
  );
  assert.deepEqual(
    seedLocations.map((record) => record.slug),
    ['manhattan', 'brooklyn', 'queens', 'bronx', 'staten-island'],
  );
  for (const record of [...seedLocations, ...seedServices]) {
    assert.equal(record._status, 'draft');
    assert.equal(record.developmentSeed, true);
    assert.match('name' in record ? record.name : record.title, /^DEVELOPMENT SEED/);
    assert.match(record.summary, /^DEVELOPMENT SEED/);
    assert.ok(record.summary.length <= 300);
    const richText = 'description' in record ? record.description : record.content;
    assert.equal(richText.root.type, 'root');
    assert.equal(richText.root.version, 1);
    const paragraph = richText.root.children[0];
    assert.ok(paragraph);
    assert.equal(paragraph.type, 'paragraph');
    const text = paragraph.children[0];
    assert.ok(text);
    assert.match(text.text, /^DEVELOPMENT SEED/);
    for (const key of ['image', 'images', 'photo', 'reviews', 'rating', 'bookingCTA']) {
      assert.equal(key in record, false);
    }
  }
  for (const record of seedLocations) {
    assert.equal(record.countryCode, 'US');
    assert.deepEqual(record.coverageAreas, []);
    assert.deepEqual(record.relatedServices, []);
  }
  for (const record of seedServices) {
    for (const value of [record.serviceAreas, record.benefits, record.features, record.faqs]) {
      assert.deepEqual(value, []);
    }
  }
});

test('seed skips existing slugs unchanged, creates locations first, and is repeatable', async () => {
  const original = { title: 'Approved medical copy', _status: 'published' };
  const records = new Map<string, unknown>([['services/medical', original]]);
  const created: string[] = [];
  const store: SeedStore = {
    async exists(collection, slug) {
      return records.has(`${collection}/${slug}`);
    },
    async create(collection, data) {
      const key = `${collection}/${data.slug}`;
      assert.equal(records.has(key), false);
      records.set(key, data);
      created.push(collection);
    },
  };
  assert.deepEqual(await seedDevelopmentContent(store, env), { created: 8, skipped: 1 });
  assert.deepEqual(created, [...Array(5).fill('locations'), ...Array(3).fill('services')]);
  assert.equal(records.get('services/medical'), original);
  assert.deepEqual(await seedDevelopmentContent(store, env), { created: 0, skipped: 9 });
});

test('unsafe environment makes no store calls; create failures stop the run', async () => {
  const fail = async (): Promise<never> => {
    assert.fail('Store must not be called');
  };
  await assert.rejects(
    seedDevelopmentContent({ exists: fail, create: fail }, { ...env, CI: 'true' }),
  );
  let calls = 0;
  await assert.rejects(
    seedDevelopmentContent(
      {
        async exists() {
          return false;
        },
        async create() {
          calls++;
          throw new Error('Synthetic write failure');
        },
      },
      env,
    ),
    /Synthetic write failure/,
  );
  assert.equal(calls, 1);
});
