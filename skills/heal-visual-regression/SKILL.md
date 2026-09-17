# heal-visual-regression

Fix a visual regression detected by `visual_diff`.

## When to use

- `visual_diff` reports `passed: false` for a route
- The regression is in component styling, not layout logic
- A baseline image exists under `visual-baselines/`

## What it does

1. Runs `visual_diff` for the affected route
2. Locates the seeded CSS regression in the catalog banner
3. Restores the expected banner background color
4. Re-runs `visual_diff` to confirm the screenshot matches baseline

## Pass criteria

- `visual_diff` returns `passed: true`
- Only the intended stylesheet changes
- Unit tests and lint remain green

## Notes

This MVP skill handles the sandbox catalog banner specimen: the banner background
should be green (`#2ecc71`), not red (`#e74c3c`).
