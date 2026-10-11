#!/usr/bin/env node
// Mechanical checks for the code-migration workflow. Skills call this instead of
// re-checking step prerequisites, tables, IDs, paths, and coverage by hand.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ID = String.raw`(?:INV|LEGACY|GAP|MIG-RULE|MIG-DEC|COMP|EXP|BATCH|DEC|TEST|REQ(?:-[A-Z0-9]+)+)-\d{3}`;
const ID_EXACT = new RegExp(`^${ID}$`);
const PATH_LEAK = /(?<![A-Za-z0-9])[A-Za-z]:[\\/]|[\\/]Users[\\/]|AppData/;
const OPEN_STATUSES = new Set(["OPEN", "WAITING_FOR_EVIDENCE"]);

const PACK = {
  inventory: "legacy-inventory.md",
  baseline: "legacy-baseline.md",
  strategy: "migration-strategy.md",
};

const toPosix = (value) => value.replaceAll("\\", "/");
const idTokens = (text) => text.match(new RegExp(`(?<![A-Za-z0-9-])${ID}(?![0-9])`, "g")) ?? [];
const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);
const firstCell = (row) => row.cells[0].replaceAll("`", "");

function visibleLines(text) {
  const result = [];
  let fenced = false;
  text.split(/\r?\n/).forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    else if (!fenced) result.push({ number: index + 1, line });
  });
  return result;
}

function fields(text) {
  const values = {};
  for (const { line } of visibleLines(text)) {
    const match = line.trim().replace(/^`+|`+$/g, "").match(/^([A-Z][A-Z-]*[A-Z]):\s*(.*)$/);
    if (match && !(match[1] in values)) values[match[1]] = match[2].trim();
  }
  return values;
}

function tableRows(text) {
  return visibleLines(text)
    .filter(({ line }) => line.trim().startsWith("|"))
    .map(({ number, line }) => ({
      number,
      cells: line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/).map((cell) => cell.trim()),
    }));
}

function rowIds(text) {
  return text ? tableRows(text).map(firstCell).filter((cell) => ID_EXACT.test(cell)) : [];
}

function section(text, title) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^#{1,6}\s/.test(line) && line.replace(/^#+\s*/, "").trim().toLowerCase() === title.toLowerCase());
  if (start === -1) return null;
  const level = lines[start].match(/^#+/)[0].length;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => {
    const match = line.match(/^(#{1,6})\s/);
    return match && match[1].length <= level;
  });
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

function requireSection(errors, file, text, title, fix) {
  const body = section(text, title);
  if (body === null) errors.push(`${file}: missing section "${title}" (use the template) -> run ${fix}`);
  return body;
}

function walk(root) {
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...walk(full));
    else if (entry.isFile()) result.push(full);
  }
  return result;
}

function globRegex(pattern) {
  let source = "^";
  const normalized = toPosix(pattern);
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (char === "*" && normalized[index + 1] === "*" && normalized[index + 2] === "/") {
      source += "(?:.*/)?";
      index += 2;
    } else if (char === "*" && normalized[index + 1] === "*") {
      source += ".*";
      index += 1;
    } else if (char === "*") source += "[^/]*";
    else if (char === "?") source += "[^/]";
    else source += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
  }
  return new RegExp(`${source}$`);
}

function expandPatterns(root, patterns) {
  const allFiles = walk(root);
  const found = new Set();
  for (const pattern of patterns) {
    const regex = globRegex(pattern);
    const matches = allFiles.filter((file) => regex.test(toPosix(path.relative(root, file))));
    if (matches.length === 0) throw new Error(`Input pattern matched no files: ${pattern}`);
    for (const match of matches) found.add(path.resolve(match));
  }
  return [...found].sort();
}

function stageErrors(root, stage) {
  const stages = ["strategy", "propose"];
  if (!stages.includes(stage)) throw new Error(`Unknown stage "${stage}". Use one of: ${stages.join(", ")}`);

  const errors = [];
  const need = (key, fix) => {
    const text = readText(path.join(root, PACK[key]));
    if (text === null) errors.push(`${PACK[key]} is missing -> run ${fix}`);
    return text;
  };

  const inventory = need("inventory", "the migration-inventory skill");
  const baseline = need("baseline", "the migration-inventory skill");
  if (inventory !== null && !["READY", "BLOCKED"].includes(fields(inventory).READINESS)) {
    errors.push(`${PACK.inventory}: READINESS must be READY or BLOCKED -> run the migration-inventory skill`);
  }
  if (stage === "strategy" || errors.length) return errors;

  const strategy = need("strategy", "the migration-strategy skill");
  if (strategy === null) return errors;
  const fix = "the migration-strategy skill";

  const gaps = rowIds(requireSection(errors, PACK.inventory, inventory, "Migration Readiness", "the migration-inventory skill"));
  const gapDecisions = new Set(rowIds(requireSection(errors, PACK.strategy, strategy, "Readiness Gap Decisions", fix)));
  for (const gap of gaps.filter((id) => !gapDecisions.has(id))) errors.push(`${gap} has no strategy in ${PACK.strategy} -> run ${fix}`);

  const defects = rowIds(requireSection(errors, PACK.baseline, baseline, "Suspected Defects and Security Issues", "the migration-inventory skill"));
  const policies = new Set(rowIds(requireSection(errors, PACK.strategy, strategy, "Behaviour Policy", fix)));
  for (const defect of defects.filter((id) => !policies.has(id))) errors.push(`${defect} (suspected defect) has no disposition in ${PACK.strategy} -> run ${fix}`);

  const feasibility = fields(strategy).FEASIBILITY;
  if (!["FEASIBLE", "FEASIBLE_WITH_CONDITIONS"].includes(feasibility)) {
    errors.push(`${PACK.strategy}: FEASIBILITY is ${feasibility || "empty"}, must be FEASIBLE or FEASIBLE_WITH_CONDITIONS -> run ${fix}`);
  }
  for (const row of tableRows(strategy)) {
    const status = row.cells.at(-1).replaceAll("`", "").toUpperCase();
    if (ID_EXACT.test(firstCell(row)) && OPEN_STATUSES.has(status)) errors.push(`${PACK.strategy}:${row.number}: ${firstCell(row)} is still ${status} -> run ${fix}`);
  }
  const unknowns = rowIds(requireSection(errors, PACK.baseline, baseline, "Unknown Behaviour", "the migration-inventory skill"));
  const handled = new Set(idTokens(strategy));
  for (const unknown of unknowns.filter((id) => !handled.has(id))) errors.push(`${unknown} (unknown behaviour) is not resolved in ${PACK.strategy} -> run ${fix}`);
  return errors;
}

function addDefinitions(text, definitions) {
  rowIds(text).forEach((id) => definitions.add(id));
  for (const { line } of visibleLines(text)) if (/^#{1,6}\s/.test(line)) idTokens(line).forEach((id) => definitions.add(id));
}

function lintErrors(root, patterns, definitionsRoot) {
  const errors = [];
  const definitions = new Set();
  const references = new Map();
  if (definitionsRoot) for (const file of expandPatterns(definitionsRoot, ["*.md"])) addDefinitions(fs.readFileSync(file, "utf8"), definitions);
  for (const file of expandPatterns(root, patterns.length ? patterns : ["*.md"])) {
    const relative = toPosix(path.relative(root, file));
    const text = fs.readFileSync(file, "utf8");
    addDefinitions(text, definitions);

    let previous = -1;
    let expected = 0;
    for (const row of tableRows(text)) {
      if (row.number !== previous + 1) expected = row.cells.length;
      else if (row.cells.length !== expected) errors.push(`${relative}:${row.number}: table row has ${row.cells.length} cells, header has ${expected}`);
      previous = row.number;
    }

    for (const { number, line } of visibleLines(text)) {
      for (const id of idTokens(line)) if (!references.has(id)) references.set(id, `${relative}:${number}`);
      if (PATH_LEAK.test(line.replace(/https?:\/\/\S+/g, ""))) {
        errors.push(`${relative}:${number}: machine-specific absolute path; use a repository-relative path or <redacted-local-path>`);
      }
    }
  }
  for (const [id, where] of references) if (!definitions.has(id)) errors.push(`${where}: ${id} is referenced but never defined (define it in a table's first column or a heading)`);
  return errors;
}

function coverageErrors(root, changeRoot) {
  const errors = [];
  const baseline = readText(path.join(root, PACK.baseline));
  const strategy = readText(path.join(root, PACK.strategy));
  if (baseline === null || strategy === null) return [`${PACK.baseline} and ${PACK.strategy} are required`];

  const removed = new Set(
    tableRows(section(strategy, "Behaviour Policy") ?? "")
      .filter((row) => row.cells.some((cell) => cell.replaceAll("`", "").toUpperCase() === "REMOVE"))
      .map(firstCell),
  );
  const specFiles = fs.existsSync(path.join(changeRoot, "specs")) ? walk(path.join(changeRoot, "specs")).filter((file) => file.endsWith(".md")) : [];
  const specText = specFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
  const specIds = new Set(idTokens(specText));
  for (const legacy of rowIds(baseline).filter((id) => !removed.has(id) && !specIds.has(id))) {
    errors.push(`${legacy} is not covered by any requirement in specs/ (or mark it REMOVE in ${PACK.strategy})`);
  }

  const testPlan = readText(path.join(changeRoot, "test-plan.md")) ?? "";
  const tasks = readText(path.join(changeRoot, "tasks.md")) ?? "";
  const design = readText(path.join(changeRoot, "design.md")) ?? "";
  const testPlanIds = new Set(idTokens(testPlan));
  const taskIds = new Set(idTokens(tasks));
  const requirements = new Set();
  for (const { line } of visibleLines(specText)) {
    if (/^#{1,6}\s/.test(line)) idTokens(line).filter((id) => id.startsWith("REQ-")).forEach((id) => requirements.add(id));
  }
  for (const requirement of [...requirements].filter((id) => !testPlanIds.has(id))) errors.push(`${requirement} has no TEST in test-plan.md`);
  for (const test of rowIds(testPlan).filter((id) => id.startsWith("TEST-") && !taskIds.has(id))) errors.push(`${test} is not run by any task in tasks.md`);
  for (const batch of rowIds(section(design, "Migration Batches")).filter((id) => !taskIds.has(id))) errors.push(`${batch} (design.md) has no task in tasks.md`);
  return errors;
}

function option(args, name, required = false) {
  const index = args.indexOf(name);
  if (index === -1) {
    if (required) throw new Error(`Missing required option: ${name}`);
    return undefined;
  }
  if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`Missing value for: ${name}`);
  return args[index + 1];
}

function positional(args, valueOptions) {
  const result = [];
  for (let index = 0; index < args.length; index += 1) {
    if (valueOptions.has(args[index])) index += 1;
    else if (!args[index].startsWith("--")) result.push(args[index]);
  }
  return result;
}

function report(errors, success) {
  if (errors.length) {
    process.stderr.write(`${errors.map((error) => `- ${error}`).join("\n")}\n`);
    return 1;
  }
  process.stdout.write(`${success}\n`);
  return 0;
}

const USAGE = `Usage: migration_gate.mjs <command> [options]
  stage <strategy|propose> --root <pack>              check the prerequisites for a step
  lint --root <dir> [--defs <pack>] [patterns...]     tables, ID references, absolute paths (default *.md)
  coverage --root <pack> --change <changeRoot>        LEGACY->REQ, REQ->TEST, TEST->task, BATCH->task`;

function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "stage") {
    const root = path.resolve(option(args, "--root", true));
    const stage = positional(args, new Set(["--root"]))[0];
    return report(stageErrors(root, stage), `OK: ready for ${stage}`);
  }
  if (command === "lint") {
    const root = path.resolve(option(args, "--root", true));
    const definitionsRoot = option(args, "--defs");
    const patterns = positional(args, new Set(["--root", "--defs"]));
    return report(lintErrors(root, patterns, definitionsRoot && path.resolve(definitionsRoot)), "OK: lint passed");
  }
  if (command === "coverage") {
    const root = path.resolve(option(args, "--root", true));
    const change = path.resolve(option(args, "--change", true));
    return report(coverageErrors(root, change), "OK: coverage complete");
  }
  process.stderr.write(`${USAGE}\n`);
  return command ? 1 : 0;
}

try {
  process.exitCode = main();
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}
