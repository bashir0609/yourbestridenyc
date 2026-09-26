export function httpsUrl(value: string | undefined): string | undefined {
  if (!value || value !== value.trim() || /[\u0000-\u0020\u007f]/.test(value)) return;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return;
    return url.href;
  } catch {
    return;
  }
}

export function siteOrigin(value: string | undefined): string | undefined {
  const safe = httpsUrl(value);
  if (!safe) return;
  const url = new URL(safe);
  if (url.pathname !== '/' || url.search || url.hash) return;
  return url.origin;
}

export function cmsOrigin(value: string | undefined, development = false): string | undefined {
  const secure = siteOrigin(value);
  if (secure) return secure;
  if (!development || !value || value !== value.trim()) return;
  try {
    const url = new URL(value);
    if (
      url.protocol === 'http:' &&
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) &&
      !url.username &&
      !url.password &&
      url.pathname === '/' &&
      !url.search &&
      !url.hash
    )
      return url.origin;
  } catch {
    return;
  }
}

export function contactEmail(value: string | undefined): string | undefined {
  if (
    value &&
    value.length <= 254 &&
    /^[A-Za-z0-9._+-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/.test(value)
  )
    return value;
}

export function contactPhone(value: string | undefined): string | undefined {
  if (value && /^\+[1-9]\d{7,14}$/.test(value)) return value;
}

export function getPublicConfig(env: Record<string, string | undefined> = process.env) {
  return {
    siteUrl: siteOrigin(env.SITE_URL),
    bookingUrl: httpsUrl(env.LIMO_ANYWHERE_BOOKING_URL),
    email: contactEmail(env.CONTACT_EMAIL),
    phone: contactPhone(env.CONTACT_PHONE),
  };
}
