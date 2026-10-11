---
name: migration-setup
description: Install or update the code-migration OpenSpec schema in the current project. Use once per project before migration-inventory, and again after updating these skills.
license: MIT
compatibility: Requires the OpenSpec CLI (1.13.1 or later) and Node.js.
---

# Migration Setup

The schema ships with this skill, in the `schema/code-migration/` directory next to this file.

1. Run `openspec --version`. If OpenSpec is missing, tell the user to install it (`npm install -g @fission-ai/openspec`) and stop.
2. Run `openspec list --json`. If `root` is null, the project has no `openspec/` directory: ask whether to run `openspec init`, and do not initialize without a yes.
3. Copy `schema/code-migration/` from this skill's directory to `openspec/schemas/code-migration/` in the project, replacing the directory as a whole. If it already exists and differs, list the files that would change and ask before replacing.
4. Run `openspec schema validate code-migration`.
5. If `openspec/config.yaml` does not set `schema: code-migration`, ask whether to make it the project default. Without it, new changes need `--schema code-migration`.
6. The next step is the `migration-inventory` skill.
