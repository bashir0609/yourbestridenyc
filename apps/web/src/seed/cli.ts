import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { assertDevelopmentSeedAllowed } from './guard';
import { seedDevelopmentContent } from './run';

async function main() {
  // Native loading keeps existing shell values and never exposes env-file contents.
  // Match development precedence without importing Next or Payload before the guard.
  for (const name of ['.env.development.local', '.env.local', '.env.development', '.env']) {
    const filename = fileURLToPath(new URL(`../../${name}`, import.meta.url));
    if (existsSync(filename)) loadEnvFile(filename);
  }
  assertDevelopmentSeedAllowed(process.env);
  // Seeding is data-only; schema setup is a separate, explicitly reviewed operation.
  process.env.DATABASE_PUSH = 'false';
  const { getPayload } = await import('payload');
  const { default: config } = await import('../payload.config');
  const payload = await getPayload({ config });
  try {
    const result = await seedDevelopmentContent(
      {
        async exists(collection, slug) {
          const found = await payload.find({
            collection,
            where: { slug: { equals: slug } },
            limit: 1,
            depth: 0,
            draft: true,
            overrideAccess: true,
          });
          return found.docs.length > 0;
        },
        async create(collection, data) {
          await payload.create({ collection, data, draft: true, overrideAccess: true });
        },
      },
      process.env,
    );
    console.info(`Development seed: ${result.created} created, ${result.skipped} skipped.`);
  } finally {
    await payload.destroy();
  }
}

main().catch(() => {
  // Driver errors can embed connection credentials; do not print raw exceptions.
  console.error(
    'Development seed failed. Verify local-only seed permissions, private CMS environment, and migrated schema. No existing slugs are overwritten; a partial run can be retried.',
  );
  process.exitCode = 1;
});
