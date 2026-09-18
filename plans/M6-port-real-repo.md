# M6 — Port to real repo

*Prove the seam: point harness at the private nx-Angular target.*

## Goal

Validate [SANDBOX.md](../SANDBOX.md) port story: **point at the real repo + write
its profile** — skills, server, eyes stay put.

## Done when

1. Second project profile `nx-angular-private` (or customer-specific name) exists.
2. Harness runs `run_tests`, `lint`, `run_build`, eyes against real repo checkout.
3. One real (or anonymized) self-healing task completes on real codebase.
4. Fixture remains default for CI/acceptance; real profile documented for local use.

## In scope

### Profile authoring

`harness/src/profiles/nx-angular-private.ts`:

```typescript
{
  name: 'nx-angular-private',
  devServer: { serveProject: '<real-app>', port: 4200, baselinesDir: '...' },
  runTests: () => npx nx run-many -t test --projects=...,
  runBuild: () => ...,
  lint: () => ...,
  // nx affected support optional:
  runAffectedTests: () => npx nx affected -t test,
}
```

Profile config file (no secrets in repo):

`harness/profiles/nx-angular-private.local.json` (gitignored):

```json
{
  "workspaceRoot": "/path/to/private/repo",
  "serveProject": "main-app",
  "testProjects": ["main-app", "shared-lib"]
}
```

Load via `HARNESS_PROFILE=nx-angular-private` + `HARNESS_PROFILE_CONFIG=...`.

### Version alignment

Document matrix in profile README:

| Component | Sandbox | Real target |
|-----------|---------|-------------|
| nx | 23.x | TBD |
| Angular | 22.x | TBD |

Align sandbox when drift causes profile interface mismatch.

### Submodule decision ([SANDBOX.md](../SANDBOX.md))

Implement **optional** fixture submodule:

```
fixtures/nx-angular-sandbox/  → submodule OR in-tree (current)
```

Decision record in SANDBOX.md after spike.

### Baselines for real app

- Store baselines in real repo under `visual-baselines/` OR harness-managed cache
- `baseline:generate` profile-aware

### CI secrets

Real repo CI not in this harness repo — document how `open_pr` + `ci_status` target
real repo workflows.

## Out of scope

- Checking private source into this repo
- Full feature parity of all skills on real code
- Production deployment

## Implementation steps

1. Externalize profile config JSON schema.
2. Create private profile stub with placeholder commands.
3. Spike against real repo (manual, credentials local).
4. Document setup in `harness/README.md` + `plans/M6-port-real-repo.md` checklist.
5. Add one skill proven on real code (likely heal-lint-error or heal-failing-test).
6. Resolve submodule vs in-tree; update SANDBOX.md.

## Acceptance criteria

Manual checklist (cannot run in public CI without private clone):

- [ ] `HARNESS_PROFILE=nx-angular-private run_tests` greens on clean checkout
- [ ] `start_dev_server` + `screenshot_route` for one real route
- [ ] One seeded/fixable failure healed end-to-end

## Files (expected)

```
harness/src/profiles/nx-angular-private.ts
harness/src/profiles/load-profile-config.ts
harness/profiles/nx-angular-private.example.json
harness/README.md                 (setup section)
SANDBOX.md                        (decision update)
```

## Depends on

- M1 — ship loop on real repo PRs
