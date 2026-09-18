# heal-build-error

Fix build failures in the target workspace.

## When to use

- `run_build` fails while unit tests may still pass
- Angular template or TypeScript compile errors with clear file locations

## What it does

1. Runs the profile build command
2. Parses build output for the failing file
3. Applies a minimal fix (template property, import path, etc.)
4. Re-runs build to confirm success

## Pass criteria

- Build exits successfully
- Only the intended source files change

## Notes

Sandbox specimen **E** breaks `catalog-banner.html` with a non-existent template binding.
