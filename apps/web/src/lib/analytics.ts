export const ANALYTICS_EVENT_NAMES = [
  'booking_click',
  'contact_form_submit',
  'transportation_inquiry_submit',
  'driver_application_submit',
  'phone_click',
  'email_click',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export interface AnalyticsEventMap {
  booking_click: {
    service_page?: string;
    source_page: string;
    button_location: string;
  };
  contact_form_submit: { source_page: string };
  transportation_inquiry_submit: { service_page?: string; source_page: string };
  driver_application_submit: { source_page: string };
  phone_click: { source_page: string; button_location: string };
  email_click: { source_page: string; button_location: string };
}

export type AnalyticsEvent = {
  [Name in AnalyticsEventName]: {
    eventName: Name;
    eventParams: AnalyticsEventMap[Name];
  };
}[AnalyticsEventName];

export interface SerializedAnalyticsEvent {
  name: AnalyticsEventName;
  params: Record<string, string>;
}

const EVENT_NAMES = new Set<string>(ANALYTICS_EVENT_NAMES);
const PARAMETER_NAMES = new Set(['service_page', 'source_page', 'button_location']);
const FORBIDDEN_PARAMETER_NAMES = new Set([
  'email',
  'phone',
  'name',
  'message',
  'email_address',
  'phone_number',
  'full_name',
]);
const EMAIL_VALUE = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/;
const PHONE_VALUE = /(?:\+?\d[\s().-]*){7,}/;
const SAFE_VALUE = /^[^\u0000-\u001f\u007f]*$/;
const MAX_VALUE_LENGTH = 100;

export function validateGoogleTagManagerId(value: string | undefined): string | undefined {
  if (!value || !/^GTM-[A-Z0-9]{4,}$/.test(value)) return undefined;
  return value;
}

function sanitizeValue(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_VALUE_LENGTH)
    return undefined;
  if (value !== value.trim() || !SAFE_VALUE.test(value)) return undefined;
  if (EMAIL_VALUE.test(value) || PHONE_VALUE.test(value)) return undefined;
  return value;
}

export function serializeAnalyticsEvent(
  name: unknown,
  parameters: unknown,
): SerializedAnalyticsEvent | undefined {
  if (typeof name !== 'string' || !EVENT_NAMES.has(name)) return undefined;
  if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) return undefined;

  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(parameters)) {
    const normalizedKey = key.toLowerCase();
    if (FORBIDDEN_PARAMETER_NAMES.has(normalizedKey) || !PARAMETER_NAMES.has(key)) return undefined;
    const sanitized = sanitizeValue(value);
    if (!sanitized) return undefined;
    params[key] = sanitized;
  }

  return { name: name as AnalyticsEventName, params };
}

type DataLayer = Array<Record<string, string>>;

function browserDataLayer(): DataLayer | undefined {
  if (typeof window === 'undefined') return undefined;
  const target = window as typeof window & { dataLayer?: unknown };
  if (target.dataLayer === undefined) target.dataLayer = [];
  return Array.isArray(target.dataLayer) ? (target.dataLayer as DataLayer) : undefined;
}

export function trackEvent<Name extends AnalyticsEventName>(
  name: Name,
  parameters: AnalyticsEventMap[Name],
): void;
export function trackEvent(name: string, parameters: Record<string, unknown>): void;
export function trackEvent(name: string, parameters: unknown): void {
  const event = serializeAnalyticsEvent(name, parameters);
  if (!event) return;
  browserDataLayer()?.push({ event: event.name, ...event.params });
}

function safePagePath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('?') &&
    !path.includes('#') &&
    path.length <= 2_048 &&
    SAFE_VALUE.test(path)
  );
}

export function nextPageViewPath(
  previousPath: string | undefined,
  currentPath: unknown,
): string | undefined {
  if (!safePagePath(currentPath) || currentPath === previousPath) return undefined;
  return currentPath;
}

export function trackPageView(path: string): void {
  if (!safePagePath(path) || typeof window === 'undefined') return;
  const origin = window.location.origin;
  if (!/^https?:\/\/[^/?#]+$/i.test(origin)) return;
  const title = document.title.trim();
  if (!title || title.length > 200 || !SAFE_VALUE.test(title)) return;
  browserDataLayer()?.push({
    event: 'page_view',
    page_path: path,
    page_location: `${origin}${path}`,
    page_title: title,
  });
}
