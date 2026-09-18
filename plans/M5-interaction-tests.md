# M5 — Interaction tests

*Complete the eyes layer: act on the UI, not just look at it.*

## Goal

Close the gap in [ARCHITECTURE.md](../ARCHITECTURE.md) verification loop —
"screenshot · visual diff · **interaction test**" — and satisfy Rung 0 done-when:
**open a route, act on it, and get a visual diff back.**

## Done when

1. New MCP tools let the host drive Playwright interactions and assert outcomes.
2. Sandbox has ≥1 interaction spec (button click → DOM/state change → screenshot).
3. `run_interaction_test` returns pass/fail + optional screenshot on failure.
4. Eyes acceptance extended: interaction test fails on seeded bug, passes after fix.

## In scope

### New MCP tools

| Tool | Parameters | Returns |
|------|------------|---------|
| `interact` | route, actions[] | Final screenshot + action log |
| `run_interaction_test` | spec name (e.g. `catalog-banner`) | pass/fail + failure screenshot |

Action schema (JSON):

```typescript
type BrowserAction =
  | { type: 'click'; selector: string }
  | { type: 'fill'; selector: string; value: string }
  | { type: 'wait'; ms: number }
  | { type: 'waitForSelector'; selector: string }
  | { type: 'screenshot' };
```

`interact` is the low-level composable verb; `run_interaction_test` runs a
predefined script from `fixtures/.../interaction-tests/<name>.ts`.

### Sandbox interaction specimen

Extend catalog banner:

- Add "Refresh count" button that increments displayed count
- Seeded bug: click handler not wired (or updates wrong field)
- Interaction test: click button → expect "4 items available"

Files:

```
fixtures/nx-angular-sandbox/interaction-tests/catalog-banner.ts
fixtures/nx-angular-sandbox/apps/demo/src/app/catalog-banner/  (add button)
```

### Implementation

`harness/src/eyes/interaction.ts`:

- Reuse browser session from `screenshot.ts`
- Execute action list with Playwright page
- Return structured log + images on failure

`harness/src/eyes/interaction-tests/` loader — reads test definitions from workspace
profile path.

### Skill (optional in M5)

`heal-interaction-test` — parallel to heal-visual-regression; can defer to M3-style
breadth if interaction specimen is simple (wire click handler).

## Out of scope

- Full Playwright Test runner integration inside nx (keep harness-side scripts)
- Visual diff per interaction step (only final state or on failure)
- Mobile viewports (single desktop viewport first)

## Implementation steps

1. Add button + handler to catalog banner (with seeded bug branch).
2. Implement action executor in `interaction.ts`.
3. Author `catalog-banner` interaction test definition.
4. MCP tools `interact`, `run_interaction_test`.
5. Extend `acceptance-eyes-test.ts` or new `acceptance-interaction-test.ts`.
6. Document in harness README.

## Acceptance test

```
1. start_dev_server
2. run_interaction_test catalog-banner → fail
3. fix handler (skill or manual in test script)
4. run_interaction_test → pass
5. visual_diff still passes
6. stop_dev_server
```

## Files (expected)

```
harness/src/eyes/interaction.ts
harness/src/eyes/interaction-loader.ts
fixtures/nx-angular-sandbox/interaction-tests/catalog-banner.ts
harness/scripts/acceptance-interaction-test.ts
```

## Depends on

- Eyes milestone (built)
