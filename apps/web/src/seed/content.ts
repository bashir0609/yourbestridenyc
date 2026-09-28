function lexicalParagraph(text: string) {
  return {
    root: {
      type: 'root',
      version: 1,
      format: '' as const,
      indent: 0,
      direction: null,
      children: [
        {
          type: 'paragraph',
          version: 1,
          format: '' as const,
          indent: 0,
          direction: null,
          textFormat: 0,
          textStyle: '',
          children: [
            { type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' },
          ],
        },
      ],
    },
  };
}

const draft = { _status: 'draft' as const, developmentSeed: true };
const notice =
  'DEVELOPMENT SEED — layout fixture only. Replace with approved editorial content before publication. No service availability or coverage is asserted.';

export const seedLocations = (
  [
    ['manhattan', 'Manhattan'],
    ['brooklyn', 'Brooklyn'],
    ['queens', 'Queens'],
    ['bronx', 'Bronx'],
    ['staten-island', 'Staten Island'],
  ] as const
).map(([slug, name]) => ({
  ...draft,
  slug,
  name: `DEVELOPMENT SEED — ${name}`,
  city: 'New York City',
  region: 'New York',
  countryCode: 'US',
  summary: notice,
  description: lexicalParagraph(notice),
  coverageAreas: [],
  relatedServices: [],
}));

export const seedServices = (
  [
    ['medical', 'Medical'],
    ['airport', 'Airport'],
    ['corporate', 'Corporate'],
    ['private', 'Private'],
  ] as const
).map(([slug, title]) => ({
  ...draft,
  slug,
  title: `DEVELOPMENT SEED — ${title}`,
  summary: notice,
  content: lexicalParagraph(notice),
  serviceAreas: [],
  benefits: [],
  features: [],
  faqs: [],
}));

export type SeedRecord = (typeof seedLocations)[number] | (typeof seedServices)[number];
export type SeedCollection = 'locations' | 'services';
