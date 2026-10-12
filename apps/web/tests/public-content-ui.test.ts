import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { meaningfulSummary } from '../src/lib/content-quality';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
const homepage = read('../src/app/(frontend)/page.tsx');
const drivers = read('../src/app/(frontend)/drivers/page.tsx');
const fleet = read('../src/app/(frontend)/fleet/page.tsx');
const services = read('../src/app/(frontend)/services/page.tsx');
const locations = read('../src/app/(frontend)/locations/page.tsx');
const serviceDetail = read('../src/app/(frontend)/services/[slug]/page.tsx');
const locationDetail = read('../src/app/(frontend)/locations/[slug]/page.tsx');
const cards = read('../src/components/public-content/index.tsx');
const payloadClient = read('../src/lib/cms/payload-client.ts');

test('meaningful summaries suppress names and repeated-name sequences', () => {
  assert.equal(meaningfulSummary('Abdullah al Mamun', 'Abdullah al Mamun'), undefined);
  assert.equal(
    meaningfulSummary('Shahriar Pavel Shahriar Pavel Shahriar Pavel', 'Shahriar Pavel'),
    undefined,
  );
  assert.equal(
    meaningfulSummary('Professional and attentive transportation service.', 'Shahriar Pavel'),
    'Professional and attentive transportation service.',
  );
});

test('homepage preserves approved display limits and exposes all four directory actions', () => {
  assert.match(homepage, /services\.slice\(0, 8\)/);
  assert.match(homepage, /fleet\.slice\(0, 6\)/);
  assert.match(homepage, /content\.drivers\.slice\(0, 6\)/);
  assert.match(homepage, /content\.locations\.slice\(0, 6\)/);
  for (const href of ['/services', '/fleet', '/drivers', '/locations']) {
    assert.match(homepage, new RegExp(`actionHref="${href}"`));
  }
});

test('shared cards link only to real CMS detail routes and use truthful missing-media labels', () => {
  assert.match(cards, /href=\{`\/drivers\/\$\{driver\.slug\}`\}/);
  assert.match(cards, /href=\{`\/fleet\/\$\{vehicle\.slug\}`\}/);
  assert.match(cards, /href=\{`\/services\/\$\{service\.slug\}`\}/);
  assert.match(cards, /href=\{`\/locations\/\$\{location\.slug\}`\}/);
  assert.match(cards, /Vehicle photo not available/);
  assert.match(cards, /Driver photo not available/);
  assert.doesNotMatch(cards, /CONCEPT ART|VehicleArt/);
});

test('all directories use shared heroes, cards, and honest empty states', () => {
  for (const source of [drivers, fleet, services, locations]) {
    assert.match(source, /<DirectoryHero/);
    assert.match(source, /<SectionHeading/);
    assert.match(source, /<ContentEmptyState/);
  }
  assert.match(drivers, /<DriverCard/);
  assert.match(fleet, /<FleetCard/);
  assert.match(services, /<ServiceCard/);
  assert.match(locations, /<LocationCard/);
});

test('service and location details preserve tracked booking and conditional CMS sections', () => {
  for (const source of [serviceDetail, locationDetail]) {
    assert.match(source, /<DetailBreadcrumb/);
    assert.match(source, /eventName="booking_click"/);
    assert.match(source, /href="\/book"/);
  }
  assert.match(serviceDetail, /page\.benefits\.length > 0/);
  assert.match(serviceDetail, /page\.locations\.length > 0/);
  assert.match(locationDetail, /page\.coverageAreas\.length > 0/);
  assert.match(locationDetail, /services\.length > 0/);
});

test('publication and seed filters remain enforced in both remote and Local API reads', () => {
  assert.match(payloadClient, /where\[_status\]\[equals\].*published/);
  assert.match(payloadClient, /where\[developmentSeed\]\[not_equals\].*true/);
  assert.match(payloadClient, /developmentSeed: \{ not_equals: true \}/);
  assert.match(payloadClient, /websiteApproved: \{ equals: true \}/);
});
