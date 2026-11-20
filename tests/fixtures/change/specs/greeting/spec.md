# Spec Delta

## Purpose

Greets a visitor by name over HTTP after the move from Java Servlets to Flask.

## ADDED Requirements

### Requirement: REQ-GREETING-001 — Greeting by name

The system SHALL return `Hello, <name>` for `GET /hello?name=<name>`, including an empty name.

Traceability: `LEGACY-001`, `LEGACY-004`, `MIG-RULE-001`; disposition: `PRESERVE`.

#### Scenario: Name given

- **WHEN** a client requests `GET /hello?name=Ann`
- **THEN** the response body is `Hello, Ann`

#### Scenario: Empty name

- **WHEN** a client requests `GET /hello?name=`
- **THEN** the response body is `Hello, `

### Requirement: REQ-GREETING-002 — Escaped name

The system MUST HTML-escape the name in the response.

Traceability: `LEGACY-002`; disposition: `SECURITY_FIX_REQUIRED`.

#### Scenario: Markup in the name

- **WHEN** a client requests `GET /hello?name=<b>Ann</b>`
- **THEN** the response body contains `&lt;b&gt;Ann&lt;/b&gt;`
