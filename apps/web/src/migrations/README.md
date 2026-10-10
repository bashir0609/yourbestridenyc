# Migration artifacts

This directory contains the reviewed initial Payload migration for Neon PostgreSQL. Follow the generation, review, test, and controlled-release workflow in `../../../../docs/MIGRATIONS.md` for every subsequent schema change.

Do not add placeholder SQL or empty `up`/`down` functions, and never enable automatic schema push in production.
