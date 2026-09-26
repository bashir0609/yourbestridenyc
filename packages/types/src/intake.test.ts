import { describe, expect, it } from 'vitest';
import { intakeSchema } from './intake';

const valid = {
  name: '  Alex Rider  ',
  email: ' Alex@Example.com ',
  message: '  I would like to learn more about your services.  ',
  consent: true,
};

describe('intakeSchema', () => {
  it('normalizes required fields and accepts omitted optional fields', () => {
    expect(intakeSchema.parse(valid)).toEqual({
      name: 'Alex Rider',
      email: 'alex@example.com',
      message: 'I would like to learn more about your services.',
      consent: true,
    });
  });

  it('normalizes empty optional fields', () => {
    const result = intakeSchema.parse({ ...valid, phone: ' ', service: ' ' });
    expect(result.phone).toBeUndefined();
    expect(result.service).toBeUndefined();
  });

  it('accepts and trims a formatted international phone number', () => {
    expect(intakeSchema.parse({ ...valid, phone: ' +1 (202) 555-0123 ' }).phone).toBe(
      '+1 (202) 555-0123',
    );
  });

  it.each([
    { name: ' ' },
    { name: 'x'.repeat(121) },
    { email: 'invalid' },
    { message: 'short' },
    { message: 'x'.repeat(5001) },
    { phone: '123' },
    { phone: '+1234567890123456' },
    { phone: 'call me tomorrow' },
    { service: 'x'.repeat(121) },
    { consent: false },
    { consent: 'true' },
    { consent: undefined },
    { role: 'admin' },
  ])('rejects invalid or unexpected fields: %j', (fields) => {
    expect(intakeSchema.safeParse({ ...valid, ...fields }).success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(intakeSchema.safeParse({}).success).toBe(false);
  });
});
