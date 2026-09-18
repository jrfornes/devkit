# M7 — Rungs 3–4: wider task types

*From self-healing to small verifiable edits and judgment-heavy feature work.*

## Goal

Climb the top of the autonomy ladder per [ROADMAP.md](../ROADMAP.md):

- **Rung 3:** copy, spacing, a11y, contained refactors — visual diff + interaction
  tests as oracle.
- **Rung 4:** feature work where human taste is the oracle — system makes review fast.

## Done when

### Rung 3

1. ≥3 task templates complete with acceptance on sandbox:
   - Copy tweak (text change, visual diff passes)
   - Spacing/layout (CSS change, visual diff catches regression)
   - a11y fix (missing aria-label — interaction test or axe optional)
2. Agent loop (host-driven): change → visual_diff + interaction → diff, no human
   until review.
3. Review is a "glance" — metrics show low diff pixel ratio + green tests.

### Rung 4

1. Feature template documented: "add filter dropdown to catalog banner."
2. Harness provides **review bundle** MCP tool: `get_review_bundle` → diff + screenshots
   + test summary + CI status in one call.
3. Human-in-the-loop UX remains in MCP host; no Phase 2 UI required yet.

## In scope

### Rung 3 specimens (sandbox)

| Task | Change | Oracle |
|------|--------|--------|
| Copy | "Active Catalog" → "Live Catalog" | visual_diff |
| Spacing | banner padding 2rem → 2.5rem | visual_diff threshold |
| a11y | add `aria-label` on button | run_interaction_test + lint |

Optional: integrate `@axe-core/playwright` as `run_a11y_check` tool (stretch).

### Task prompts as skills

Skills are **procedures**, not just healers:

```
skills/apply-copy-change/SKILL.md
skills/fix-spacing-regression/SKILL.md
```

Each describes: read task → edit files → verify with eyes + tests.

### `get_review_bundle` tool

Aggregates for human review:

```json
{
  "diff": "...",
  "screenshots": [{ "route": "/", "base64": "..." }],
  "tests": { "success": true },
  "lint": { "success": true },
  "visualDiff": { "passed": true },
  "ci": { "state": "success" }
}
```

### Rung 4 feature specimen

Sandbox feature: "Add category filter to catalog banner"

- Not fully automatable — success = human approves review bundle
- Track **human-minutes** via METRICS.md instrumentation

## Out of scope

- Autonomous feature implementation without human
- Multi-page flows / auth
- Production feature flags

## Implementation steps

1. Author Rung 3 specimens + baselines update workflow.
2. Write procedure skills for each task type.
3. Implement `get_review_bundle`.
4. Author one Rung 4 feature brief + review checklist.
5. `acceptance-rung3-test.ts` — automated for copy/spacing.
6. `acceptance-rung4-test.md` — manual script for feature review flow.

## Acceptance (Rung 3 automated)

```
For copy specimen:
  apply change → visual_diff pass → run_tests pass → get_diff minimal
```

## Files (expected)

```
skills/apply-copy-change/
harness/src/tools/review-bundle.ts
harness/scripts/acceptance-rung3-test.ts
plans/rung4-feature-brief.md
fixtures/nx-angular-sandbox/...  (specimens)
```

## Depends on

- M4 — skill library
- M5 — interaction tests
- M1 — CI in review bundle
- METRICS.md — human-minutes tracking for Rung 4 validation
