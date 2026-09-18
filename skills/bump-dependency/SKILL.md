---
name: bump-dependency
description: Update an outdated dependency to a supported version
triggers:
  - dependency version failure
  - outdated package
  - npm version mismatch
oracle:
  - run_tests
---

# bump-dependency

Update an outdated dependency to a supported version.

## When to use

- A dependency version check fails (specimen `dep-version.spec.ts`)
- Package manifest pins a package below the supported range

## What it does

1. Reads `package.json` for the outdated dependency
2. Bumps to the supported version range
3. Runs `npm install` to refresh the lockfile
4. Re-runs tests to confirm the version oracle passes

## Pass criteria

- Dependency version test passes
- `package.json` and lockfile updated as expected

## Notes

Sandbox specimen **dep** pins `rxjs` to `7.5.0`; supported range is `~7.8.0`.
