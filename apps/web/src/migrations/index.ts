import * as migration_20260928_135753_initial_neon_schema from './20260928_135753_initial_neon_schema';

export const migrations = [
  {
    up: migration_20260928_135753_initial_neon_schema.up,
    down: migration_20260928_135753_initial_neon_schema.down,
    name: '20260928_135753_initial_neon_schema',
  },
];
