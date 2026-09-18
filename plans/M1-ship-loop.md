# M1 — Ship loop: `run_build`, `open_pr`, CI status

*Closes the gap between "verified locally" and "merged PR."*

## Goal

Extend the MCP tool surface so the host can build, push, open a PR, and read CI
status — completing the north-star loop described in [MVP.md](../MVP.md) and
[MCP.md](../MCP.md).

## Done when

From an MCP host, against the sandbox:

1. Agent fixes a seeded failure (existing skills).
2. `run_build` → success.
3. `run_tests` + `lint` → success.
4. `open_pr` → branch pushed, PR opened, URL returned.
5. `ci_status` (new) → reports pass/fail for that PR.
6. Human reviews and merges.

Acceptance script: `harness/scripts/acceptance-ship-test.ts` runs steps 1–5 against
a disposable branch (no real merge required).

## In scope

### New MCP tools

| Tool | Behavior |
|------|----------|
| `run_build` | Run nx build for profile default project(s); structured pass/fail + output |
| `open_pr` | Create branch if needed, commit staged changes, push, open PR via forge API |
| `ci_status` | Poll CI for current branch or PR; return structured check results |

`open_pr` parameters (draft):

- `title` (required)
- `body` (optional)
- `draft` (default true)
- `base_branch` (default from profile or `main`)

### Profile extensions

Add to `ProjectProfile` in `harness/src/types.ts`:

```typescript
runBuild: (workspaceRoot: string, project?: string) => Promise<CommandResult>;
buildProjects?: string[];  // default: ['demo']
```

nx-angular mapping: `npx nx run-many -t build --skip-nx-cache` or `nx build demo`.

### Git / forge layer

New module `harness/src/ship/`:

- `git.ts` — branch, stage, commit, push (reuse patterns from `workspace.ts`)
- `pr.ts` — abstract `PullRequestProvider` interface
- `providers/github.ts` — GitHub REST/CLI via `gh` or `@octokit/rest`

Environment:

- `GITHUB_TOKEN` — required for `open_pr` / `ci_status`
- `HARNESS_FORGE` — `github` (default)

### CI integration

`ci_status` reads GitHub Checks API for the PR head SHA. Return:

```json
{
  "state": "pending" | "success" | "failure",
  "checks": [{ "name": "...", "status": "...", "url": "..." }],
  "prUrl": "..."
}
```

Sandbox CI: add `.github/workflows/sandbox-ci.yml` in repo root that runs
`nx run-many -t test,lint,build` on `fixtures/nx-angular-sandbox` when paths change.

## Out of scope

- Auto-merge
- Multiple forges (GitLab) — design interface, implement GitHub only
- Signing commits / GPG
- Container — still local checkout

## Implementation steps

1. Add `run_build` to profile + MCP + `tools.ts`.
2. Add `harness/src/ship/git.ts` for branch/commit/push helpers.
3. Add GitHub PR provider; wire `open_pr` MCP tool.
4. Add sandbox GitHub Actions workflow.
5. Implement `ci_status` polling (with timeout + structured output).
6. Write `acceptance-ship-test.ts`:
   - Reset specimen B bug
   - Run heal-failing-test
   - run_build + run_tests + lint
   - open_pr on temp branch
   - Poll ci_status until success or timeout
   - Leave PR open as draft (or close in test teardown)
7. Update `harness/README.md` with env vars.

## Acceptance test

```
Pass = open_pr returns URL, ci_status eventually success, diff is minimal.
Fail = build fails, push fails, CI never greens, or collateral files in commit.
```

## Risks

| Risk | Mitigation |
|------|------------|
| CI minutes / flake | Keep sandbox workflow minimal; retry in ci_status poll |
| Token scope | Document required scopes: repo, pull_requests |
| Dirty workspace | open_pr should only commit intended paths under workspace |

## Files (expected)

```
harness/src/ship/git.ts
harness/src/ship/pr.ts
harness/src/ship/providers/github.ts
harness/scripts/acceptance-ship-test.ts
.github/workflows/sandbox-ci.yml
harness/src/profiles/nx-angular.ts  (extend)
harness/src/index.ts               (new tools)
```
