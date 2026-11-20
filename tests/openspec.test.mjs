// Runs the schema through the OpenSpec CLI: install, validate, create a change,
// fill it from the fixtures, and run the gate from the resolved schema path.
// Uses `openspec` from PATH, or OPENSPEC_BIN. Skips when the CLI is missing,
// unless REQUIRE_OPENSPEC is set (CI sets it).
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { SCHEMA, gate, workspace } from "./helpers.mjs";

const BIN = process.env.OPENSPEC_BIN || "openspec";
const WINDOWS = process.platform === "win32";

function openspec(cwd, ...args) {
  // On Windows the npm shim is a .cmd file, which needs a shell. The arguments
  // here are fixed words without spaces, so joining them is safe.
  const result = WINDOWS
    ? spawnSync(`"${BIN}" ${args.join(" ")}`, { cwd, encoding: "utf8", shell: true })
    : spawnSync(BIN, args, { cwd, encoding: "utf8" });
  return { status: result.status, stdout: result.stdout ?? "", output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

function json(result) {
  assert.equal(result.status, 0, result.output);
  return JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
}

const version = openspec(process.cwd(), "--version");
const available = version.status === 0;
if (!available && process.env.REQUIRE_OPENSPEC) throw new Error(`OpenSpec CLI not found: ${BIN}`);

test(`code-migration schema works with OpenSpec ${available ? version.stdout.trim() : "(not installed)"}`, { skip: !available && "OpenSpec CLI not installed" }, (t) => {
  const { root, pack, change } = workspace(t);

  // Create the openspec/ layout directly. `openspec init` would also install
  // agent skills and register the project in the user's global config.
  for (const dir of ["specs", "changes", "schemas"]) fs.mkdirSync(path.join(root, "openspec", dir), { recursive: true });
  fs.writeFileSync(path.join(root, "openspec", "config.yaml"), "schema: spec-driven\n");
  fs.cpSync(SCHEMA, path.join(root, "openspec", "schemas", "code-migration"), { recursive: true });

  const validated = openspec(root, "schema", "validate", "code-migration");
  assert.equal(validated.status, 0, validated.output);

  const which = json(openspec(root, "schema", "which", "code-migration", "--json"));
  assert.equal(which.source, "project");
  const resolvedGate = path.join(which.path, "scripts", "migration_gate.mjs");
  assert.ok(fs.existsSync(resolvedGate), resolvedGate);

  const created = openspec(root, "new", "change", "hello", "--schema", "code-migration");
  assert.equal(created.status, 0, created.output);
  const changeRoot = path.join(root, "openspec", "changes", "hello");
  const before = json(openspec(root, "status", "--change", "hello", "--json"));
  assert.equal(before.schemaName, "code-migration");

  fs.cpSync(change, changeRoot, { recursive: true });
  const valid = json(openspec(root, "validate", "hello", "--strict", "--json"));
  assert.equal(valid.summary.totals.failed, 0, JSON.stringify(valid.items));

  const status = openspec(root, "status", "--change", "hello");
  assert.match(status.output, /5\/5 artifacts complete/);

  const coverage = spawnSync(process.execPath, [resolvedGate, "coverage", "--root", pack, "--change", changeRoot], { encoding: "utf8" });
  assert.equal(coverage.status, 0, `${coverage.stdout}${coverage.stderr}`);
  assert.equal(gate("stage", "propose", "--root", pack).status, 0);
});
