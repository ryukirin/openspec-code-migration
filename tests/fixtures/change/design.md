# Target Design

## Context and Constraints

See the planning pack in `migration-plans/hello/`.

## Migration Batches

| Batch ID | Scope | Requirement IDs | Depends on | Exit criteria | Rollback |
|---|---|---|---|---|---|
| BATCH-001 | Greeting route | REQ-GREETING-001, REQ-GREETING-002 | none | TEST-001 and TEST-002 pass | Revert the batch commit |

## Design Decisions

### DEC-001: Render the greeting with Jinja autoescaping

- Related IDs: REQ-GREETING-002, LEGACY-002
- Decision: Use a Jinja template so output is escaped by default.
- Rationale: Escaping by default prevents reflected XSS.
- Alternatives considered: Manual escaping.
- Consequences: None.
- Verification: TEST-002
