import 'server-only';
import { cache } from 'react';
import { getPublicConfig } from '../config';
import { formatPhoneDisplay, OFFICIAL_BUSINESS } from '../business-info';
import { payloadClient } from './payload-client';
import {
  mapDrivers,
  mapEditorial,
  mapFleet,
  mapSettings,
  mapTestimonials,
  record,
} from './mappers';
import {
  CMS_LIMITS,
  type CmsCollection,
  type CmsSection,
  type HomeContent,
  type PayloadClient,
  type SiteSettings,
} from './types';

export function createCmsQueries(client: PayloadClient, mediaOrigin?: string) {
  async function collection<T>(
    resource: CmsCollection,
    map: (data: unknown) => T[],
  ): Promise<CmsSection<T>> {
    const result = await client.request(resource);
    if (!result.ok) return { items: [], status: result.reason };
    if (!Array.isArray(record(result.data)?.docs)) return { items: [], status: 'invalid' };
    const items = map(result.data).slice(0, CMS_LIMITS[resource]);
    return { items, status: items.length ? 'ready' : 'empty' };
  }
  const getServices = () => collection('services', (data) => mapEditorial(data, mediaOrigin));
  const getFleetVehicles = () =>
    collection('fleet-vehicles', (data) => mapFleet(data, mediaOrigin));
  const getDrivers = () => collection('drivers', (data) => mapDrivers(data, mediaOrigin));
  const getTestimonials = () => collection('testimonials', mapTestimonials);
  const getLocations = () => collection('locations', mapEditorial);
  async function getSiteSettings(): Promise<SiteSettings> {
    const result = await client.request('site-settings');
    return result.ok ? mapSettings(result.data) : {};
  }
  async function getHomeContent(): Promise<HomeContent> {
    const [services, fleet, drivers, testimonials, locations] = await Promise.all([
      getServices(),
      getFleetVehicles(),
      getDrivers(),
      getTestimonials(),
      getLocations(),
    ]);
    return {
      services: services.items,
      fleet: fleet.items,
      drivers: drivers.items,
      testimonials: testimonials.items,
      locations: locations.items,
      status: {
        services: services.status,
        'fleet-vehicles': fleet.status,
        drivers: drivers.status,
        testimonials: testimonials.status,
        locations: locations.status,
      },
    };
  }
  return {
    getServices,
    getFleetVehicles,
    getDrivers,
    getTestimonials,
    getLocations,
    getSiteSettings,
    getHomeContent,
  };
}

const queries = () => createCmsQueries(payloadClient, process.env.CMS_MEDIA_URL);
export const getServices = cache(() => queries().getServices());
export const getFleetVehicles = cache(() => queries().getFleetVehicles());
export const getDrivers = cache(() => queries().getDrivers());
export const getTestimonials = cache(() => queries().getTestimonials());
export const getLocations = cache(() => queries().getLocations());
export const getSiteSettings = cache(() => queries().getSiteSettings());
export const getHomeContent = cache(() => queries().getHomeContent());
export const getBusinessConfig = cache(async () => {
  const configured = getPublicConfig();
  const settings = await getSiteSettings();
  const phone = configured.phone ?? settings.phone ?? OFFICIAL_BUSINESS.primaryPhone.e164;
  return {
    ...configured,
    bookingUrl: configured.bookingUrl ?? settings.bookingUrl,
    email: configured.email ?? settings.email,
    phone,
    phoneDisplay: formatPhoneDisplay(phone),
    secondaryPhone: OFFICIAL_BUSINESS.secondaryPhone.e164,
    secondaryPhoneDisplay: OFFICIAL_BUSINESS.secondaryPhone.display,
    fax: OFFICIAL_BUSINESS.fax.e164,
    faxDisplay: OFFICIAL_BUSINESS.fax.display,
    address: OFFICIAL_BUSINESS.address,
    businessName: OFFICIAL_BUSINESS.name,
  };
});
