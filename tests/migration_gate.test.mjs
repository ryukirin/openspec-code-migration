import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { SCHEMA, edit, gate, workspace } from "./helpers.mjs";

function passes(result, message) {
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, message);
}

function fails(result, message) {
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, message);
}

test("schema.yaml names only templates that exist", () => {
  const schema = fs.readFileSync(path.join(SCHEMA, "schema.yaml"), "utf8");
  const templates = [...schema.matchAll(/^\s+template:\s*(\S+)\s*$/gm)].map((match) => match[1]);
  assert.ok(templates.length > 0);
  for (const template of templates) assert.ok(fs.existsSync(path.join(SCHEMA, "templates", template)), template);
});

test("complete fixtures pass every gate command", (t) => {
  const { pack, change } = workspace(t);
  passes(gate("stage", "strategy", "--root", pack), /ready for strategy/);
  passes(gate("stage", "propose", "--root", pack), /ready for propose/);
  passes(gate("lint", "--root", pack), /lint passed/);
  passes(gate("lint", "--root", change, "--defs", pack, "**/*.md"), /lint passed/);
  passes(gate("coverage", "--root", pack, "--change", change), /coverage complete/);
});

test("stage strategy needs the inventory and a readiness verdict", (t) => {
  const { pack } = workspace(t);
  edit(path.join(pack, "legacy-inventory.md"), "READINESS: BLOCKED", "READINESS: MAYBE");
  fails(gate("stage", "strategy", "--root", pack), /READINESS must be READY or BLOCKED/);
  fs.rmSync(path.join(pack, "legacy-inventory.md"));
  fails(gate("stage", "strategy", "--root", pack), /legacy-inventory\.md is missing -> run the migration-inventory skill/);
});

test("stage propose needs a feasible strategy", (t) => {
  const { pack } = workspace(t);
  edit(path.join(pack, "migration-strategy.md"), "FEASIBILITY: FEASIBLE", "FEASIBILITY: NOT_YET_PROVEN");
  fails(gate("stage", "propose", "--root", pack), /FEASIBILITY is NOT_YET_PROVEN/);
});

test("stage propose needs a strategy for every gap", (t) => {
  const { pack } = workspace(t);
  edit(path.join(pack, "migration-strategy.md"), "| GAP-001 | Rebuild", "| Rebuild");
  fails(gate("stage", "propose", "--root", pack), /GAP-001 has no strategy/);
});

test("stage propose needs a disposition for every suspected defect", (t) => {
  const { pack } = workspace(t);
  edit(path.join(pack, "migration-strategy.md"), "| LEGACY-002 | SECURITY_FIX_REQUIRED | Escape the name |", "");
  fails(gate("stage", "propose", "--root", pack), /LEGACY-002 \(suspected defect\) has no disposition/);
});

test("stage propose needs a conclusion for every unknown behaviour", (t) => {
  const { pack } = workspace(t);
  edit(path.join(pack, "migration-strategy.md"), "LEGACY-004", "the empty name");
  fails(gate("stage", "propose", "--root", pack), /LEGACY-004 \(unknown behaviour\) is not resolved/);
});

test("stage propose rejects open findings", (t) => {
  const { pack } = workspace(t);
  edit(path.join(pack, "migration-strategy.md"), "| RESOLVED |", "| OPEN |");
  fails(gate("stage", "propose", "--root", pack), /COMP-001 is still OPEN/);
});

test("lint reports undefined IDs, absolute paths, and broken tables", (t) => {
  const { change, pack } = workspace(t);
  const tasks = path.join(change, "tasks.md");
  fs.appendFileSync(tasks, "- [ ] 1.4 Run TEST-099 from C:\\work\\legacy\n");
  fs.appendFileSync(path.join(change, "design.md"), "\n| A | B |\n|---|---|\n| one | two | three |\n");
  const result = gate("lint", "--root", change, "--defs", pack, "**/*.md");
  fails(result, /TEST-099 is referenced but never defined/);
  assert.match(result.output, /machine-specific absolute path/);
  assert.match(result.output, /table row has 3 cells, header has 2/);
});

test("coverage reports each broken trace", (t) => {
  const { change, pack } = workspace(t);
  edit(path.join(change, "specs", "greeting", "spec.md"), "`LEGACY-004`, ", "");
  edit(path.join(change, "test-plan.md"), "REQ-GREETING-002, ", "");
  edit(path.join(change, "tasks.md"), "verify with TEST-002", "verify");
  edit(path.join(change, "tasks.md"), "the BATCH-001 exit", "the batch exit");
  edit(path.join(change, "tasks.md"), "## 1. BATCH-001: Greeting route", "## 1. Greeting route");
  const result = gate("coverage", "--root", pack, "--change", change);
  fails(result, /LEGACY-004 is not covered by any requirement/);
  assert.match(result.output, /REQ-GREETING-002 has no TEST/);
  assert.match(result.output, /TEST-002 is not run by any task/);
  assert.match(result.output, /BATCH-001 \(design\.md\) has no task/);
});

test("coverage exempts only behaviour marked REMOVE", (t) => {
  const { change, pack } = workspace(t);
  edit(path.join(pack, "migration-strategy.md"), "| LEGACY-003 | REMOVE |", "| LEGACY-003 | PRESERVE |");
  fails(gate("coverage", "--root", pack, "--change", change), /LEGACY-003 is not covered/);
});
