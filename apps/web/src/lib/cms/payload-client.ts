import 'server-only';
import type { Where } from 'payload';
import { cmsOrigin } from '../config';
import {
  CMS_LIMITS,
  CMS_RESOURCES,
  CMS_REVALIDATE_SECONDS,
  type CmsResource,
  type CmsResult,
  type PayloadClient,
  PAGE_PATHS,
  DIRECTORY_LIMIT,
  SITEMAP_LIMIT,
} from './types';

const MAX_RESPONSE_BYTES = 262_144;
const TIMEOUT_MS = 4000;
const fields: Record<CmsResource, readonly string[]> = {
  services: ['slug', 'title', 'developmentSeed', 'summary', 'image', '_status'],
  'fleet-vehicles': [
    'slug',
    'name',
    'summary',
    'images',
    'passengerCapacity',
    'luggageCapacity',
    '_status',
  ],
  drivers: ['slug', 'name', 'summary', 'photo', 'websiteApproved', '_status'],
  testimonials: ['slug', 'attribution', 'quote', 'websiteApproved', '_status'],
  locations: ['slug', 'name', 'developmentSeed', 'summary', '_status'],
  'site-settings': ['siteName', 'defaultSEO', 'bookingURL', 'publicEmail', 'publicPhone'],
};

const detailFields = {
  services: [
    ...fields.services,
    'content',
    'benefits',
    'features',
    'serviceAreas',
    'bookingCTA.label',
    'faqs',
    'seo',
  ],
  'fleet-vehicles': [
    ...fields['fleet-vehicles'],
    'category',
    'description',
    'amenities',
    'accessibilityInformation',
    'seo',
  ],
  drivers: [
    ...fields.drivers,
    'bio',
    'experience',
    'experienceYears',
    'languages',
    'specialties',
    'serviceAreas',
    'seo',
  ],
  locations: [
    ...fields.locations,
    'id',
    'description',
    'coverageAreas',
    'relatedServices',
    'faqs',
    'image',
    'seo',
  ],
};
const sitemapFields = [
  'id',
  'slug',
  'title',
  'name',
  'summary',
  'websiteApproved',
  'developmentSeed',
  '_status',
  'updatedAt',
];

async function readJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (!response.body || Number(response.headers.get('content-length')) > MAX_RESPONSE_BYTES) {
    void response.body?.cancel().catch(() => undefined);
    throw new Error('Invalid CMS body');
  }
  const reader = response.body.getReader();
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  try {
    while (true) {
      signal.throwIfAborted();
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) throw new Error('CMS body limit exceeded');
      body += decoder.decode(part.value, { stream: true });
    }
    signal.throwIfAborted();
    return JSON.parse(body + decoder.decode()) as unknown;
  } finally {
    signal.removeEventListener('abort', cancel);
    cancel();
    reader.releaseLock();
  }
}

export function createPayloadClient(
  options: {
    origin?: string;
    development?: boolean;
    fetcher?: typeof fetch;
  } = {},
): PayloadClient {
  const origin = cmsOrigin(options.origin, options.development);
  const fetcher = options.fetcher ?? fetch;
  return {
    async request(resource, query = {}): Promise<CmsResult<unknown>> {
      // Also enforce the allowlist at runtime: this is not an arbitrary CMS/API proxy.
      if (!CMS_RESOURCES.includes(resource)) return { ok: false, reason: 'invalid' };
      const { mode, slug, page = 1, locationId } = query;
      if (
        Object.keys(query).some((key) => !['mode', 'slug', 'page', 'locationId'].includes(key)) ||
        (mode !== undefined &&
          (!['detail', 'directory', 'sitemap'].includes(mode) ||
            !Object.hasOwn(PAGE_PATHS, resource))) ||
        !Number.isSafeInteger(page) ||
        page < 1 ||
        page > 1000 ||
        (mode === 'detail' &&
          (typeof slug !== 'string' ||
            slug.length > 100 ||
            !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
            query.page !== undefined)) ||
        (mode !== 'detail' && slug !== undefined) ||
        (mode === undefined && Object.keys(query).length > 0) ||
        (locationId !== undefined &&
          (resource !== 'services' ||
            mode !== 'directory' ||
            !Number.isSafeInteger(locationId) ||
            locationId < 1))
      ) {
        return { ok: false, reason: 'invalid' };
      }
      if (!origin) return { ok: false, reason: 'unconfigured' };
      const global = resource === 'site-settings';
      const url = new URL(global ? `/api/globals/${resource}` : `/api/${resource}`, origin);
      url.searchParams.set('depth', global || mode === 'sitemap' ? '0' : '1');
      url.searchParams.set('draft', 'false');
      const selected =
        mode === 'sitemap'
          ? sitemapFields
          : mode && Object.hasOwn(detailFields, resource)
            ? detailFields[resource as keyof typeof detailFields]
            : fields[resource];
      for (const field of selected)
        url.searchParams.set(`select[${field.split('.').join('][')}]`, 'true');
      if (!global) {
        url.searchParams.set(
          'limit',
          String(
            mode === 'detail'
              ? 1
              : mode === 'directory'
                ? DIRECTORY_LIMIT
                : mode === 'sitemap'
                  ? SITEMAP_LIMIT
                  : CMS_LIMITS[resource],
          ),
        );
        if (mode === 'directory' || mode === 'sitemap') url.searchParams.set('page', String(page));
        if (mode === 'detail') url.searchParams.set('where[slug][equals]', slug!);
        if (locationId !== undefined)
          url.searchParams.set('where[serviceAreas][contains]', String(locationId));
        url.searchParams.set('sort', '-featured,displayOrder,id');
        url.searchParams.set('where[_status][equals]', 'published');
        if (resource === 'services' || resource === 'locations') {
          url.searchParams.set('where[developmentSeed][not_equals]', 'true');
        }
        if (resource === 'drivers' || resource === 'testimonials') {
          url.searchParams.set('where[websiteApproved][equals]', 'true');
        }
      }
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timeout = new Promise<CmsResult<unknown>>((resolve) => {
          timer = setTimeout(() => {
            controller.abort();
            resolve({ ok: false, reason: 'unavailable' });
          }, TIMEOUT_MS);
        });
        const work = async (): Promise<CmsResult<unknown>> => {
          let response: Response;
          try {
            response = await fetcher(url, {
              method: 'GET',
              headers: { Accept: 'application/json' },
              credentials: 'omit',
              redirect: 'error',
              signal: controller.signal,
              next: {
                revalidate: CMS_REVALIDATE_SECONDS,
                tags: [
                  `cms:${resource}`,
                  ...(mode && (resource === 'services' || resource === 'drivers')
                    ? ['cms:locations']
                    : []),
                  ...(mode && resource === 'locations' ? ['cms:services'] : []),
                ],
              },
            });
          } catch {
            return { ok: false, reason: 'unavailable' };
          }
          if (!response.ok) {
            void response.body?.cancel().catch(() => undefined);
            return { ok: false, reason: 'unavailable' };
          }
          if (!response.headers.get('content-type')?.includes('application/json')) {
            void response.body?.cancel().catch(() => undefined);
            return { ok: false, reason: 'invalid' };
          }
          try {
            return { ok: true, data: await readJson(response, controller.signal) };
          } catch {
            return { ok: false, reason: controller.signal.aborted ? 'unavailable' : 'invalid' };
          }
        };
        return await Promise.race([work(), timeout]);
      } finally {
        clearTimeout(timer);
        controller.abort();
      }
    },
  };
}

async function requestLocalPayload(
  resource: CmsResource,
  query: Parameters<PayloadClient['request']>[1] = {},
): Promise<CmsResult<unknown>> {
  if (!CMS_RESOURCES.includes(resource)) return { ok: false, reason: 'invalid' };
  const { mode, slug, page = 1, locationId } = query;
  if (
    Object.keys(query).some((key) => !['mode', 'slug', 'page', 'locationId'].includes(key)) ||
    (mode !== undefined &&
      (!['detail', 'directory', 'sitemap'].includes(mode) ||
        !Object.hasOwn(PAGE_PATHS, resource))) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 1000 ||
    (mode === 'detail' &&
      (typeof slug !== 'string' ||
        slug.length > 100 ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
        query.page !== undefined)) ||
    (mode !== 'detail' && slug !== undefined) ||
    (mode === undefined && Object.keys(query).length > 0) ||
    (locationId !== undefined &&
      (resource !== 'services' ||
        mode !== 'directory' ||
        !Number.isSafeInteger(locationId) ||
        locationId < 1))
  ) {
    return { ok: false, reason: 'invalid' };
  }

  try {
    const [{ getPayload }, { default: config }] = await Promise.all([
      import('payload'),
      import('@payload-config'),
    ]);
    const payload = await getPayload({ config });
    if (resource === 'site-settings') {
      const data = await payload.findGlobal({
        slug: 'site-settings',
        depth: 0,
        overrideAccess: false,
      });
      return { ok: true, data };
    }

    const conditions: Where[] = [{ _status: { equals: 'published' } }];
    if (resource === 'services' || resource === 'locations') {
      conditions.push({ developmentSeed: { not_equals: true } });
    }
    if (mode === 'detail') conditions.push({ slug: { equals: slug } });
    if (locationId !== undefined) conditions.push({ serviceAreas: { contains: locationId } });
    if (resource === 'drivers' || resource === 'testimonials') {
      conditions.push({ websiteApproved: { equals: true } });
    }

    const data = await payload.find({
      collection: resource,
      depth: mode === 'sitemap' ? 0 : 1,
      draft: false,
      limit:
        mode === 'detail'
          ? 1
          : mode === 'directory'
            ? DIRECTORY_LIMIT
            : mode === 'sitemap'
              ? SITEMAP_LIMIT
              : CMS_LIMITS[resource],
      page: mode === 'directory' || mode === 'sitemap' ? page : 1,
      sort: '-featured,displayOrder,id',
      where: conditions.length === 1 ? conditions[0] : { and: conditions },
      overrideAccess: false,
    });
    return { ok: true, data };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

export const payloadClient: PayloadClient = { request: requestLocalPayload };
