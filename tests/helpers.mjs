import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SCHEMA = path.join(REPO, "skills", "migration-setup", "schema", "code-migration");
export const GATE = path.join(SCHEMA, "scripts", "migration_gate.mjs");
const FIXTURES = path.join(REPO, "tests", "fixtures");

// Copies the fixture planning pack and change into a fresh temporary directory.
export function workspace(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "code-migration-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const pack = path.join(root, "migration-plans", "hello");
  const change = path.join(root, "change");
  fs.cpSync(path.join(FIXTURES, "pack"), pack, { recursive: true });
  fs.cpSync(path.join(FIXTURES, "change"), change, { recursive: true });
  return { root, pack, change };
}

export function edit(file, search, replacement) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(search)) throw new Error(`${file} does not contain: ${search}`);
  fs.writeFileSync(file, text.replaceAll(search, replacement));
}

export function gate(...args) {
  const result = spawnSync(process.execPath, [GATE, ...args], { encoding: "utf8" });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}
