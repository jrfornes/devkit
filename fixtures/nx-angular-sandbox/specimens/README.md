# Sandbox failure specimens (Rung 1)

Each specimen seeds a known, bounded failure for harness acceptance tests. Reset
with:

```bash
npm run reset-specimen -- <id>   # from fixtures/nx-angular-sandbox
# or
tsx harness/scripts/reset-specimen.ts <id>   # from repo root
```

Restore the good state with `reset-specimen.ts good` (or omit id).

| ID | Skill | Location | Bug | Oracle |
|----|-------|----------|-----|--------|
| **A** | `heal-failing-test` | `libs/shared-data/src/lib/calculate-total.ts` | Off-by-one `+ 1` in total | `run_tests` |
| **B** | `heal-failing-test` | `libs/shared-data/src/lib/item-filter.ts` | `active === true` omits implicit-active items | `run_tests` |
| **C** | `heal-failing-test` | `libs/shared-data/src/lib/sort-items.ts` | Missing tie-break sort; naive name-only fix fails priority spec | `run_tests` |
| **D** | `heal-lint-error` | `libs/shared-data/src/lib/lint-specimen.ts` | Unused import | `lint` |
| **E** | `heal-build-error` | `apps/demo/src/app/catalog-banner/catalog-banner.html` | Reference to non-existent `brokenBannerTitle()` | `run_build` |
| **dep** | `bump-dependency` | `package.json` | `rxjs` pinned to unsupported `7.5.0` | `run_tests` (`dep-version.spec`) |

Visual regression (eyes milestone) uses CSS in `catalog-banner.css` — not listed here.
