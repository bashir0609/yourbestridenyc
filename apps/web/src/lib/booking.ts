import { httpsUrl } from './config';

export const ORES_ALIAS = 'yourbestride';
export const ORES_HOSTED_URL = `https://book.mylimobiz.com/v4/${ORES_ALIAS}`;
export const ORES_WIDGET_LOADER_URL = 'https://book.mylimobiz.com/v4/widgets/widget-loader.js';

export function resolveOresBookingUrl(value: string | undefined): string | undefined {
  const safe = httpsUrl(value);
  if (!safe) return;

  const url = new URL(safe);
  if (
    url.origin !== 'https://book.mylimobiz.com' ||
    url.pathname.replace(/\/$/, '') !== `/v4/${ORES_ALIAS}` ||
    url.search ||
    url.hash
  ) {
    return;
  }

  return ORES_HOSTED_URL;
}
