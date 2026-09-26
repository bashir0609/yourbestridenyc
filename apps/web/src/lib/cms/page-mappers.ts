import { mapDrivers, mapEditorial, mapFleet, mapImage, record, text } from './mappers';
import type {
  DriverPage,
  Faq,
  FleetPage,
  LocationPage,
  PageCollection,
  PageMap,
  PublicSeo,
  RichBlock,
  ServicePage,
} from './types';

export function validSlug(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
  );
}

export function textItems(value: unknown, field: string, limit = 30): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.slice(0, limit).flatMap((item) => {
        const label = text(record(item)?.[field], 200);
        return label ? [label] : [];
      }),
    ),
  ];
}

// Render only approved textual Lexical nodes. Embeds, raw HTML and relationship nodes
// never flow into page props; unsupported formatting degrades to plain text.
export function richBlocks(value: unknown): RichBlock[] {
  const root = record(record(value)?.root);
  const blocks: RichBlock[] = [];
  let nodes = 0;
  let characters = 24000;
  function inline(value: unknown, depth: number): string {
    if (++nodes > 2000 || depth > 12 || characters <= 0) return '';
    const node = record(value);
    if (!node) return '';
    if (node.type === 'text' && typeof node.text === 'string') {
      const result = node.text
        .slice(0, characters)
        .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ');
      characters -= result.length;
      return result;
    }
    if (node.type === 'linebreak') return '\n';
    if (
      !['paragraph', 'heading', 'quote', 'listitem', 'list', 'link', 'autolink'].includes(
        String(node.type),
      )
    )
      return '';
    return Array.isArray(node.children)
      ? node.children
          .slice(0, 200)
          .map((child) => inline(child, depth + 1))
          .join('')
      : '';
  }
  function visit(value: unknown, depth: number) {
    if (++nodes > 2000 || depth > 12 || blocks.length >= 100 || characters <= 0) return;
    const node = record(value);
    if (!node) return;
    if (node.type === 'root' || node.type === 'list') {
      if (Array.isArray(node.children))
        for (const child of node.children.slice(0, 200)) visit(child, depth + 1);
      return;
    }
    const kind =
      node.type === 'heading'
        ? 'heading'
        : node.type === 'quote'
          ? 'quote'
          : node.type === 'listitem'
            ? 'list-item'
            : node.type === 'paragraph'
              ? 'paragraph'
              : undefined;
    if (!kind) return;
    const content = inline(node, depth).trim();
    if (content) blocks.push({ kind, text: content });
  }
  visit(root, 0);
  return blocks;
}

function seo(value: unknown, mediaOrigin?: string): PublicSeo {
  const fields = record(value);
  return {
    title: text(fields?.title, 70),
    description: text(fields?.description, 200),
    image: mapImage(fields?.image, mediaOrigin),
  };
}
function faqs(value: unknown): Faq[] {
  return Array.isArray(value)
    ? value.slice(0, 20).flatMap((item) => {
        const doc = record(item);
        const question = text(doc?.question, 200);
        const answer = text(doc?.answer, 2000);
        return question && answer ? [{ question, answer }] : [];
      })
    : [];
}
function locations(value: unknown) {
  return mapEditorial({ docs: Array.isArray(value) ? value : [] });
}
export function mapServicePage(value: unknown, mediaOrigin?: string): ServicePage | undefined {
  const doc = record(value);
  const base = mapEditorial({ docs: [doc] }, mediaOrigin)[0];
  if (!doc || !base) return;
  return {
    ...base,
    overview: richBlocks(doc.content),
    benefits: Array.isArray(doc.benefits)
      ? doc.benefits.slice(0, 12).flatMap((item) => {
          const title = text(record(item)?.title, 100);
          return title ? [{ title, description: text(record(item)?.description, 1000) }] : [];
        })
      : [],
    features: textItems(doc.features, 'feature', 20),
    locations: locations(doc.serviceAreas),
    faqs: faqs(doc.faqs),
    seo: seo(doc.seo, mediaOrigin),
  };
}
export function mapFleetPage(value: unknown, mediaOrigin?: string): FleetPage | undefined {
  const doc = record(value);
  const base = mapFleet({ docs: [doc] }, mediaOrigin)[0];
  if (!doc || !base) return;
  const categories: Record<string, string> = {
    sedan: 'Sedan',
    suv: 'SUV',
    van: 'Passenger van',
    minibus: 'Minibus',
    coach: 'Coach',
    other: 'Other vehicle',
  };
  return {
    ...base,
    category: typeof doc.category === 'string' ? categories[doc.category] : undefined,
    description: richBlocks(doc.description),
    gallery: Array.isArray(doc.images)
      ? doc.images.slice(0, 12).flatMap((item) => {
          const image = mapImage(record(item)?.image, mediaOrigin);
          return image ? [image] : [];
        })
      : [],
    amenities: textItems(doc.amenities, 'amenity'),
    accessibilityInformation: text(doc.accessibilityInformation, 2000),
    seo: seo(doc.seo, mediaOrigin),
  };
}
export function mapDriverPage(value: unknown, mediaOrigin?: string): DriverPage | undefined {
  const doc = record(value);
  const base = mapDrivers({ docs: [doc] }, mediaOrigin)[0];
  if (!doc || !base) return;
  // Explicit projection: no location, contact, availability, or trip fields.
  return {
    ...base,
    biography: richBlocks(doc.bio),
    experience: text(doc.experience, 1500),
    languages: textItems(doc.languages, 'language', 20),
    specialties: textItems(doc.specialties, 'specialty'),
    serviceAreas: locations(doc.serviceAreas),
    seo: seo(doc.seo, mediaOrigin),
  };
}
export function mapLocationPage(value: unknown, mediaOrigin?: string): LocationPage | undefined {
  const doc = record(value);
  const base = mapEditorial({ docs: [doc] }, mediaOrigin)[0];
  if (!doc || !base || typeof doc.id !== 'number' || !Number.isSafeInteger(doc.id) || doc.id < 1)
    return;
  return {
    ...base,
    id: doc.id,
    introduction: richBlocks(doc.description),
    coverageAreas: textItems(doc.coverageAreas, 'area'),
    faqs: faqs(doc.faqs),
    seo: seo(doc.seo, mediaOrigin),
  };
}
const mappers: {
  [K in PageCollection]: (value: unknown, mediaOrigin?: string) => PageMap[K] | undefined;
} = {
  services: mapServicePage,
  'fleet-vehicles': mapFleetPage,
  drivers: mapDriverPage,
  locations: mapLocationPage,
};
export function mapPage<K extends PageCollection>(
  resource: K,
  value: unknown,
  mediaOrigin?: string,
): PageMap[K] | undefined {
  return mappers[resource](value, mediaOrigin);
}
