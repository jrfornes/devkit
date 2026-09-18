---
name: heal-interaction-test
description: Fix a failing interaction test detected by run_interaction_test
triggers:
  - interaction test failure
  - click handler not wired
  - UI behavior regression
oracle:
  - run_interaction_test
---

# heal-interaction-test

Fix a failing interaction test detected by `run_interaction_test`.

## When to use

- `run_interaction_test` reports `passed: false`
- The failure is in UI behavior (click handler, state update), not styling
- An interaction spec exists under `interaction-tests/`

## What it does

1. Runs `run_interaction_test` for the affected spec
2. Locates the seeded interaction bug in the catalog banner
3. Wires the refresh button click handler
4. Re-runs `run_interaction_test` to confirm the assertion passes

## Pass criteria

- `run_interaction_test` returns `passed: true`
- Only the intended template changes
- Unit tests and lint remain green

## Notes

This MVP skill handles the sandbox catalog banner specimen: clicking "Refresh count"
should increment the displayed count from 3 to 4 items available.
