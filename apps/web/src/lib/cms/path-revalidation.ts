import { revalidatePath } from 'next/cache';
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload';

type PublicCollection = 'services' | 'fleet-vehicles' | 'drivers' | 'testimonials' | 'locations';

type PublicDocument = Record<string, unknown> | null | undefined;
type Revalidate = (path: string, type?: 'page' | 'layout') => void;

const routeFamilies: Record<PublicCollection, readonly string[]> = {
  services: ['/', '/services', '/services/[slug]', '/locations/[slug]'],
  'fleet-vehicles': ['/', '/fleet', '/fleet/[slug]'],
  drivers: ['/', '/drivers', '/drivers/[slug]'],
  testimonials: ['/'],
  locations: ['/', '/locations', '/locations/[slug]', '/services/[slug]', '/drivers/[slug]'],
};

export const allCmsPaths = [
  '/',
  '/drivers',
  '/drivers/[slug]',
  '/fleet',
  '/fleet/[slug]',
  '/services',
  '/services/[slug]',
  '/locations',
  '/locations/[slug]',
] as const;

function validSlug(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function isPublic(collection: PublicCollection, doc: PublicDocument): boolean {
  if (!doc || doc._status !== 'published') return false;
  if ((collection === 'services' || collection === 'locations') && doc.developmentSeed === true)
    return false;
  if (collection === 'drivers' || collection === 'testimonials')
    return doc.websiteApproved === true;
  return true;
}

function detailBase(collection: PublicCollection): string | undefined {
  if (collection === 'fleet-vehicles') return '/fleet';
  if (collection === 'testimonials') return;
  return `/${collection}`;
}

export function pathsForCmsChange(
  collection: PublicCollection,
  doc: PublicDocument,
  previousDoc?: PublicDocument,
): string[] {
  if (!isPublic(collection, doc) && !isPublic(collection, previousDoc)) return [];

  const paths = new Set(routeFamilies[collection]);
  const base = detailBase(collection);
  if (base) {
    for (const candidate of [doc, previousDoc]) {
      if (isPublic(collection, candidate) && validSlug(candidate?.slug)) {
        paths.add(`${base}/${candidate.slug}`);
      }
    }
  }
  return [...paths];
}

export function invalidateCmsPaths(
  paths: readonly string[],
  invalidate: Revalidate = revalidatePath,
) {
  for (const path of new Set(paths)) {
    if (path.includes('[')) invalidate(path, 'page');
    else invalidate(path);
  }
}

export function createPublicRevalidationHooks(collection: PublicCollection): {
  afterChange: CollectionAfterChangeHook[];
  afterDelete: CollectionAfterDeleteHook[];
} {
  return {
    afterChange: [
      ({ doc, previousDoc }) => {
        invalidateCmsPaths(pathsForCmsChange(collection, doc, previousDoc));
        return doc;
      },
    ],
    afterDelete: [
      ({ doc }) => {
        invalidateCmsPaths(pathsForCmsChange(collection, undefined, doc));
        return doc;
      },
    ],
  };
}

export const mediaRevalidationHooks: {
  afterChange: CollectionAfterChangeHook[];
  afterDelete: CollectionAfterDeleteHook[];
} = {
  afterChange: [
    ({ doc }) => {
      invalidateCmsPaths(allCmsPaths);
      return doc;
    },
  ],
  afterDelete: [
    ({ doc }) => {
      invalidateCmsPaths(allCmsPaths);
      return doc;
    },
  ],
};
