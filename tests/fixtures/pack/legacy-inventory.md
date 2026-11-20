# Legacy Inventory

## Migration Readiness

READINESS: BLOCKED

| Material | Status | Evidence | Blocking |
|---|---|---|---|
| Source code complete | PRESENT | `src/` | NO |
| Database schema (DDL) | MISSING | `src/UserDao.java:findUser` reads table `users` | YES |

| Gap ID | Missing material | Why it is needed (evidence) | Impact if unresolved | Ways to unblock |
|---|---|---|---|---|
| GAP-001 | Database schema (DDL) | `src/UserDao.java:findUser` reads table `users` | The target schema cannot be created | Provide the DDL, or rebuild it from the DAO SQL |

## Coverage

- Revision: fixture
- Scanned paths: `src/`
- Excluded or inaccessible paths: none

## System Summary

A Java Servlet application with one greeting page and one admin page.

## Inventory

| ID | Area | Component or concern | Evidence | Notes |
|---|---|---|---|---|
| INV-001 | Web | Greeting servlet | `src/HelloServlet.java:doGet` | |
| INV-002 | Persistence | User DAO | `src/UserDao.java:findUser` | String-concatenated SQL |

## Dependencies

| Dependency | Version | Evidence | Risk |
|---|---|---|---|
| Servlet API | 3.1 | `WEB-INF/web.xml` | Low |
