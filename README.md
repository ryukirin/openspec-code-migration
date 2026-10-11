# OpenSpec Code Migration

English | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

Agent skills and an [OpenSpec](https://github.com/Fission-AI/OpenSpec) schema for evidence-driven code migrations. You inventory the legacy system, settle a migration strategy and prove it feasible, and then OpenSpec writes and implements the change.

The skills use the open [Agent Skills](https://agentskills.io) format, so they work in Claude Code, Codex, and other agents that read `SKILL.md` folders.

## Workflow

| Step | Skill | Result |
|---|---|---|
| 0 | `migration-setup` | Installs the `code-migration` schema into the project (once per project) |
| 1 | `migration-inventory` | Legacy facts and a readiness check, for example "the database schema is missing" |
| 2 | `migration-strategy` | Target stack, gap and defect decisions, and a feasibility proof |
| 3 | OpenSpec propose | proposal, specs, design (with migration batches), test-plan, tasks |
| 4 | OpenSpec apply | Implementation, batch by batch |
| any | `migration-review` | Optional read-only review: `strategy`, `docs`, or `code` |

How you invoke a skill depends on the agent: `/migration-inventory` in Claude Code, `$migration-inventory` in Codex, or just ask for it by name.

The planning pack lives in `migration-plans/<migration-name>/`:

| File | Written by | Contents |
|---|---|---|
| `legacy-inventory.md` | migration-inventory | Components, dependencies, and the readiness check with its `GAP-###` items |
| `legacy-baseline.md` | migration-inventory | Observable legacy behaviour (`LEGACY-###`), suspected defects, unknowns |
| `migration-strategy.md` | migration-strategy | Target and scope, gap strategies, behaviour policy, compatibility findings and experiments, feasibility verdict |

Only cheap, mechanical checks are enforced:

- `migration-strategy` needs an inventory with a readiness verdict.
- OpenSpec propose needs every gap decided, every suspected defect given a disposition, every unknown resolved, nothing left `OPEN`, and `FEASIBILITY` set to `FEASIBLE` or `FEASIBLE_WITH_CONDITIONS`.

Reviews are advisory. They report in the conversation and never block.

## Case study: BookShop

[ryukirin/BookShop](https://github.com/ryukirin/BookShop) is a course-project web bookstore migrated with these skills from Java 8 Servlet/JSP and MySQL to Python 3.12, Flask, and SQLite. The planning pack is in [`migration-plans/bookshop/`](https://github.com/ryukirin/BookShop/tree/master/migration-plans/bookshop) and the OpenSpec change in [`openspec/changes/migrate-bookshop-to-flask/`](https://github.com/ryukirin/BookShop/tree/master/openspec/changes/migrate-bookshop-to-flask).

The legacy app had 4 servlets that dispatch on an `opttype` parameter, 4 DAOs that build SQL by string concatenation, and 19 JSPs. It had no build script and no tests, and its original MySQL database was lost.

| Step | What happened |
|---|---|
| Inventory | Recorded 39 components and 73 observable behaviours. Readiness was **BLOCKED** by two gaps: the original DDL was in neither the repository nor its history (GAP-001), and the original data was gone (GAP-002). It also noted that the Eclipse project had no build script and that the legacy app could not run on the machine. |
| Strategy | Asked 13 decisions. Target: Python 3.12.10, Flask 3.1.3, waitress 3.0.2, and SQLite with STRICT tables and WAL. GAP-001 was handled by rebuilding the schema from the DAO SQL, keeping the legacy column names and adding constraints. GAP-002 was handled by an `init-db` command that loads demo data. 9 behaviours were marked `SECURITY_FIX_REQUIRED` and 15 `BUG_NOT_PRESERVED`. The step produced 27 compatibility findings and ran 13 experiments, such as 20 concurrent purchases against SQLite and the real waitress request-size limits. Verdict: `FEASIBLE_WITH_CONDITIONS`. |
| OpenSpec change | 8 capability specs, 48 requirements, 22 design decisions, 8 reversible batches, 45 tests, and 61 tasks. `coverage` and `lint` pass. |
| Implementation | A Flask app with 610 pytest tests (unit, Flask client, real waitress server, repository scans). Security changes include parameterized SQL, scrypt password hashing, CSRF tokens, and auto-escaped output. |
| Verification | All 610 tests pass locally and on GitHub Actions with `windows-latest`, and the same CI run passes the gate's `coverage` and `lint`. Rollback was rehearsed: reverting the implementation commits gives a tree identical to the one before implementation, and a test in CI stops the real server and restores the data from a backup. The pages were checked by hand in a browser. |
| Result | All 61 tasks are done and merged into `master` through PR #1. The production cutover task was dropped because the project has no production environment. The cutover steps are in BookShop's run guide, and the same smoke checks run automatically in CI. |

## Requirements

- OpenSpec CLI 1.13.1 or later, with OpenSpec's own skills generated for your agent (`openspec init --tools <your-agent>`).
- Node.js, which OpenSpec already requires.

## Install

With the [skills CLI](https://github.com/vercel-labs/skills), from your project root:

```
npx skills add ryukirin/openspec-code-migration
```

Or copy the folders under `skills/` into your agent's skills directory: `.claude/skills/` for Claude Code, `.agents/skills/` for Codex and other agents that read the shared directory.

Then run the `migration-setup` skill in your project. It copies the schema into `openspec/schemas/code-migration/` and validates it. Run it again after updating the skills.

To use the schema without the skills, copy `skills/migration-setup/schema/code-migration/` to `openspec/schemas/code-migration/` and run `openspec schema validate code-migration`.

## Supplying your own strategy

If you already have a migration strategy, give it to `migration-strategy` as text or as a file path. Decisions it states are adopted as given. Only what it leaves open, or what the evidence contradicts, is asked.

```
/migration-strategy java-to-python docs/migration-policy.md
/migration-strategy java-to-python Target Python 3.12 + Flask + SQLite, keep every URL, hash passwords
```

## Gate script

The schema ships `scripts/migration_gate.mjs`. Find the schema directory with `openspec schema which code-migration --json`.

| Command | Checks |
|---|---|
| `stage strategy\|propose --root <pack>` | Prerequisites for a step |
| `lint --root <dir> [--defs <pack>] [patterns]` | Table column counts, IDs referenced but never defined, machine-specific absolute paths |
| `coverage --root <pack> --change <changeRoot>` | LEGACY to requirement, requirement to TEST, TEST to task, and BATCH to task |

## Project conventions

Put project-specific rules in your own `openspec/config.yaml`, not in the schema. For example:

```yaml
schema: code-migration
rules:
  test-plan:
    - Mark whether each TEST runs in GitHub Actions.
operations:
  apply:
    guidance:
      - Do not archive the change when the migration is done.
```

## License

MIT
