import { contactEmail, contactPhone, httpsUrl, siteOrigin } from '../config';
import type {
  EditorialCard,
  Driver,
  Testimonial,
  SiteSettings,
  FleetVehicle,
  PublicImage,
} from './types';

type RecordValue = Record<string, unknown>;
export function record(value: unknown): RecordValue | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : undefined;
}

export function text(value: unknown, max = 300): string | undefined {
  if (typeof value !== 'string') return;
  const trimmed = value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  return trimmed && trimmed.length <= max ? trimmed : undefined;
}

export function mapImage(value: unknown, mediaOrigin?: string): PublicImage | undefined {
  const allowedOrigin = siteOrigin(mediaOrigin);
  const doc = record(value);
  if (!allowedOrigin || !doc) return;
  const url = httpsUrl(text(doc.url, 2048));
  const alt = text(doc.alt, 250);
  if (
    !url ||
    !alt ||
    !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(String(doc.mimeType))
  )
    return;
  const parsed = new URL(url);
  if (
    parsed.origin !== allowedOrigin ||
    !parsed.pathname.startsWith('/media/') ||
    parsed.search ||
    parsed.hash
  )
    return;
  const width = doc.width;
  const height = doc.height;
  if (
    typeof width !== 'number' ||
    typeof height !== 'number' ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 20000 ||
    height > 20000
  )
    return;
  return { url, alt, width, height };
}

function published(doc: RecordValue): boolean {
  return doc._status === 'published';
}
function slug(doc: RecordValue): string | undefined {
  const value = text(doc.slug, 100);
  return value && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : undefined;
}

function documents(payload: unknown): RecordValue[] {
  const docs = record(payload)?.docs;
  return Array.isArray(docs)
    ? docs
        .slice(0, 50)
        .map(record)
        .filter((doc): doc is RecordValue => !!doc)
    : [];
}

function unique<T extends { slug: string }>(items: T[]): T[] {
  return items.filter(
    (item, index) => items.findIndex((other) => other.slug === item.slug) === index,
  );
}

export function mapEditorial(payload: unknown, mediaOrigin?: string): EditorialCard[] {
  return unique(
    documents(payload).flatMap((doc) => {
      const id = slug(doc);
      const title = text(doc.title ?? doc.name, 90);
      const summary = text(doc.summary, 300);
      const image = mapImage(doc.image, mediaOrigin);
      return published(doc) && doc.developmentSeed !== true && id && title && summary
        ? [{ slug: id, title, summary, ...(image ? { image } : {}) }]
        : [];
    }),
  );
}

export function mapDrivers(payload: unknown, mediaOrigin?: string): Driver[] {
  return unique(
    documents(payload).flatMap((doc) => {
      const id = slug(doc);
      const name = text(doc.name ?? doc.title, 90);
      const summary = text(doc.summary, 300);
      const image = mapImage(doc.photo, mediaOrigin);
      return published(doc) && doc.websiteApproved === true && id && name && summary
        ? [{ slug: id, name, summary, ...(image ? { image } : {}) }]
        : [];
    }),
  );
}

export function mapTestimonials(payload: unknown): Testimonial[] {
  return unique(
    documents(payload).flatMap((doc) => {
      const id = slug(doc);
      const name = text(doc.attribution ?? doc.name, 90);
      const quote = text(doc.quote, 600);
      return published(doc) && doc.websiteApproved === true && id && name && quote
        ? [{ slug: id, name, quote }]
        : [];
    }),
  );
}

export function mapSettings(payload: unknown): SiteSettings {
  const doc = record(payload);
  if (!doc) return {};
  const seo = record(doc.defaultSEO);
  return {
    title: text(seo?.title ?? doc.siteName, 90),
    description: text(seo?.description, 300),
    bookingUrl: httpsUrl(text(doc.bookingURL, 2048)),
    email: contactEmail(text(doc.publicEmail, 254)),
    phone: contactPhone(text(doc.publicPhone, 30)),
  };
}

export function mapFleet(payload: unknown, mediaOrigin?: string): FleetVehicle[] {
  return documents(payload)
    .flatMap((doc) => {
      const base = mapEditorial({ docs: [doc] })[0];
      if (!base) return [];
      const images = Array.isArray(doc.images) ? doc.images : [];
      const image = images
        .map((entry) => mapImage(record(entry)?.image, mediaOrigin))
        .find(Boolean);
      const capacity = doc.passengerCapacity;
      const luggage = doc.luggageCapacity;
      return [
        {
          ...base,
          ...(image ? { image } : {}),
          ...(typeof capacity === 'number' &&
          Number.isInteger(capacity) &&
          capacity >= 1 &&
          capacity <= 100
            ? { passengerCapacity: capacity }
            : {}),
          ...(typeof luggage === 'number' && Number.isInteger(luggage) && luggage >= 0
            ? { luggageCapacity: luggage }
            : {}),
        },
      ];
    })
    .filter((item, index, items) => items.findIndex((other) => other.slug === item.slug) === index);
}
