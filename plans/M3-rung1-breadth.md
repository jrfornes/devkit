# M3 — Rung 1 breadth: self-healing task coverage

*Expand verifiable, bounded tasks beyond two hand-tuned specimens.*

## Goal

Make Rung 1 real: multiple failure classes healable through the MCP loop with
high merge rate, not just two pattern-matched skills.

Reference: [ROADMAP.md](../ROADMAP.md) Rung 1, [MVP.md](../MVP.md) specimens A/C.

## Done when

1. **≥4 distinct specimens** each with a skill (or generic heal path) and acceptance coverage.
2. MVP open question resolved: loop passes unattended on **≥2 test-oracle specimens**
   (B + C minimum).
3. New skills: lint-fix, fix-build, bump-dependency (at least lint-fix + one other).
4. Specimen A (wiring smoke) exists as a quick regression check.

## In scope

### New sandbox specimens

| ID | Type | Location | Bug |
|----|------|----------|-----|
| A | Wiring | `libs/shared-data/src/lib/calculate-total.ts` | Off-by-one constant |
| C | Regression trap | extend `item-filter` or new `sort-items.ts` | Naive fix breaks 2nd spec |
| D | Lint | intentional eslint violation | unused import / any rule |
| E | Build | break tsconfig path or template error | build fails, tests may pass |

Each specimen gets:

- Seeded bug on a dedicated branch or reset script
- Documented in `fixtures/nx-angular-sandbox/specimens/README.md`

### New skills

| Skill | Trigger | Fix strategy |
|-------|---------|--------------|
| `heal-lint-error` | lint failure output | Parse file:line, apply common fixes |
| `heal-build-error` | run_build failure | Parse Angular/nx build output |
| `bump-dependency` | outdated dep task ( scripted ) | npm install + lockfile update |
| `heal-failing-test` | (existing) | Generalize beyond filterActiveItems |

Skills remain in `skills/<name>/SKILL.md` + `harness/src/skills/<name>.ts` until M4
adds dynamic loading.

### Generalize heal-failing-test

Current implementation pattern-matches `filterActiveItems`. Evolve to:

1. Parse jest failure output for file + test name
2. Read spec + implementation
3. Apply fix heuristics OR delegate to host (skill returns diagnosis + suggested edit range)

For M3 minimum: support specimens A, B, C with explicit handlers behind one skill
entry point (router pattern inside skill).

### Profile

Add `run_build` if M1 not done yet (hard dependency for specimen E).

### Acceptance

`harness/scripts/acceptance-rung1-test.ts`:

- For each specimen: reset → fail oracle → run_skill → pass oracle → minimal diff
- Run in sequence; total pass = all specimens pass

## Out of scope

- LLM inside skill (host still reasons for novel failures)
- Flaky test healing (defer — needs rerun statistics)
- Automatic skill authoring

## Implementation steps

1. Author specimen A + C in sandbox with tests.
2. Implement `heal-lint-error`, `heal-build-error`.
3. Refactor `heal-failing-test` router for A/B/C.
4. Add `bump-dependency` with one scripted dep bump scenario.
5. Registry + SKILL.md for each.
6. `specimens/reset.ts` CLI to seed a named specimen.
7. `acceptance-rung1-test.ts`.

## Done criteria detail

From MVP.md lean: **≥2 distinct test-oracle specimens pass unattended** — deliver
B + C at minimum. Visual specimen already covered in eyes acceptance.

## Files (expected)

```
fixtures/nx-angular-sandbox/specimens/README.md
fixtures/nx-angular-sandbox/libs/shared-data/src/lib/calculate-total.ts
harness/src/skills/heal-lint-error.ts
harness/src/skills/heal-build-error.ts
harness/src/skills/heal-failing-test.ts  (router)
harness/src/skills/bump-dependency.ts
skills/*/SKILL.md
harness/scripts/acceptance-rung1-test.ts
harness/scripts/reset-specimen.ts
```

## Depends on

- M1 for build/lint specimens that need `run_build` in loop
- Can start A + lint specimens before M1
