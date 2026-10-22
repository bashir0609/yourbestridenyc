import { createHash, timingSafeEqual } from 'node:crypto';

export const REVALIDATION_TAGS = [
  'cms:services',
  'cms:drivers',
  'cms:fleet-vehicles',
  'cms:testimonials',
  'cms:locations',
  'cms:site-settings',
  'leads:transportation',
  'leads:driver-applications',
  'cms:vehicle-classes',
  'cms:rate-cards',
  'cms:pricing-settings',
] as const;

export function authorized(header: string | null, secret: string | undefined): boolean {
  if (
    !secret ||
    secret.length < 32 ||
    !header ||
    header.length > 1024 ||
    !header.startsWith('Bearer ')
  )
    return false;
  const supplied = header.slice(7);
  const hash = (value: string) => createHash('sha256').update(value).digest();
  return timingSafeEqual(hash(supplied), hash(secret));
}

export function validateRevalidation(value: unknown): string[] | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).length !== 1 ||
    !Array.isArray(body.tags) ||
    body.tags.length < 1 ||
    body.tags.length > 6
  )
    return;
  if (
    !body.tags.every(
      (tag) =>
        typeof tag === 'string' &&
        REVALIDATION_TAGS.includes(tag as (typeof REVALIDATION_TAGS)[number]),
    )
  )
    return;
  return [...new Set(body.tags as string[])];
}
