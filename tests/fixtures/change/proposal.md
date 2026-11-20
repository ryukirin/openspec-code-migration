# Migration Proposal

## Planning Pack

- Planning-pack path: `migration-plans/hello/`

## Purpose

Move the greeting page from Java Servlets to Flask.

## Scope

The greeting page only. The admin page is removed (LEGACY-003).

## Target Stack and Constraints

Python 3.12 and Flask 3.1 (MIG-DEC-001).

## Capabilities

| Capability | Spec path | Legacy IDs |
|---|---|---|
| greeting | `specs/greeting/spec.md` | LEGACY-001, LEGACY-002, LEGACY-004 |

## Major Decisions and Accepted Risks

GAP-001 is handled by rebuilding the schema from the DAO SQL.
