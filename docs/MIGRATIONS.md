# Neon PostgreSQL migration workflow

## Policy

Payload schema changes use checked-in, reviewed migrations. `DATABASE_PUSH` must be `false` for Neon production and every migration-managed environment. Automatic schema synchronization is never part of application startup or production deployment.

The migration directory is `apps/web/src/migrations`. It intentionally contains no fabricated migration. Generate the initial migration only with a valid disposable database environment and the exact committed dependency graph.

## Initial migration

1. Install from the repository root with `pnpm install --frozen-lockfile`.
2. Create a disposable Neon branch from an empty database using the same PostgreSQL compatibility settings as production.
3. Configure `apps/web/.env.local` with the disposable branch `DATABASE_URI`, complete Payload/R2 variables, `SITE_URL`, and `DATABASE_PUSH=false`.
4. From the repository root, run:

   ```sh
   pnpm --filter @yourbestride/web migrate:create initial_neon_schema
   ```

5. Review every generated SQL/TypeScript migration, snapshot, and migration registry change. Confirm:
   - Payload authentication and internal tables
   - Users and role fields
   - Services, fleet vehicles, drivers, locations, pages, posts, testimonials, and media
   - Transportation leads, driver applications, and intake rate-limit records
   - Globals, drafts, versions, arrays, relationships, indexes, and unique slug constraints
   - No unexpected destructive operations or inferred rename errors
6. Create a second pristine Neon branch and apply the reviewed artifacts:

   ```sh
   pnpm --filter @yourbestride/web migrate
   pnpm --filter @yourbestride/web migrate:status
   ```

7. Start the application against that branch and verify admin authentication, all required collections, editorial create/publish/read behavior, lead access, and media relationships.
8. Test rollback only on a disposable branch using Payload's supported migration-down command, then reapply. Document when rollback is destructive and requires restore or a forward fix.
9. Commit the migration, snapshot, registry, generated Payload types, and admin import map together after review.

## Subsequent migrations

Generate one descriptive migration for each intentional schema change:

```sh
pnpm --filter @yourbestride/web migrate:create descriptive_change_name
```

Test upgrades from a production-like Neon branch or restored backup. Treat rename prompts deliberately; do not accept drop-and-create when data must be retained. Use expand/contract changes when old and new application versions may overlap.

## Production release

1. Verify the release commit and frozen lockfile in CI.
2. Back up production and verify restoration access.
3. Pull production secrets into a controlled, non-logged environment.
4. Run `migrate:status`, then `migrate`, exactly once with an authorized migration role.
5. Confirm status and perform database/application smoke tests.
6. Deploy or enable the compatible application version.

Never run `migrate:fresh`, `migrate:reset`, automatic push, or unreviewed generated SQL against production. Do not execute migrations from every Vercel function instance or application startup.

## Connection verification

A successful migration status check verifies that Payload can authenticate to Neon and access its migration metadata. Runtime verification additionally requires starting the app and reading/writing test records on an isolated branch. Do not use a production write as a connectivity test.

If connection verification fails, check the Neon branch state, TLS requirement, connection string, role privileges, pooled/direct endpoint choice for the command, and project connection limits. Never print the full URI in logs.
