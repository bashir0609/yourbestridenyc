import assert from 'node:assert/strict';
import test from 'node:test';
import type { PayloadRequest } from 'payload';
import {
  consumeRateLimit,
  createPublicIntakeEndpoint,
  mapSubmission,
  readStrictJSON,
  validBearer,
  validFingerprint,
  validateEnvelope,
} from '../../src/publicIntake';

const secret = 'intake-test-secret-with-at-least-32-characters';
const fingerprint = 'a'.repeat(64);
const transportation = {
  type: 'transportation-lead',
  sourcePage: '/request-a-ride',
  sourceCampaign: 'spring',
  data: {
    fullName: '  Jane Rider  ',
    email: 'JANE@EXAMPLE.COM',
    phone: '+1 555 555 1212',
    serviceType: 'Airport transfer',
    pickupArea: 'Downtown',
    dropoffArea: 'Airport',
    message: 'Please call when the driver arrives.',
    preferredDate: '2026-10-01',
    preferredTime: '10:30',
  },
} as const;

const contact = {
  type: 'contact-lead',
  sourcePage: '/',
  data: {
    name: 'Casey Contact',
    email: 'casey@example.com',
    phone: '+1 555 555 3434',
    message: 'Please contact me about transportation options.',
  },
} as const;

const application = {
  type: 'driver-application',
  sourcePage: 'https://www.example.com/drive',
  data: {
    fullName: 'Alex Driver',
    email: 'alex@example.com',
    phone: '+1 555 555 2323',
    location: 'Chicago',
    drivingExperience: 'Eight years of professional driving.',
    licenseClass: 'CDL B',
    availability: 'Weekdays and weekends',
    message: 'I would like to join your driving team.',
  },
} as const;

test('bearer and HMAC fingerprint validation fail closed', () => {
  assert.equal(validBearer(`Bearer ${secret}`, secret), true);
  for (const value of [null, secret, 'Basic abc', 'Bearer wrong'])
    assert.equal(validBearer(value, secret), false);
  assert.equal(validFingerprint(fingerprint), true);
  for (const value of [null, '', 'A'.repeat(64), 'a'.repeat(63), 'g'.repeat(64)])
    assert.equal(validFingerprint(value), false);
});

test('strict envelope validation accepts shared form contracts and rejects extra/internal data', () => {
  const lead = validateEnvelope(transportation);
  assert.ok(lead);
  assert.equal(lead.data.fullName, 'Jane Rider');
  assert.equal(lead.data.email, 'jane@example.com');
  assert.ok(validateEnvelope(application));
  assert.ok(validateEnvelope(contact));

  assert.equal(validateEnvelope({ ...transportation, assignedTo: 1 }), null);
  assert.equal(validateEnvelope({ ...transportation, sourcePage: '//evil.example' }), null);
  assert.equal(
    validateEnvelope({ ...transportation, data: { ...transportation.data, crmStatus: 'booked' } }),
    null,
  );
  assert.equal(
    validateEnvelope({ ...application, data: { ...application.data, medicalHistory: 'x' } }),
    null,
  );
});

test('strict JSON reader enforces media type, UTF-8 JSON, and body size', async () => {
  const valid = new Request('https://cms.example/api/public-intake', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(transportation),
  });
  assert.deepEqual(await readStrictJSON(valid), transportation);

  await assert.rejects(
    readStrictJSON(new Request('https://cms.example', { method: 'POST', body: '{}' })),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 415,
  );
  await assert.rejects(
    readStrictJSON(
      new Request('https://cms.example', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'content-length': '20000' },
        body: '{}',
      }),
    ),
    (error: unknown) => error instanceof Error && 'status' in error && error.status === 413,
  );
});

test('mappings set trusted fields and never map internal caller-controlled fields', () => {
  const now = new Date('2026-09-27T12:00:00.000Z');
  const leadEnvelope = validateEnvelope(transportation);
  const applicationEnvelope = validateEnvelope(application);
  assert.ok(leadEnvelope);
  assert.ok(applicationEnvelope);
  const lead = mapSubmission(leadEnvelope, now);
  assert.equal(lead.collection, 'transportation-leads');
  assert.deepEqual(lead.data, {
    source: 'public-intake',
    sourcePage: '/request-a-ride',
    sourceCampaign: 'spring',
    consentToContact: true,
    consentRecordedAt: now.toISOString(),
    name: 'Jane Rider',
    email: 'jane@example.com',
    phone: '+1 555 555 1212',
    serviceType: 'Airport transfer',
    pickupLocation: 'Downtown',
    dropoffLocation: 'Airport',
    preferredDate: '2026-10-01',
    preferredTime: '10:30',
    message: 'Please call when the driver arrives.',
    crmStatus: 'new',
  });
  const contactEnvelope = validateEnvelope(contact);
  assert.ok(contactEnvelope);
  const contactLead = mapSubmission(contactEnvelope, now);
  assert.equal(contactLead.collection, 'transportation-leads');
  assert.equal(contactLead.data.serviceType, 'Contact');
  assert.equal('pickupLocation' in contactLead.data, false);
  assert.equal('dropoffLocation' in contactLead.data, false);

  const driver = mapSubmission(applicationEnvelope, now);
  assert.equal(driver.collection, 'driver-applications');
  assert.equal(driver.data.status, 'new');
  assert.equal(driver.data.licenseClass, 'CDL B');
  assert.equal('assignedTo' in driver.data, false);
  assert.equal('internalNotes' in driver.data, false);
});

test('database slot helper shares a five-request window and rejects the sixth', async () => {
  const claims = new Set<string>();
  const payload = {
    async delete() {
      return { docs: [], errors: [] };
    },
    async create(args: { data: { claimKey: string } }) {
      if (claims.has(args.data.claimKey)) throw new Error('duplicate');
      claims.add(args.data.claimKey);
      return args.data;
    },
    async find(args: { where: { claimKey: { equals: string } } }) {
      return { totalDocs: claims.has(args.where.claimKey.equals) ? 1 : 0, docs: [] };
    },
  };
  const now = new Date('2026-09-27T12:00:30.000Z');
  for (let request = 0; request < 5; request += 1)
    assert.equal(await consumeRateLimit(payload as never, fingerprint, now), true);
  assert.equal(await consumeRateLimit(payload as never, fingerprint, now), false);
  assert.equal(
    await consumeRateLimit(payload as never, fingerprint, new Date('2026-09-27T12:01:00.000Z')),
    true,
  );
});

test('endpoint authenticates before parsing and uses overrideAccess for local creation', async () => {
  const endpoint = createPublicIntakeEndpoint(secret);
  const unauthorized = await endpoint.handler({
    headers: new Headers(),
  } as PayloadRequest);
  assert.equal(unauthorized.status, 401);

  const created: Array<Record<string, unknown>> = [];
  const claims = new Set<string>();
  const request = new Request('https://cms.example/api/public-intake', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secret}`,
      'content-type': 'application/json',
      'x-intake-fingerprint': fingerprint,
    },
    body: JSON.stringify(application),
  }) as PayloadRequest;
  request.payload = {
    async delete() {
      return { docs: [], errors: [] };
    },
    async find(args: { where: { claimKey: { equals: string } } }) {
      return { totalDocs: claims.has(args.where.claimKey.equals) ? 1 : 0, docs: [] };
    },
    async create(args: Record<string, unknown>) {
      if (args.collection === 'public-intake-rate-limits') {
        claims.add((args.data as { claimKey: string }).claimKey);
      } else created.push(args);
      return args;
    },
    logger: { error() {} },
  } as never;
  const accepted = await endpoint.handler(request);
  assert.equal(accepted.status, 202);
  assert.equal(created.length, 1);
  assert.equal(created[0]?.collection, 'driver-applications');
  assert.equal(created[0]?.overrideAccess, true);
  assert.equal(created[0]?.req, request);
});
