import * as migration_20260928_135753_initial_neon_schema from './20260928_135753_initial_neon_schema';
import * as migration_20261022_182542_add_pricing_engine from './20261022_182542_add_pricing_engine';

export const migrations = [
  {
    up: migration_20260928_135753_initial_neon_schema.up,
    down: migration_20260928_135753_initial_neon_schema.down,
    name: '20260928_135753_initial_neon_schema',
  },
  {
    up: migration_20261022_182542_add_pricing_engine.up,
    down: migration_20261022_182542_add_pricing_engine.down,
    name: '20261022_182542_add_pricing_engine'
  },
];
