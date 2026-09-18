# Metrics

*What to measure instead of PR count.*

Reference: [README.md](./README.md#north-star).

## North star metric

> **Human-minutes per merged PR → 0**

A merged PR that required 20 minutes of human review is worse than one that
required 2 — even if both merged. Raw PR count is a lagging indicator and
gameable.

## Primary metrics

| Metric | Definition | Why |
|--------|------------|-----|
| **Human-minutes per merged PR** | Wall time a human spends from PR open to merge (review, rework, CI babysitting) | North star |
| **Merge rate** | merged PRs / opened PRs (rolling 30d) | Quality gate — low merge rate = noise |
| **Autonomous loop closure rate** | Tasks where agent reaches green oracle + opens PR without human mid-loop / total tasks | Substrate health |
| **Skill hit rate** | Failures resolved by known skill / total failures | Skill library leverage |
| **CI first-pass rate** | PRs green on first CI run / total PRs | Fix quality before human sees it |

## Secondary metrics

| Metric | Definition | Why |
|--------|------------|-----|
| **Task mix by rung** | % tasks at Rungs 1–4 | Shows autonomy frontier moving up |
| **Visual diff catch rate** | UI regressions caught by eyes before PR / total UI regressions | Validates central bet |
| **Mean tool calls per task** | MCP tool invocations to complete task | Loop efficiency |
| **Workspace idle cost** | Container-hours × branch | Infra cost (post-M2) |

## Instrumentation plan

### Phase 1 — prove-once (MVP lean)

No persistent dashboard. Acceptance scripts log:

- specimen id
- pass/fail
- duration ms per tool phase

Store in `harness/artifacts/acceptance-<run-id>.json` for manual inspection.

### Phase 2 — M1+ instrumentation

On each MCP tool call, append to run log:

```json
{
  "runId": "uuid",
  "tool": "run_tests",
  "startedAt": "...",
  "durationMs": 1234,
  "success": true,
  "branch": "cursor/fix-5645"
}
```

On `open_pr`:

```json
{
  "event": "pr_opened",
  "prUrl": "...",
  "autonomous": true,
  "skillsUsed": ["heal-failing-test"]
}
```

On human merge (webhook or manual tag):

```json
{
  "event": "pr_merged",
  "humanMinutes": 3.5
}
```

Implementation: `harness/src/metrics/logger.ts` → JSON lines file or sqlite.

### Phase 3 — M8 dashboard

Aggregate sqlite → UI widgets. Alert if merge rate drops or human-minutes spike.

## Human-minutes measurement

**Include:**

- Code review reading diff + screenshots
- Requesting changes and re-review
- Waiting on CI while actively watching
- Fixing what the agent couldn't

**Exclude:**

- CI running unattended while human is away
- Time before agent opens PR (autonomous loop)

Capture via:

1. UI "Start review" / "Approve" buttons (Phase 2)
2. GitHub PR review timestamps (approximate)
3. Self-report tag on merge (fallback)

## Task mix tracking

Tag each run with intended rung:

| Rung | Tag examples |
|------|--------------|
| 1 | `heal-test`, `heal-lint`, `bump-dep` |
| 2 | skill-served repeat failure |
| 3 | `copy-change`, `spacing`, `a11y` |
| 4 | `feature`, `judgment` |

Orchestrator or host sets `rung` at task start.

## Targets (initial)

Not calendar deadlines — thresholds that indicate readiness to widen scope:

| Milestone | Merge rate | Autonomous closure | Human-minutes (Rung 1) |
|-----------|------------|--------------------|-------------------------|
| M1 ship loop | ≥80% on sandbox PRs | ≥1 specimen end-to-end | ≤5 min (human review only) |
| M3 Rung 1 breadth | ≥85% | ≥4 specimens | ≤3 min |
| M7 Rung 3 | ≥75% | visual tasks pass eyes | ≤5 min (glance review) |
| M7 Rung 4 | N/A | N/A | ≤15 min (feature review) |

## Anti-patterns

- **Optimizing PR count** — opens noise PRs, burns reviewers
- **Spot-greening one test** — track whole-suite oracle pass rate instead
- **Ignoring unmerged PRs** — count opened-but-abandoned as failures

## Related docs

- [plans/M1-ship-loop.md](./plans/M1-ship-loop.md) — CI + PR events
- [plans/M8-agentic-ui.md](./plans/M8-agentic-ui.md) — metrics dashboard
- [ROADMAP.md](./ROADMAP.md) — task mix frontier
