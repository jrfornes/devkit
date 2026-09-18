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

This MVP skill handles the sandbox's `filterActiveItems` specimen: items without an
explicit `active: false` must be treated as active. The common bug is filtering with
`active === true` instead of `active !== false`.
