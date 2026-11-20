# Legacy Baseline

## Behaviour

| Legacy ID | Behaviour | Evidence | Observed how |
|---|---|---|---|
| LEGACY-001 | `GET /hello?name=<name>` returns `Hello, <name>` | `src/HelloServlet.java:doGet` | STATIC |
| LEGACY-003 | `GET /admin` lists all users | `src/AdminServlet.java:doGet` | STATIC |

## Suspected Defects and Security Issues

| Legacy ID | Behaviour | Evidence | Why it looks wrong |
|---|---|---|---|
| LEGACY-002 | The name is written to the page without HTML escaping | `src/HelloServlet.java:doGet` | Reflected XSS |

## Unknown Behaviour

| Legacy ID | What is unknown | Why it matters | How it could be resolved |
|---|---|---|---|
| LEGACY-004 | Response when `name` is empty | Clients may rely on it | Run the legacy servlet with an empty name |
