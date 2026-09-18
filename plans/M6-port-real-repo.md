# M6 — Port to real repo

*Prove the seam: point the harness at a private nx-Angular checkout you already
have. Do **not** copy that app into this repo.*

## Goal

Validate the [SANDBOX.md](../SANDBOX.md) port story: **point at the real repo +
write its profile** — skills, server, and eyes stay in `devkit`.

M6 is a local spike against a second checkout. The only mergeable work in
*this* repo is the root split and an example profile. The three acceptance
boxes cannot run in public CI without the private clone.

## Current truth (what was stale)

- **M3 and M4 are on `main`.** Rung 1 breadth and skill discovery are done.
- **M5 (interaction tests) is not on `main`.** It is also **not a dependency**
  of M6. M6 only needed the M1 ship loop, which is done.
- **`HARNESS_REPO_ROOT` used to be overloaded.** Skills lived under the harness
  repo, but `status` / `get_diff` / `open_pr` git'd against that same path and
  assumed the workspace was inside it. Setting only `HARNESS_WORKSPACE=/path/to/private/repo`
  made ship and skills fight each other.
- **Sandbox stays the default profile** so CI and acceptance stay green.
- **Keep `fixtures/nx-angular-sandbox` in-tree.** Extracting it as a submodule
  now is extra friction. The profile config is the seam; a submodule does not
  prove anything M6 doesn't already prove.
- Skip full skill parity, M7, and M8 until the checklist below is actually
  checked on the real app.

## Done when

1. Harness root and target repo are separate config values.
2. `nx-angular-private` loads a gitignored JSON profile (example committed,
   `.local.json` not committed).
3. Harness runs `run_tests`, `lint`, `run_build`, and eyes against a real
   checkout on your machine.
4. One real (or seeded) self-healing task completes on that checkout.
5. Fixture remains default for CI/acceptance; real profile documented for local use.
6. Submodule decision recorded: keep the fixture in-tree.

## In scope

### 1. Split roots (this repo — merge without private code)

| Root | Env | Purpose |
|------|-----|---------|
| Harness | `HARNESS_REPO_ROOT` | This repo (`skills/`, MCP server, profiles) |
| Target | `HARNESS_WORKSPACE` / profile `workspaceRoot` | Private checkout: git, tests, lint, build, PRs |

Git tools use `gitRoot` = `git rev-parse --show-toplevel` from the workspace
(override with `HARNESS_GIT_ROOT`). For the in-tree sandbox that is still this
repo; for a private clone it is that clone.

### 2. Profile config (no secrets, no private source)

Committed template: `harness/profiles/nx-angular-private.example.json`

```json
{
  "workspaceRoot": "/path/to/private/repo",
  "serveProject": "<nx app name>",
  "testProjects": ["<app>", "<libs>"],
  "buildProjects": ["<app>"],
  "port": 4200,
  "baselinesDir": "visual-baselines"
}
```

On your machine: copy to `harness/profiles/nx-angular-private.local.json`
(gitignored). Load via `HARNESS_PROFILE=nx-angular-private` +
`HARNESS_PROFILE_CONFIG=...`.

Do not commit a filled `.local.json`.

### 3. Version alignment (local notes, not a blocker)

Record this matrix while spiking. Only align the sandbox if commands actually
diverge.

| Component | Sandbox | Real target |
|-----------|---------|-------------|
| nx | 23.2.1 | TBD (your checkout) |
| Angular | ~22.1.0 | TBD (your checkout) |

### 4. Baselines for the real app

Store baselines **in the private repo** under `visual-baselines/` (or the
`baselinesDir` in the profile). `npm run baseline:generate` is profile-aware:
sandbox still corrects the catalog-banner specimen; private captures the
current route as-is.

### 5. CI / forge tokens

Real-repo CI is not in this harness repo. `open_pr` and `ci_status` must use a
token for the **private** GitHub repo, not `jrfornes/devkit`. `gh` runs with
cwd = target `gitRoot`. Optional override: `HARNESS_GITHUB_REPO=owner/name`.

## Out of scope

- Checking private source into this repo
- Full feature parity of all skills on real code (existing skills are
  sandbox-specimen-specific)
- Extracting the fixture as a submodule
- Production deployment
- M5 / M7 / M8

## Implementation order

Do it in this order. Step 1 is the PR in `devkit`. Steps 2–3 are on your
machine against the private checkout. Step 4 is already decided.

### Step 1 — Fix the seam in this repo (no private code)

- [x] Split harness root vs target git root
- [x] Commit `harness/profiles/nx-angular-private.example.json`, not a `.local.json`
- [x] Keep `nx-angular` (sandbox) as the default profile
- [x] Document setup in `harness/README.md`
- [x] Record the in-tree fixture decision in `SANDBOX.md`
- [x] `npm run test:config` proves skills stay in harness while git follows a
      throwaway target repo

### Step 2 — On your machine, fill the real names

1. Clone the private repo next to `devkit` (or anywhere). Do not vendor it here.
2. `npm install` in that checkout.
3. `npx nx show projects` — pick `serveProject`, `testProjects`, `buildProjects`.
4. Copy the example JSON to `harness/profiles/nx-angular-private.local.json` and
   fill those names plus the **real** absolute `workspaceRoot` (not
   `/absolute/path/to/private/repo`). Confirm `ls "$workspaceRoot/nx.json"`.
5. Record nx / Angular versions vs the sandbox table above. Only change the
   sandbox if `nx serve` / `test` / `lint` / `build` flags actually differ.
6. Point Cursor MCP env at the split. GUI apps often cannot find `git`:

   ```json
   {
     "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
     "HARNESS_REPO_ROOT": "/absolute/path/to/devkit",
     "HARNESS_PROFILE": "nx-angular-private",
     "HARNESS_PROFILE_CONFIG": "/absolute/path/to/devkit/harness/profiles/nx-angular-private.local.json",
     "GITHUB_TOKEN": "<token for the private GitHub repo>"
   }
   ```

7. In `harness/`, `npm install` (no `dist/` step). Point Cursor MCP `command`
   at `harness/run-mcp.mjs`. Confirm with `npm run print-config`: `repoRoot` is
   `devkit`, `workspaceRoot` / `gitRoot` are the private checkout, `skillsDir`
   is still `devkit/skills`.

### Step 3 — Spike the three acceptance boxes, in order

1. **Oracles.** `run_tests` / `lint` / `run_build` green on a clean private
   checkout. If a command flag diverges, change the private profile (or the
   shared nx factory) — don't copy app code.
2. **Eyes.** `start_dev_server` + `screenshot_route` on one real route. Generate
   a baseline **in the private repo** (`visual-baselines/` or profile
   `baselinesDir`).
3. **One heal.** Start with a small failing spec or a lint error you seed
   yourself. Do **not** expect `heal-lint-error` / `heal-failing-test` to work
   unmodified — those skills hardcode sandbox specimen paths. Drive the loop
   with `lint` / `run_tests` + file edits (or a one-off local skill). Then
   `open_pr` / `ci_status` against the private GitHub repo.

### Step 4 — Submodule decision

Keep the fixture in-tree. Decision recorded in [SANDBOX.md](../SANDBOX.md).

## Acceptance criteria

Manual checklist (cannot run in public CI without the private clone):

- [ ] `HARNESS_PROFILE=nx-angular-private` `run_tests` greens on a clean checkout
- [ ] `lint` and `run_build` green on the same checkout
- [ ] `start_dev_server` + `screenshot_route` for one real route
- [ ] Baseline written in the **private** repo, not in `devkit`
- [ ] One seeded/fixable failure healed end-to-end
- [ ] `open_pr` / `ci_status` target the private GitHub repo, not `jrfornes/devkit`

Public CI (this repo) must stay green on the sandbox default:

- [x] `npm run test:config`
- [ ] Existing sandbox acceptance still passes on `nx-angular`

## Files

```
harness/src/config.ts
harness/src/workspace.ts
harness/src/types.ts
harness/src/profiles/nx-angular.ts
harness/src/profiles/nx-angular-private.ts
harness/src/profiles/load-profile-config.ts
harness/profiles/nx-angular-private.example.json
harness/profiles/README.md
harness/scripts/config-split-test.ts
harness/scripts/print-config.ts
harness/README.md
SANDBOX.md
plans/M6-port-real-repo.md
```

## Depends on

- M1 — ship loop (done). M3/M4 are useful context, not blockers. M5 is not
  required.
