---
name: migration-review
description: Read-only review of one migration stage, reported as a table in the conversation. Writes no files, needs no approval, and blocks nothing. Modes - strategy reviews the planning pack, docs reviews the OpenSpec change documents, code reviews the implementation. The user decides when to run it.
license: MIT
compatibility: Requires the OpenSpec CLI (1.13.1 or later), Node.js, and the code-migration schema installed by migration-setup.
---

# Migration Review

Find the problems that would make the implementation go wrong or need rework, and report them in the conversation. The review is read-only: it changes nothing it reviews, writes no review file, and asks for no approval. Whether and when to fix is the user's call.

`<schema>` is the `path` from `openspec schema which code-migration --json`; gate is `node <schema>/scripts/migration_gate.mjs`.

## How

1. **Mode and scope.** Use the mode the user names (strategy, docs, or code). Otherwise go by progress: implementation started means code; an OpenSpec change without implementation means docs; anything earlier means strategy. If the user only wants certain files or one change (for example a `git diff`), review only that.
2. **Run the scripts first**, so mechanical problems are left to them:
   - strategy: `gate lint --root <pack>` and `gate stage propose --root <pack>`
   - docs: `gate lint --root <changeRoot> --defs <pack> "**/*.md"` and `gate coverage --root <pack> --change <changeRoot>`
   - code: the automated checks in test-plan.md, or the CI results for the same commit
3. **Independent reviewer.** If your agent can start a subagent with a fresh context (for example the Agent tool in Claude Code), give it the mode, the file list, the script output, and the checklist below, and require read-only work that returns findings only. Do not share the author's conclusions. Otherwise, review it yourself and say so in the report.
4. **Report in the conversation:**
   - one line: are there BLOCKER/HIGH findings, and should they be fixed first or is it fine to continue;
   - a findings table with number, severity (BLOCKER/HIGH/MEDIUM/LOW), related IDs, problem and evidence, and the skill that fixes it. At most 15 rows, most severe first. No wording or formatting nits;
   - one line with the script results.

## Checklists

**strategy**: inventory, baseline, and strategy in `migration-plans/<name>/`
- the readiness check missed no material, such as tables, configuration, or external services the code uses but the repository lacks;
- each GAP strategy works on the target stack, and its consequence is stated;
- compatibility conclusions have evidence, experiments were actually run, and accepted risks have a response;
- how the target handles schema, constraints, transactions, and encoding is spelled out;
- no security issue is kept as is;
- decisions do not contradict each other, and a user-supplied strategy is followed faithfully.

**docs**: proposal, specs, design, test-plan, and tasks of the OpenSpec change
- specs follow the strategy's dispositions and add no scope beyond it;
- design batches are correctly ordered, with measurable exit criteria and a workable rollback;
- data migration follows the GAP strategies;
- design makes no major decision the strategy does not cover.

**code**: implementation and test results, against specs, test-plan, and tasks
- every PRESERVE behaviour has a passing test;
- security fixes and defects not preserved are handled as the strategy says;
- each BATCH has evidence for its exit criteria, and rollback still works;
- no dependency or scope outside the plan.
