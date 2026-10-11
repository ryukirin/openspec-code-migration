---
name: migration-inventory
description: Migration step 1. Scan the legacy system read-only and write legacy-inventory.md (components plus a migration readiness check) and legacy-baseline.md (observable behaviour). States plainly whether missing material, such as a database schema, blocks the migration. Records facts only and makes no migration decisions.
license: MIT
compatibility: Requires the OpenSpec CLI (1.13.1 or later), Node.js, and the code-migration schema installed by migration-setup.
---

# Migration Inventory

Record what the legacy system is today. What to keep and how to migrate is decided in the `migration-strategy` skill.

The user may name the migration; if not, derive a kebab-case name from the project and say so. `<schema>` is the `path` from `openspec schema which code-migration --json`; if the schema is not found, run the `migration-setup` skill first.

- Planning pack: `migration-plans/<migration-name>/`, created if missing
- Templates: `<schema>/templates/legacy-inventory.md` and `legacy-baseline.md`
- gate: `node <schema>/scripts/migration_gate.mjs`

## Steps

1. Scan the legacy code read-only: entry points, modules, dependencies and versions, build, routes and interfaces, persistence and SQL, configuration, authentication and authorization, static assets, tests. On a rerun, update the files in place and keep existing IDs.
2. Write `legacy-inventory.md`: one `INV-###` per component, with evidence as `relative/path:symbol`.
3. Write `legacy-baseline.md`: one `LEGACY-###` per observable behaviour, marked STATIC (read from code) or RUNTIME (observed while running). Behaviour that looks like a defect or a security issue, and behaviour you cannot pin down, go in their own tables. Facts only, no dispositions.
4. **Migration readiness check**, written at the top of `legacy-inventory.md`. Check every material the migration needs: source code, build and dependencies, database schema, data or seed data, runtime configuration, external services, static assets, and whether the legacy system can run.
   - Material the code uses but the repository does not contain counts as missing. For example, SQL in a data-access class reads a table, but no DDL or data export exists anywhere: the database schema is missing.
   - If the migration target cannot be settled without it, it is blocking: open a `GAP-###` with the evidence, the impact, and how to unblock it.
   - Any blocking GAP means `READINESS: BLOCKED`; otherwise `READINESS: READY`.
5. Run `gate lint --root migration-plans/<name>` and fix what it reports. Write machine-specific absolute paths found in legacy code as `<redacted-local-path>`.

## When done

Open the reply with the readiness verdict:

- **READY**: the next step is the `migration-strategy` skill.
- **BLOCKED**: list each GAP (what is missing, why it is needed, where the evidence is), then offer two ways forward and let the user choose:
  1. supply the material and rerun `migration-inventory`;
  2. choose a strategy for each GAP in `migration-strategy`, for example rebuilding the schema from code or skipping historical data.
