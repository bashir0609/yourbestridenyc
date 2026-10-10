import { seedLocations, seedServices, type SeedCollection, type SeedRecord } from './content';
import { assertDevelopmentSeedAllowed } from './guard';

export interface SeedStore {
  exists(collection: SeedCollection, slug: string): Promise<boolean>;
  create(collection: SeedCollection, data: SeedRecord): Promise<void>;
}

export async function seedDevelopmentContent(
  store: SeedStore,
  env: Record<string, string | undefined>,
) {
  assertDevelopmentSeedAllowed(env);
  const result = { created: 0, skipped: 0 };
  for (const [collection, records] of [
    ['locations', seedLocations],
    ['services', seedServices],
  ] as const) {
    for (const data of records) {
      if (await store.exists(collection, data.slug)) {
        result.skipped++;
        continue;
      }
      await store.create(collection, data);
      result.created++;
    }
  }
  return result;
}
