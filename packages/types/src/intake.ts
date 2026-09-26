import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

export const intakeSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    email: z.string().trim().max(254).email('Enter a valid email address').toLowerCase(),
    phone: z
      .string()
      .trim()
      .max(40)
      .refine(
        (value) =>
          value === '' ||
          (/^\+?[\d\s().-]+$/.test(value) &&
            value.replace(/\D/g, '').length >= 7 &&
            value.replace(/\D/g, '').length <= 15),
        'Enter a phone number with 7 to 15 digits',
      )
      .optional()
      .transform((value) => (value === '' ? undefined : value)),
    service: optionalText(120),
    message: z.string().trim().min(10, 'Please provide at least 10 characters').max(5000),
    consent: z.literal(true, {
      errorMap: () => ({ message: 'Consent is required' }),
    }),
  })
  .strict();

export type IntakeInput = z.input<typeof intakeSchema>;
export type IntakeSubmission = z.output<typeof intakeSchema>;
