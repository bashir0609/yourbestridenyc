import 'server-only';
import { cache } from 'react';
import { record } from './mappers';
import { mapPage, validSlug } from './page-mappers';
import { payloadClient } from './payload-client';
import {
  DIRECTORY_LIMIT,
  PAGE_PATHS,
  type CmsResult,
  type CmsSection,
  type DirectoryResult,
  type PageCollection,
  type PageMap,
  type PayloadClient,
  type ServicePage,
  type SitemapRecord,
} from './types';

export function createPageQueries(client: PayloadClient, mediaOrigin?: string) {
  async function getPage<K extends PageCollection>(
    resource: K,
    slug: string,
  ): Promise<CmsResult<PageMap[K] | null>> {
    if (!validSlug(slug)) return { ok: true, data: null };
    const result = await client.request(resource, { mode: 'detail', slug });
    if (!result.ok) return result;
    const docs = record(result.data)?.docs;
    if (!Array.isArray(docs)) return { ok: false, reason: 'invalid' };
    const doc = docs.find((value) => record(value)?.slug === slug);
    return { ok: true, data: mapPage(resource, doc, mediaOrigin) ?? null };
  }
  async function getDirectory<K extends PageCollection>(
    resource: K,
    page = 1,
    locationId?: number,
  ): Promise<DirectoryResult<PageMap[K]>> {
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000)
      return { items: [], page, hasNextPage: false, status: 'invalid' };
    const result = await client.request(resource, {
      mode: 'directory',
      page,
      ...(locationId !== undefined ? { locationId } : {}),
    });
    if (!result.ok) return { items: [], page, hasNextPage: false, status: result.reason };
    const envelope = record(result.data);
    if (!Array.isArray(envelope?.docs) || typeof envelope.hasNextPage !== 'boolean')
      return { items: [], page, hasNextPage: false, status: 'invalid' };
    const items = envelope.docs
      .slice(0, DIRECTORY_LIMIT)
      .flatMap((value) => {
        if (locationId !== undefined) {
          const areas = record(value)?.serviceAreas;
          if (
            !Array.isArray(areas) ||
            !areas.some(
              (area) =>
                area === locationId ||
                (record(area)?.id === locationId && record(area)?._status === 'published'),
            )
          )
            return [];
        }
        const mapped = mapPage(resource, value, mediaOrigin);
        return mapped ? [mapped] : [];
      })
      .filter(
        (item, index, entries) => entries.findIndex((other) => other.slug === item.slug) === index,
      );
    return {
      items,
      page,
      hasNextPage: envelope.hasNextPage,
      status: items.length ? 'ready' : 'empty',
    };
  }
  async function getLocationServices(locationId: number): Promise<CmsSection<ServicePage>> {
    const items: ServicePage[] = [];
    for (let page = 1; page <= 100; page++) {
      const result = await getDirectory('services', page, locationId);
      if (result.status !== 'ready' && result.status !== 'empty')
        return { items: [], status: result.status };
      items.push(...result.items);
      if (!result.hasNextPage)
        return {
          items: items.filter(
            (item, i) => items.findIndex((other) => other.slug === item.slug) === i,
          ),
          status: items.length ? 'ready' : 'empty',
        };
    }
    return { items: [], status: 'invalid' };
  }
  async function getSitemapRecords(): Promise<SitemapRecord[]> {
    const resources = Object.keys(PAGE_PATHS) as PageCollection[];
    const groups = await Promise.all(
      resources.map(async (resource) => {
        const entries: SitemapRecord[] = [];
        for (let page = 1; page <= 100; page++) {
          const result = await client.request(resource, { mode: 'sitemap', page });
          if (!result.ok) {
            if (result.reason === 'unconfigured') return [];
            throw new Error('CMS sitemap content is temporarily unavailable');
          }
          const envelope = record(result.data);
          if (!Array.isArray(envelope?.docs) || typeof envelope.hasNextPage !== 'boolean')
            throw new Error('Invalid CMS sitemap response');
          for (const value of envelope.docs.slice(0, 50)) {
            const mapped = mapPage(resource, value);
            if (!mapped) continue;
            const updated = record(value)?.updatedAt;
            const updatedAt =
              typeof updated === 'string' &&
              /^\d{4}-\d{2}-\d{2}T/.test(updated) &&
              Number.isFinite(Date.parse(updated))
                ? new Date(updated).toISOString()
                : undefined;
            entries.push({
              path: `${PAGE_PATHS[resource]}/${mapped.slug}`,
              ...(updatedAt ? { updatedAt } : {}),
            });
          }
          if (!envelope.hasNextPage) return entries;
        }
        // Fail instead of publishing a silently truncated sitemap. Introduce sitemap
        // sharding if the business grows beyond 5,000 records per collection.
        throw new Error('CMS sitemap pagination limit exceeded');
      }),
    );
    return groups
      .flat()
      .filter((item, i, entries) => entries.findIndex((other) => other.path === item.path) === i);
  }
  return { getPage, getDirectory, getLocationServices, getSitemapRecords };
}
const queries = () => createPageQueries(payloadClient, process.env.CMS_MEDIA_URL);
export const getServicePage = cache((slug: string) => queries().getPage('services', slug));
export const getFleetPage = cache((slug: string) => queries().getPage('fleet-vehicles', slug));
export const getDriverPage = cache((slug: string) => queries().getPage('drivers', slug));
export const getLocationPage = cache((slug: string) => queries().getPage('locations', slug));
export const getFleetDirectory = cache((page: number) =>
  queries().getDirectory('fleet-vehicles', page),
);
export const getDriverDirectory = cache((page: number) => queries().getDirectory('drivers', page));
export const getLocationServices = cache((id: number) => queries().getLocationServices(id));
export const getSitemapRecords = cache(() => queries().getSitemapRecords());
