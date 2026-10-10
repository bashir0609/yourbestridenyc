import { z } from 'zod';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value === '' ? undefined : value));

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone is required')
  .max(40)
  .refine(
    (value) =>
      /^\+?[\d\s().-]+$/.test(value) &&
      value.replace(/\D/g, '').length >= 7 &&
      value.replace(/\D/g, '').length <= 15,
    'Enter a phone number with 7 to 15 digits',
  );

/**
 * Transportation Inquiry Form Schema
 * Fields: fullName, email, phone, serviceType, pickupArea, dropoffArea, message
 * Optional: preferredDate, preferredTime
 */
export const transportationInquirySchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required').max(120),
    email: z.string().trim().max(254).email('Enter a valid email address').toLowerCase(),
    phone: phoneSchema,
    serviceType: z.string().trim().min(1, 'Service type is required').max(60),
    pickupArea: z.string().trim().min(1, 'Pickup area is required').max(120),
    dropoffArea: z.string().trim().min(1, 'Dropoff area is required').max(120),
    message: z.string().trim().min(10, 'Please provide at least 10 characters').max(5000),
    preferredDate: optionalText(20),
    preferredTime: optionalText(20),
  })
  .strict();

export type TransportationInquiryInput = z.input<typeof transportationInquirySchema>;
export type TransportationInquirySubmission = z.output<typeof transportationInquirySchema>;

/**
 * Driver Application Form Schema
 * Fields: fullName, email, phone, location, drivingExperience, licenseClass, availability, message
 */
export const driverApplicationSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Full name is required').max(120),
    email: z.string().trim().max(254).email('Enter a valid email address').toLowerCase(),
    phone: phoneSchema,
    location: z.string().trim().min(1, 'Location is required').max(120),
    drivingExperience: z.string().trim().min(1, 'Driving experience is required').max(2000),
    licenseClass: z.string().trim().min(1, 'License class is required').max(60),
    availability: z.string().trim().min(1, 'Availability is required').max(500),
    message: z.string().trim().min(10, 'Please provide at least 10 characters').max(5000),
  })
  .strict();

export type DriverApplicationInput = z.input<typeof driverApplicationSchema>;
export type DriverApplicationSubmission = z.output<typeof driverApplicationSchema>;

/**
 * Contact Form Schema
 * Fields: name, email, phone, message
 */
export const contactFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    email: z.string().trim().max(254).email('Enter a valid email address').toLowerCase(),
    phone: phoneSchema,
    message: z.string().trim().min(10, 'Please provide at least 10 characters').max(5000),
  })
  .strict();

export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ContactFormSubmission = z.output<typeof contactFormSchema>;
