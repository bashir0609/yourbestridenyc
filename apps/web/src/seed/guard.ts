type Environment = Record<string, string | undefined>;

export function assertDevelopmentSeedAllowed(env: Environment): void {
  if (env.NODE_ENV !== 'development') {
    throw new Error('Seed requires NODE_ENV=development.');
  }
  if (env.ALLOW_DEVELOPMENT_SEED !== 'true') {
    throw new Error('Seed requires explicit ALLOW_DEVELOPMENT_SEED=true.');
  }
  // Presence is enough: even CI=false or VERCEL=0 is not a local seed context.
  if (env.CI !== undefined || env.VERCEL !== undefined) {
    throw new Error('Seed is forbidden in CI or Vercel environments.');
  }
  let database: URL;
  try {
    database = new URL(env.DATABASE_URI ?? '');
  } catch {
    throw new Error('Seed requires a valid loopback PostgreSQL DATABASE_URI.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(database.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(database.hostname) ||
    !database.pathname ||
    database.pathname === '/' ||
    database.search ||
    database.hash
  ) {
    // Reject all query options, including libpq host/hostaddr overrides.
    throw new Error(
      'Seed requires a loopback PostgreSQL DATABASE_URI with a database name and no query or fragment.',
    );
  }
}
