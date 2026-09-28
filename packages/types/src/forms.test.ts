import { describe, expect, it } from 'vitest';
import { contactFormSchema, driverApplicationSchema, transportationInquirySchema } from './forms';

const contact = {
  name: '  Alex Rider ',
  email: ' ALEX@example.com ',
  phone: '+1 (202) 555-0123',
  message: ' I need help planning a ride. ',
};

const transportation = {
  fullName: 'Alex Rider',
  email: 'alex@example.com',
  phone: '+1 202 555 0123',
  serviceType: 'airport',
  pickupArea: 'Downtown',
  dropoffArea: 'Airport',
  message: 'Two passengers with luggage.',
  preferredDate: '',
  preferredTime: '',
};

const driver = {
  fullName: 'Alex Rider',
  email: 'alex@example.com',
  phone: '+1 202 555 0123',
  location: 'New York, NY',
  drivingExperience: 'Five years of professional driving.',
  licenseClass: 'Class D',
  availability: 'Weekdays',
  message: 'Available to begin next month.',
};

describe('public form schemas', () => {
  it('normalizes contact submissions', () => {
    expect(contactFormSchema.parse(contact)).toEqual({
      ...contact,
      name: 'Alex Rider',
      email: 'alex@example.com',
      message: 'I need help planning a ride.',
    });
  });

  it('normalizes empty optional transportation fields', () => {
    expect(transportationInquirySchema.parse(transportation)).toMatchObject({
      preferredDate: undefined,
      preferredTime: undefined,
    });
  });

  it('accepts a valid driver application', () => {
    expect(driverApplicationSchema.safeParse(driver).success).toBe(true);
  });

  it.each([
    [contactFormSchema, { ...contact, email: 'invalid' }],
    [contactFormSchema, { ...contact, admin: true }],
    [transportationInquirySchema, { ...transportation, pickupArea: '' }],
    [driverApplicationSchema, { ...driver, message: 'short' }],
  ])('rejects invalid or extra data', (schema, value) => {
    expect(schema.safeParse(value).success).toBe(false);
  });
});
