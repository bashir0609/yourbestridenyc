export const httpsURL = (value: unknown): true | string => {
  if (typeof value !== 'string' || !value.trim()) return 'Enter an HTTPS URL.';
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname && !url.username && !url.password) return true;
  } catch {
    /* Invalid URLs share the validation message below. */
  }
  return 'Enter an absolute HTTPS URL without embedded credentials.';
};

export const navigationURL = (value: unknown): true | string => {
  if (typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\s\u0000-\u001f]/.test(value))
    return true;
  return httpsURL(value);
};

export const slugValue = (value: unknown): true | string =>
  typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? true
    : 'Use lowercase letters and numbers separated by single hyphens.';
