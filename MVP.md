# MVP — Phase 1, Rungs 0–1

*Status: DRAFT. The open questions at the bottom drive the final scope; leans are
marked (⟵ lean) but not decided.*

The MVP is the smallest thing that proves the loop end-to-end over an MCP host,
against the [sandbox fixture](./SANDBOX.md), with a human driving. Not the
agentic UI. Not feature work. One loop, closed, for real.

## The one thing it proves

*(anchor — confirm or rewrite this sentence; everything else serves it)*

> From an MCP host (Claude Desktop / Cursor), I hand the sandbox a known failure.
> The host calls the tool surface, runs a skill to fix it, verifies the fix with
> the CI-oracle tools, and opens a PR — with me only reviewing and merging.

## In scope

- **MCP server** exposing a minimal verb set (subset of [MCP.md](./MCP.md))
- **One project profile:** nx-angular, bound to the sandbox fixture, run against a
  **local checkout**
- **The oracle:** `run_tests` + `lint`, run locally — *this local pass/fail is the
  loop's check;* there is no CI in the MVP
- **One self-healing skill:** `heal-failing-test` (non-visual failure)
- **Read state:** `get_diff`, `status`
- **Ends at the diff:** `get_diff` is the deliverable; a human eyeballs it and
  opens any PR by hand

## Explicitly out of scope (deferred, not forgotten)

- **The eyes** (dev server + Playwright + `visual_diff`) — deferred, but this is
  the **immediate next milestone**, not "someday." An eyes-out MVP proves the loop
  where the check is *free*, so it dodges the project's actual bet (UI). The next
  build after MVP has to heal a *visual* regression — otherwise we've never tested
  the thesis.
- **`open_pr` / CI** — MVP stops at the diff
- Agentic UI — Phase 2
- Autonomous orchestration — the human drives the loop via the host
- Feature / judgment work — Rungs 3–4
- Skill breadth beyond `heal-failing-test` (lint-fix, dep-bump) unless nearly free
- Metrics instrumentation (OPEN Q2 below)

## Acceptance test

A concrete walkthrough that either passes or doesn't:

1. Sandbox sits at a known-good commit; a seeded failure is introduced (one spec
   now fails — see specimens below).
2. From the MCP host, point the harness at the local sandbox checkout.
3. Host calls `status` / `get_diff` to orient, then `run_tests` → sees the failure.
4. Host invokes `run_skill heal-failing-test`.
5. Skill edits source; `run_tests` → green **and** `lint` → clean.
6. `get_diff` shows a minimal, on-target diff (only the intended fix, no
   collateral).

**Pass =** steps 3–6 happen with no human input between "point it at the sandbox"
and "read the diff," and the diff is correct.

**The oracle is the whole suite, not the one named test.** The skill must re-run
the full relevant suite — a fix that greens the target spec while breaking another
is a fail. That's what keeps it a *loop* and not a spot-patch.

## Candidate failure specimens (pick one for the MVP)

Difficulty matters: too trivial and we prove only the plumbing; too open and the
loop can't converge.

- **A — Wiring smoke test** *(too easy, but do it first)*: a wrong constant in a
  pure util (`calculateTotal` off by one), pinned by a spec. Tests only that the
  loop *runs* end-to-end. A first light, not proof of anything.
- **B — The real target** *(recommended)*: a logic bug in an Angular service or
  pipe (e.g. a filter/sort mishandling an edge case) where the failing spec states
  the *expectation* but not the *fix*. The agent must read the code, locate the
  bug, and reason about the edge case — not pattern-match from the error text.
- **C — Regression trap** *(stretch, next)*: a naive fix greens the failing spec
  but breaks a second one; only the correct fix satisfies both. Proves the agent
  treats the whole suite as the oracle. Powerful, harder to author well.

## Open questions — the grill

1. **Which specimen** (A / B / C above) is the MVP's failure? ⟵ *lean: B, with A
   as a one-off wiring check first.*
2. **Metrics: measure or prove-once?** Instrument human-minutes / merge-rate now,
   or close the loop once and defer? ⟵ *lean: prove-once.*
3. **Done criterion.** Finished when the walkthrough passes once — or when it
   passes unattended across ≥2 distinct specimens (so it isn't a fluke on one
   hand-tuned bug)? ⟵ *lean: ≥2 specimens, since eyes-out already makes this the
   easy case.*

## Decisions log

- **Eyes: OUT of MVP.** Prove the loop where the check is free (unit test) first;
  fewest moving parts. Caveat: eyes are the *immediate* next milestone (above).
- **Environment: LOCAL checkout.** Docker is out of scope, not deferred — the
  harness runs on the host against a configured workspace. The blocker on the
  real project is that it's a *private* nx repo (code entanglement / access),
  not environment isolation; the fixture already solves that.
- **Delivery: STOP AT DIFF, no PR/CI.** The loop's check is the local `run_tests`
  pass, so dropping the PR doesn't cost the loop; the PR is just delivery.
