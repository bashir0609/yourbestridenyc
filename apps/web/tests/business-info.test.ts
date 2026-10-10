import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPhoneDisplay,
  localBusinessJsonLd,
  OFFICIAL_BUSINESS,
} from '../src/lib/business-info';

test('official business contact details use accessible US phone formats', () => {
  assert.equal(OFFICIAL_BUSINESS.name, 'Your Best Ride Inc.');
  assert.equal(OFFICIAL_BUSINESS.primaryPhone.e164, '+13477409782');
  assert.equal(OFFICIAL_BUSINESS.primaryPhone.display, '(347) 740-9782');
  assert.equal(OFFICIAL_BUSINESS.secondaryPhone.e164, '+13478860002');
  assert.equal(OFFICIAL_BUSINESS.secondaryPhone.display, '(347) 886-0002');
  assert.equal(formatPhoneDisplay('+13477409782'), '(347) 740-9782');
});

test('LocalBusiness structured data includes approved contact details without EIN', () => {
  const jsonLd = localBusinessJsonLd('https://yourbestridenyc.com');
  assert.equal(jsonLd.name, 'Your Best Ride Inc.');
  assert.equal(jsonLd.telephone, '+13477409782');
  assert.equal(jsonLd.faxNumber, '+13477409782');
  assert.deepEqual(jsonLd.address, {
    '@type': 'PostalAddress',
    streetAddress: '169-20 Hillside Ave, Suite 03',
    addressLocality: 'Queens',
    addressRegion: 'NY',
    postalCode: '11432',
    addressCountry: 'US',
  });
  assert.doesNotMatch(JSON.stringify(jsonLd), /taxID|vatID|ein/i);
});
