---
name: heal-failing-test
description: Fix a non-visual test failure in the target workspace
triggers:
  - test failure
  - failing spec
  - jest failure
oracle:
  - run_tests
---

# heal-failing-test

Fix a non-visual test failure in the target workspace.

## When to use

- `run_tests` reports one or more failing specs
- The failure is a logic or wiring bug, not a visual regression
- You want an automated first pass before manual edits

## What it does

1. Runs the full test suite for the workspace profile
2. Parses the failure output for the failing spec and source file
3. Applies a minimal fix to the implementation under test
4. Re-runs the full suite to confirm green

## Pass criteria

- Full relevant test suite is green after the skill completes
- Only the intended source files change
- `lint` remains clean

## Notes

Routes to specimen-specific handlers in the sandbox:

| Specimen | Function | Fix |
|----------|----------|-----|
| **A** | `calculateTotal` | Remove off-by-one `+ 1` |
| **B** | `filterActiveItems` | Use `active !== false` instead of `active === true` |
| **C** | `sortByPriority` | Add id tie-break: `|| a.id.localeCompare(b.id)` |

Specimen **C** is a regression trap: a naive name-only sort greens one spec but
breaks the priority ordering spec. The skill applies the full-suite fix.
