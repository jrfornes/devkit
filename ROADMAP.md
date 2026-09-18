# Roadmap

There are **two independent axes** here, and it's worth keeping them separate:

1. **What drives the loop** (the shell) — a human via an MCP host *now*, our own
   agentic UI *later*.
2. **What's safe to automate** (the autonomy ladder) — from tasks with a cheap
   oracle to tasks that need human taste.

We move along axis 1 first (borrow the shell) so we can spend our real effort
climbing axis 2 (the substrate). The ladder below is axis 2; the phases are
axis 1.

---

## Phase 1 — MCP-first (do this now)

Expose the environment as an [MCP tool surface](./MCP.md) and drive it from an
existing host (Claude Desktop, Cursor). The host is the chat, dashboard,
orchestrator, and human-in-the-loop for free. A person runs the verification loop
by hand — which is also how we learn what the autonomous version should do.

The tool verbs are the same API the future orchestrator will call, so none of
this is throwaway. **Everything on the autonomy ladder below happens over this
surface**, human-driven, before any agentic UI exists.
**Done when:** Rungs 0–2 are working end-to-end through an MCP host.

## Phase 2 — Agentic UI (deferred)

Build our own shell behind the *same* tool surface, automating the loop arrows
that don't need judgment. This is the presentation + autonomous-orchestration
layer we deliberately put last.
**Done when:** the arrows a human doesn't need to sit on run without one.

---

## The autonomy ladder

Climb from tasks with a cheap, unambiguous oracle to tasks that need human
taste. Don't skip rungs: each one proves the loop before you widen it. In
Phase 1 a human (via the host) drives every rung; Phase 2 automates the ones
that don't need judgment.

## Rung 0 — Stand up the eyes (over MCP)
Local workspace with dev server + headless browser + screenshot/visual-diff, and an
agent runtime that can render a change and inspect it — all pointed at the
[nx-angular-sandbox fixture](./SANDBOX.md) and reachable as MCP tools
(`start_dev_server`, `screenshot_route`, `visual_diff`) that return images to the
host. Nothing autonomous yet; this is the prerequisite for everything above.
**Done when:** from an MCP host, you can open a route, act on it, and get a
visual diff back as an image.

## Rung 1 — Self-healing (verifiable, bounded)
Failing test, broken build, lint error, dependency bump, flaky spec. Success
signal is CI green — cheap and unambiguous. Safe to run hot.
**Done when:** these PRs merge with near-zero human minutes and a high merge rate.

## Rung 2 — Codify the walls into skills
Every recurring failure from Rung 1 becomes a skill so it never recurs. The
skill library is the real deliverable here; PR volume is the side effect.
**Done when:** new instances of known failures are handled without a human ever seeing them.

## Rung 3 — Small verifiable changes
Copy tweaks, spacing, a11y fixes, prop renames, contained refactors — changes
where visual diff + interaction tests give a strong signal even without a hard
CI oracle.
**Done when:** the eyes catch regressions reliably enough that review is a glance, not an audit.

## Rung 4 — Feature work (judgment, needs a human)
"Build this." Success is a matter of taste; the only oracle is a person. The
system's job here is to make the human's minutes count — good diffs, good
screenshots, easy takeover — not to pretend it's autonomous.
**Done when:** the human-in-the-loop step is fast and pleasant, not a bottleneck.

---

The frontier between "run hot" and "human in the loop" isn't fixed — it moves up
as the eyes and the skill library get better. Watch **task mix** in
[METRICS.md](./METRICS.md) to see it move.
