---
name: migration-strategy
description: Migration step 2. After migration-inventory, set the migration strategy (target stack, scope, how to handle each readiness gap, whether suspected defects are kept) and prove it feasible, in migration-strategy.md. A strategy the user supplies with the request, as text or a file path, is adopted as given; only what it leaves open is asked.
license: MIT
compatibility: Requires the OpenSpec CLI (1.13.1 or later), Node.js, and the code-migration schema installed by migration-setup.
---

# Migration Strategy

Decide the strategy and prove it feasible in one pass. The two alternate: when something proves infeasible, ask the user right away instead of going back and forth between steps.

`<schema>` is the `path` from `openspec schema which code-migration --json`; if the schema is not found, run the `migration-setup` skill first.

- Template: `<schema>/templates/migration-strategy.md`
- gate: `node <schema>/scripts/migration_gate.mjs`

## A strategy from the user

If the request carries a migration strategy, as text or as a file path, read it first.

- Adopt every decision it states. Record each in the Decisions table with source `USER_POLICY` and do not ask about it again.
- Ask only about what it leaves out, leaves vague, or contradicts in the inventory evidence. Record those as `ASKED`.
- If one of its choices later proves infeasible, ask the user. Never change it silently.

## Asking

Use your agent's structured question tool if it has one (AskUserQuestion in Claude Code); otherwise ask in plain text with numbered options. Ask up to 4 questions at a time, each with 2–3 mutually exclusive options, the recommended option first and labelled "(Recommended)", with its evidence and cost. No answer, or a vague one, is not a decision.

## Steps

1. Run `gate stage strategy --root migration-plans/<name>`; if it fails, show the output and stop. Read the inventory and baseline and draft from the template. Take source-side facts from the inventory.
2. **Target and scope.** Ask for whatever is still missing: target language, runtime, frameworks, data store, and their versions; migration scope and fidelity. For the stack, offer 2–3 candidates, each with a rough feasibility note: equivalent frameworks and libraries, whether the data store can take over the data, deployment constraints.
3. **Gaps and defects**, once the target is set so the options are concrete.
   - Every `GAP-###` needs a strategy. For a missing database schema the usual options are: rebuild a minimal schema from code evidence (Recommended; no historical data parity); pause and recover the original schema or data; skip historical data and start from an empty or demo database. If the user chooses to pause, stop here and ask them to rerun `migration-inventory` once the material is available.
   - Every suspected defect or security issue in the baseline gets a disposition: keep as is, fix (`BUG_NOT_PRESERVED` / `SECURITY_FIX_REQUIRED`), or remove. Never recommend keeping a security issue.
   - `LEGACY-###` items not listed default to PRESERVE; do not ask about them one by one.
4. **Prove feasibility** against the exact chosen versions: language and runtime semantics, framework and library equivalents, data types, encoding, constraints and transactions, interfaces and serialization, authentication and sessions, build and deployment, licences.
   - Record one `COMP-###` per risk. Where only a test can settle it, open an `EXP-###` and run it yourself where you can (a small prototype, a version probe), then record the result.
   - When repository evidence is not enough, cite official primary sources under Sources.
   - Every Unknown behaviour in the baseline needs a conclusion.
5. **Infeasible or unresolved items:** ask the user whether to change the target, accept the risk, or reduce scope, then return to step 4.
6. Set `FEASIBILITY`. Run `gate lint --root migration-plans/<name>`, then check with `gate stage propose --root migration-plans/<name>`. When both pass, the next step is OpenSpec's propose workflow with the `code-migration` schema. The `migration-review` skill (strategy mode) is available for an optional check first.

On a rerun, update the file in place and keep existing IDs and decisions unless the user asks to change them.
