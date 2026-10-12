import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const driverTemplate = readFileSync(
  new URL('../src/app/(frontend)/drivers/[slug]/page.tsx', import.meta.url),
  'utf8',
);
const fleetTemplate = readFileSync(
  new URL('../src/app/(frontend)/fleet/[slug]/page.tsx', import.meta.url),
  'utf8',
);
const cmsImage = readFileSync(
  new URL('../src/components/cms-content.tsx', import.meta.url),
  'utf8',
);

test('driver detail remains CMS-driven and provides tracked booking and directory actions', () => {
  assert.match(driverTemplate, /getDriverPage\(slug\)/);
  assert.match(driverTemplate, /image=\{page\.image\}/);
  assert.match(driverTemplate, /href="\/book"/);
  assert.match(driverTemplate, /eventName="booking_click"/);
  assert.match(driverTemplate, /button_location: 'profile_hero'/);
  assert.match(driverTemplate, /href="\/drivers"/);
  assert.doesNotMatch(driverTemplate, /award|certification|rating/i);
});

test('driver detail suppresses repeated CMS text without changing CMS records', () => {
  assert.match(driverTemplate, /meaningfulSummary\(page\.summary, page\.name\)/);
  assert.match(driverTemplate, /distinctText\(page\.experience, \[page\.name, page\.summary\]\)/);
  assert.match(driverTemplate, /page\.biography\.filter/);
});

test('fleet detail promotes the first CMS image and renders only additional images as gallery', () => {
  assert.match(fleetTemplate, /getFleetPage\(slug\)/);
  assert.match(fleetTemplate, /const primaryImage = page\.gallery\[0\]/);
  assert.match(fleetTemplate, /const additionalImages = page\.gallery\.slice\(1\)/);
  assert.match(fleetTemplate, /\{additionalImages\.length > 0 && \(/);
  assert.match(fleetTemplate, /href="\/fleet"/);
  assert.match(fleetTemplate, /button_location: 'vehicle_hero'/);
  assert.match(fleetTemplate, /eventName="booking_click"/);
});

test('CMS image enhancements preserve existing defaults', () => {
  assert.match(cmsImage, /preserveAspectRatio = false/);
  assert.match(cmsImage, /priority = false/);
  assert.match(cmsImage, /className\?: string/);
  assert.match(cmsImage, /sizes\?: string/);
});
