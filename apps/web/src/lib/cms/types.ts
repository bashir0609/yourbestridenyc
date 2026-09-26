// Public, runtime-validated view models; not privileged Payload documents.
export const CMS_COLLECTIONS = [
  'services',
  'fleet-vehicles',
  'drivers',
  'testimonials',
  'locations',
] as const;
export const CMS_RESOURCES = [...CMS_COLLECTIONS, 'site-settings'] as const;
export type CmsCollection = (typeof CMS_COLLECTIONS)[number];
export type CmsResource = (typeof CMS_RESOURCES)[number];
export type CmsFailure = 'unconfigured' | 'unavailable' | 'invalid';
export type CmsStatus = 'ready' | 'empty' | CmsFailure;
export type CmsResult<T> = { ok: true; data: T } | { ok: false; reason: CmsFailure };
export type CmsSection<T> = { items: T[]; status: CmsStatus };
export type PublicImage = { url: string; alt: string; width: number; height: number };
export type EditorialCard = { slug: string; title: string; summary: string; image?: PublicImage };
export type Service = EditorialCard;
export type FleetVehicle = EditorialCard & { passengerCapacity?: number; luggageCapacity?: number };
export type Driver = { slug: string; name: string; summary: string; image?: PublicImage };
export type Testimonial = { slug: string; name: string; quote: string };
export type CoverageArea = EditorialCard;
export type SiteSettings = {
  title?: string;
  description?: string;
  bookingUrl?: string;
  email?: string;
  phone?: string;
};
export type HomeContent = {
  services: Service[];
  fleet: FleetVehicle[];
  drivers: Driver[];
  testimonials: Testimonial[];
  locations: CoverageArea[];
  status: Record<CmsCollection, CmsStatus>;
};
export type PageCollection = 'services' | 'fleet-vehicles' | 'drivers' | 'locations';
export type CmsRequestOptions = {
  mode?: 'detail' | 'directory' | 'sitemap';
  slug?: string;
  page?: number;
  locationId?: number;
};
export type PayloadClient = {
  request(resource: CmsResource, options?: CmsRequestOptions): Promise<CmsResult<unknown>>;
};
export type PublicSeo = { title?: string; description?: string; image?: PublicImage };
export type RichBlock = { kind: 'paragraph' | 'heading' | 'list-item' | 'quote'; text: string };
export type Faq = { question: string; answer: string };
export type ServicePage = Service & {
  overview: RichBlock[];
  benefits: { title: string; description?: string }[];
  features: string[];
  locations: CoverageArea[];
  faqs: Faq[];
  seo: PublicSeo;
};
export type FleetPage = FleetVehicle & {
  category?: string;
  description: RichBlock[];
  gallery: PublicImage[];
  amenities: string[];
  accessibilityInformation?: string;
  seo: PublicSeo;
};
export type DriverPage = Driver & {
  biography: RichBlock[];
  experience?: string;
  languages: string[];
  specialties: string[];
  serviceAreas: CoverageArea[];
  seo: PublicSeo;
};
export type LocationPage = CoverageArea & {
  id: number;
  introduction: RichBlock[];
  coverageAreas: string[];
  faqs: Faq[];
  seo: PublicSeo;
};
export type PageMap = {
  services: ServicePage;
  'fleet-vehicles': FleetPage;
  drivers: DriverPage;
  locations: LocationPage;
};
export type DirectoryResult<T> = CmsSection<T> & { page: number; hasNextPage: boolean };
export type SitemapRecord = { path: string; updatedAt?: string };
export const PAGE_PATHS: Record<PageCollection, string> = {
  services: '/services',
  'fleet-vehicles': '/fleet',
  drivers: '/drivers',
  locations: '/locations',
};
export const DIRECTORY_LIMIT = 12;
export const SITEMAP_LIMIT = 50;
export const CMS_REVALIDATE_SECONDS = 300;
export const CMS_LIMITS: Record<CmsCollection, number> = {
  services: 8,
  'fleet-vehicles': 6,
  drivers: 6,
  testimonials: 6,
  locations: 12,
};
