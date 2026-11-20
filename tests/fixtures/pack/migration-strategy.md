# Migration Strategy

FEASIBILITY: FEASIBLE

## Source and Target

| Dimension | Source | Target |
|---|---|---|
| Language and version | Java 8 | Python 3.12 |
| Frameworks and versions | Servlet 3.1 | Flask 3.1 |

## Scope

### In Scope

The greeting page.

### Out of Scope

The admin page.

## Readiness Gap Decisions

| Gap ID | Strategy | Consequence accepted |
|---|---|---|
| GAP-001 | Rebuild a minimal schema from the DAO SQL | No historical data parity |

## Behaviour Policy

| Legacy ID | Disposition | Rationale |
|---|---|---|
| LEGACY-002 | SECURITY_FIX_REQUIRED | Escape the name |
| LEGACY-003 | REMOVE | The admin page is out of scope |
| LEGACY-004 | PRESERVE | EXP-001 showed an empty name returns `Hello, ` |

## Rules

| Rule ID | Rule | How it is verified |
|---|---|---|
| MIG-RULE-001 | Keep every public URL | A route test per URL |

## Decisions

| Decision ID | Question | Source | Options considered | Choice and rationale |
|---|---|---|---|---|
| MIG-DEC-001 | Target framework | ASKED | Flask, FastAPI | Flask, closest to the servlet model |

## Compatibility

### Findings

| Finding ID | Related IDs | Finding | Evidence | Impact | Mitigation | Status |
|---|---|---|---|---|---|---|
| COMP-001 | LEGACY-001 | Query string decoding differs | Flask docs | Low | Decode with UTF-8 | RESOLVED |

### Experiments

| Experiment ID | Question | Method | Pass criteria | Result | Status |
|---|---|---|---|---|---|
| EXP-001 | What does LEGACY-004 return | Run the servlet with an empty name | A response is recorded | `Hello, ` | PASSED |
