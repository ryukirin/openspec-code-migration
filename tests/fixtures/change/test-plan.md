# Test Plan

## Test Strategy

Flask test client checks for each requirement.

## Traceability

| Test ID | Rule/legacy/requirement IDs | Test level | Oracle | Fixture/data | Command | Pass criteria | Execution stage / CI suitability | Evidence location |
|---|---|---|---|---|---|---|---|---|
| TEST-001 | REQ-GREETING-001, LEGACY-001, LEGACY-004 | Integration | Legacy baseline | none | `pytest tests/test_hello.py -k greeting` | Bodies match | CI | CI log |
| TEST-002 | REQ-GREETING-002, LEGACY-002 | Integration | Escaped markup | none | `pytest tests/test_hello.py -k escape` | Markup is escaped | CI | CI log |
