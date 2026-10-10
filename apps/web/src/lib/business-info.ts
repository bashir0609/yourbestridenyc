export const OFFICIAL_BUSINESS = {
  name: 'Your Best Ride Inc.',
  address: {
    street: '169-20 Hillside Ave, Suite 03',
    city: 'Queens',
    state: 'NY',
    postalCode: '11432',
    country: 'US',
  },
  primaryPhone: {
    e164: '+13477409782',
    display: '(347) 740-9782',
  },
  secondaryPhone: {
    e164: '+13478860002',
    display: '(347) 886-0002',
  },
  fax: {
    e164: '+13477409782',
    display: '(347) 740-9782',
  },
} as const;

export function formatPhoneDisplay(value: string): string {
  const match = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(value);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : value;
}

export function localBusinessJsonLd(siteUrl?: string) {
  const business = OFFICIAL_BUSINESS;
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    ...(siteUrl ? { url: siteUrl } : {}),
    telephone: business.primaryPhone.e164,
    faxNumber: business.fax.e164,
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.address.street,
      addressLocality: business.address.city,
      addressRegion: business.address.state,
      postalCode: business.address.postalCode,
      addressCountry: business.address.country,
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: business.primaryPhone.e164,
      },
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        telephone: business.secondaryPhone.e164,
      },
    ],
  };
}
