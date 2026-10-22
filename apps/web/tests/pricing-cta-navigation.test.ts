import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transportationInquirySchema } from '@yourbestride/types';
import { createIntakeHandler } from '../src/lib/intake';

const read = (relPath: string) =>
  readFileSync(new URL(relPath, import.meta.url), 'utf8');

const ratesAndOptionsTabs = read('../src/components/rates-and-options/RatesAndOptionsTabs.tsx');
const ratesAndOptionsPage = read('../src/app/(frontend)/rates-and-options/page.tsx');
const fleetPage = read('../src/app/(frontend)/fleet/page.tsx');
const fleetDetail = read('../src/app/(frontend)/fleet/[slug]/page.tsx');
const serviceDetail = read('../src/app/(frontend)/services/[slug]/page.tsx');
const publicCards = read('../src/components/public-content/index.tsx');
const inquiryForm = read('../src/components/forms/TransportationInquiryForm.tsx');

test('Rates & Options: uses standard URLs with query before fragment', () => {
  assert.match(ratesAndOptionsPage, /id="rates-inquiry"/);
  assert.match(inquiryForm, /export function TransportationInquiryForm/);

  // Fixed route links use standard URL structure: /rates-and-options?...#rates-inquiry
  assert.match(ratesAndOptionsTabs, /href="\/rates-and-options\?service=airport#rates-inquiry"/);
  assert.match(ratesAndOptionsTabs, /href=\{\`\/rates-and-options\?service=airport&route=/);

  // Hourly links use standard URL structure
  assert.match(ratesAndOptionsTabs, /href="\/rates-and-options\?service=corporate&pricingModel=hourly#rates-inquiry"/);
  assert.match(ratesAndOptionsTabs, /href=\{\`\/rates-and-options\?service=corporate&pricingModel=hourly&vehicleClass=/);

  // Mileage links use standard URL structure
  assert.match(ratesAndOptionsTabs, /href="\/rates-and-options\?service=private&pricingModel=mileage#rates-inquiry"/);

  // Custom package links use standard URL structure
  assert.match(ratesAndOptionsTabs, /href="\/rates-and-options\?service=corporate&package=roadshow#rates-inquiry"/);
  assert.match(ratesAndOptionsTabs, /href="\/rates-and-options\?service=private&package=wedding#rates-inquiry"/);
  assert.match(ratesAndOptionsTabs, /href="\/rates-and-options\?service=airport&package=meet-greet#rates-inquiry"/);

  // Vehicle class overview cards use standard URL structure
  assert.match(ratesAndOptionsTabs, /href=\{\`\/rates-and-options\?vehicleClass=\${encodeURIComponent\(vClass\.name\)}#rates-inquiry\`\}/);

  // Fleet directory cards use standard URL structure: /fleet?...#fleet-inquiry
  assert.match(publicCards, /href=\{\`\/fleet\?vehicle=\${encodeURIComponent\(vehicle\.title\)}/);
});

test('Customer-facing copy: adopts approved non-misleading wording across all pages', () => {
  // Approved wording present
  assert.match(ratesAndOptionsTabs, /Request a Custom Quote/);
  assert.match(ratesAndOptionsTabs, /Check Availability & Book/);
  assert.match(ratesAndOptionsTabs, /Final fare confirmed during booking/);

  assert.match(serviceDetail, /Request a Custom Quote/);
  assert.match(serviceDetail, /Check Availability & Book/);

  assert.match(fleetDetail, /Check Availability & Book/);
  assert.match(fleetDetail, /Final fare confirmed during booking/);

  // Forbidden misleading or internal backend wording absent
  const forbiddenPhrases = [
    /guaranteed quote/i,
    /live meter/i,
    /guaranteed availability/i,
    /\bores\b/i,
    /book in ores/i,
  ];

  for (const forbidden of forbiddenPhrases) {
    assert.doesNotMatch(ratesAndOptionsTabs, forbidden);
    assert.doesNotMatch(serviceDetail, forbidden);
    assert.doesNotMatch(fleetDetail, forbidden);
    assert.doesNotMatch(publicCards, forbidden);
  }
});

test('Rates & Options: tab navigation controls and empty state protections', () => {
  // Tab switcher and popstate listener
  assert.match(ratesAndOptionsTabs, /handleTabChange\('fixed'\)|handleTabChange\(tab\.key\)/);
  assert.match(ratesAndOptionsTabs, /getInitialTab\(\)/);
  assert.match(ratesAndOptionsTabs, /window\.addEventListener\('popstate'/);

  // Empty state actions (when no published rate cards) do not present Book Now as a flat rate
  assert.match(ratesAndOptionsTabs, /Check Availability & Book/);
  assert.match(ratesAndOptionsTabs, /Request a Custom Quote/);
});

test('Fleet pages: directory and vehicle detail provide complete 3-tier actions', () => {
  // Fleet directory card
  assert.match(publicCards, /fleet-card-actions/);
  assert.match(publicCards, /Check Availability & Book/);
  assert.match(publicCards, /button_location: 'fleet_card'/);
  assert.match(publicCards, /Request This Vehicle/);
  assert.match(publicCards, /View Class Rates/);

  // Fleet directory page has matching inquiry section id
  assert.match(fleetPage, /id="fleet-inquiry"/);
  assert.match(fleetPage, /<TransportationInquiryForm sourcePage="\/fleet"/);

  // Fleet detail hero actions
  assert.match(fleetDetail, /Check Availability & Book/);
  assert.match(fleetDetail, /button_location: 'vehicle_hero'/);
  assert.match(fleetDetail, /href="#vehicle-inquiry"/);
  assert.match(fleetDetail, /Request This Vehicle/);
  assert.match(fleetDetail, /View Class Rates/);
  assert.match(fleetDetail, /href="\/fleet"/);

  // Dedicated inquiry section on fleet detail
  assert.match(fleetDetail, /id="vehicle-inquiry"/);
  assert.match(fleetDetail, /<TransportationInquiryForm/);
  assert.match(fleetDetail, /initialVehicle=\{page\.title\}/);
  assert.match(fleetDetail, /initialVehicleClass=\{page\.vehicleClass\?\.name\}/);
});

test('Service pages: provide service-specific Request a Quote and Book Now actions', () => {
  // Hero section has both Check Availability & Book and Request a Custom Quote
  assert.match(serviceDetail, /href="\/book"/);
  assert.match(serviceDetail, /button_location: 'service_hero'/);
  assert.match(serviceDetail, /href="#service-inquiry"/);
  assert.match(serviceDetail, /Request a Custom Quote/);

  // Pricing section provides service-specific actions
  assert.match(serviceDetail, /Request a Custom Quote/);
  assert.match(serviceDetail, /Check Availability & Book/);
  assert.match(serviceDetail, /\/rates-and-options\?tab=\${serviceTab}/);

  // Inquiry form has initialServiceType prefilled
  assert.match(serviceDetail, /initialServiceType=\{serviceInquiryType\}/);

  // Footer CTA has both booking and quote actions
  assert.match(serviceDetail, /service-footer-cta-group/);
});

test('Prefilled enquiry scenarios: all 7 required scenarios preserve context and satisfy schema', () => {
  const scenarios = [
    {
      name: 'Toyota RAV4',
      payload: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1 212 555 0101',
        serviceType: 'private',
        pickupArea: 'Manhattan, NY',
        dropoffArea: 'JFK Airport, NY',
        message: 'I would like to request a custom quote for the Toyota RAV4 (Standard SUV) for my upcoming journey.',
      },
    },
    {
      name: 'Cadillac XT6',
      payload: {
        fullName: 'Robert Smith',
        email: 'robert@example.com',
        phone: '+1 212 555 0102',
        serviceType: 'private',
        pickupArea: 'Wall Street, NY',
        dropoffArea: 'EWR Airport, NJ',
        message: 'I would like to request a custom quote for the Cadillac XT6 (Premium Crossover SUV) for my upcoming journey.',
      },
    },
    {
      name: 'Airport Transfer',
      payload: {
        fullName: 'Emily Davis',
        email: 'emily@example.com',
        phone: '+1 212 555 0103',
        serviceType: 'airport',
        pickupArea: 'JFK International Airport',
        dropoffArea: 'Midtown Manhattan',
        message: 'I am requesting a custom quote for JFK Airport ↔ Manhattan (Standard SUV).',
      },
    },
    {
      name: 'Hourly Charter',
      payload: {
        fullName: 'Michael Brown',
        email: 'michael@example.com',
        phone: '+1 212 555 0104',
        serviceType: 'corporate',
        pickupArea: 'Midtown Manhattan',
        dropoffArea: 'As-directed financial district itinerary',
        message: 'I am requesting an hourly charter quote for the Standard SUV vehicle class (3 hours minimum).',
      },
    },
    {
      name: 'Corporate Roadshow',
      payload: {
        fullName: 'Sarah Wilson',
        email: 'sarah@example.com',
        phone: '+1 212 555 0105',
        serviceType: 'corporate',
        pickupArea: 'Grand Central, NY',
        dropoffArea: 'Multi-stop Manhattan financial tour',
        message: 'I would like to request a custom quote for corporate roadshow transportation.',
      },
    },
    {
      name: 'Wedding Transportation',
      payload: {
        fullName: 'David Lee',
        email: 'david@example.com',
        phone: '+1 212 555 0106',
        serviceType: 'private',
        pickupArea: 'Upper East Side, NY',
        dropoffArea: 'Oheka Castle, Long Island',
        message: 'I would like to request a custom quote for wedding and celebration transportation.',
      },
    },
    {
      name: 'Custom Mileage Quote',
      payload: {
        fullName: 'Laura Taylor',
        email: 'laura@example.com',
        phone: '+1 212 555 0107',
        serviceType: 'private',
        pickupArea: 'Manhattan, NY',
        dropoffArea: 'Hamptons, Long Island',
        message: 'I would like to request a custom distance / mileage quote for my planned itinerary.',
      },
    },
  ];

  for (const scenario of scenarios) {
    const result = transportationInquirySchema.safeParse(scenario.payload);
    assert.ok(
      result.success,
      `Scenario "${scenario.name}" must strictly validate with transportationInquirySchema`
    );
    assert.ok(
      scenario.payload.message.length >= 10,
      `Scenario "${scenario.name}" message must have >= 10 characters`
    );
  }
});

test('Enquiry submission contract: processes quote requests through intake handler without side-effects', async () => {
  const mockEnv = {
    SITE_URL: 'https://www.yourbestride.com',
    INTAKE_API_SECRET: 'test-intake-secret',
    INTAKE_HASH_SECRET: 'test-hash-secret',
  };

  const storedPayloads: Array<Record<string, unknown>> = [];
  const notifications: Array<Record<string, unknown>> = [];

  const mockFetcher: typeof fetch = async (_input, init) => {
    const headers = new Headers(init?.headers);
    assert.equal(headers.get('authorization'), 'Bearer test-intake-secret');
    const body = JSON.parse(init?.body as string);
    storedPayloads.push(body);
    return Response.json({ ok: true }, { status: 202 });
  };

  const mockNotify = async (input: { kind: string; data: unknown }) => {
    notifications.push(input as unknown as Record<string, unknown>);
  };

  const handler = createIntakeHandler(
    { kind: 'transportation', source: 'web', schema: transportationInquirySchema },
    {
      fetch: mockFetcher,
      notify: mockNotify as unknown as NonNullable<Parameters<typeof createIntakeHandler>[1]>['notify'],
      env: mockEnv,
    }
  );

  const testPayload = {
    data: {
      fullName: 'Alexander Hamilton',
      email: 'alexander@example.com',
      phone: '+1 212 555 1789',
      serviceType: 'corporate',
      pickupArea: 'Financial District, NY',
      dropoffArea: 'Albany, NY',
      message: 'I would like to request a custom quote for corporate roadshow transportation.',
    },
    sourcePage: '/rates-and-options',
    website: '', // honeypot empty
  };

  const req = new Request('https://www.yourbestride.com/api/inquiries/transportation', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-real-ip': '198.51.100.42',
    },
    body: JSON.stringify(testPayload),
  });

  const res = await handler(req);
  assert.equal(res.status, 201, 'Handler must return 201 for valid transportation inquiry');

  const json = await res.json();
  assert.deepEqual(json, { success: true });

  assert.equal(storedPayloads.length, 1, 'Inquiry must be forwarded to internal store');
  const stored = storedPayloads[0];
  assert.ok(stored);
  assert.equal(stored.sourceCampaign, 'web');
  assert.equal(stored.type, 'transportation-lead');
  assert.equal(stored.sourcePage, '/rates-and-options');

  assert.equal(notifications.length, 1, 'Email notification must be triggered for transportation inquiry');
  const notif = notifications[0];
  assert.ok(notif);
  assert.equal(notif.kind, 'transportation');
});
