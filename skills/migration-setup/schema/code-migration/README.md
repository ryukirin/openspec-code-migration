# code-migration

An [OpenSpec](https://github.com/Fission-AI/OpenSpec) schema for moving a legacy system to another language or stack while keeping the behaviour you decide to keep. It is part of [openspec-code-migration](https://github.com/ryukirin/openspec-code-migration), which also provides the companion skills that write the planning pack this schema reads.

## Artifacts

`proposal` → `specs` → `design` → `test-plan` → `tasks`, then `apply` one batch at a time.

| Artifact | Contents |
|---|---|
| `proposal` | Handoff from the planning pack: scope, target stack, capabilities, major decisions |
| `specs` | One delta spec per capability. Requirements (`REQ-<CAPABILITY>-###`) trace to `LEGACY-###` and `MIG-RULE-###` |
| `design` | Target design, reversible migration batches (`BATCH-###`), decisions (`DEC-###`) |
| `test-plan` | At least one `TEST-###` per requirement, with its oracle, command, and where it runs |
| `tasks` | Tasks grouped by batch, each naming its batch, requirement or decision, and test |

## Planning pack

`proposal` starts by checking `migration-plans/<migration-name>/` and stops if the pack is missing or incomplete:

- `legacy-inventory.md`: components and a readiness check (`READINESS`, `GAP-###`)
- `legacy-baseline.md`: observable legacy behaviour (`LEGACY-###`), suspected defects, unknowns
- `migration-strategy.md`: target and scope, a strategy for every gap, a disposition for every suspected defect, and `FEASIBILITY` set to `FEASIBLE` or `FEASIBLE_WITH_CONDITIONS`

The `migration-inventory` and `migration-strategy` skills write these files. You can also write them yourself from the templates in `templates/`.

## Install

With the skills, from your project root:

```
npx skills add ryukirin/openspec-code-migration
```

Then run the `migration-setup` skill, which copies this directory into the project and validates it.

Without the skills, copy this directory to `openspec/schemas/code-migration/` and run:

```
openspec schema validate code-migration
openspec new change <change-name> --schema code-migration
```

To make it the project default, set `schema: code-migration` in `openspec/config.yaml`.

Requires the OpenSpec CLI 1.13.1 or later and Node.js. CI tests 1.13.1 and the latest release.

## Gate script

The artifact instructions run `scripts/migration_gate.mjs`. Find its directory with `openspec schema which code-migration --json`.

| Command | Checks |
|---|---|
| `stage strategy\|propose --root <pack>` | Prerequisites for a step |
| `lint --root <dir> [--defs <pack>] [patterns]` | Table column counts, IDs referenced but never defined, machine-specific absolute paths |
| `coverage --root <pack> --change <changeRoot>` | LEGACY to requirement, requirement to TEST, TEST to task, and BATCH to task |

The script uses only Node built-ins, reads the Markdown files it is pointed at, writes nothing, and makes no network calls.

## More

The [repository README](https://github.com/ryukirin/openspec-code-migration#readme) covers the skills, the full workflow, and a worked example.

## License

MIT. See [LICENSE](https://github.com/ryukirin/openspec-code-migration/blob/main/LICENSE).
