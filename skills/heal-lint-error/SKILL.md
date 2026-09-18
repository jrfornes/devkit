# heal-lint-error

Fix lint failures in the target workspace.

## When to use

- `lint` reports errors (unused imports, simple rule violations)
- Tests may still pass; lint is the oracle

## What it does

1. Runs the profile lint command
2. Parses output for file and line hints
3. Applies common fixes (e.g. remove unused imports)
4. Re-runs lint to confirm clean

## Pass criteria

- Lint exits successfully
- Only the intended source files change

## Notes

Sandbox specimen **D** seeds an unused import in `lint-specimen.ts`.
