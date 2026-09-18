# Agentic UI Dev Environment

*Status: vision / seed doc*

A customized development environment where an agent works against a
**local project workspace**, draws on a growing library of **skills**, runs
tests and inspects its own UI changes, fixes and heals things, and ships PRs —
with a human in the loop only where judgment is actually needed.

The **substrate** is the point of customization: our workspace, our skills, our
verification loop, our metrics. The **shell** on top — the thing that drives the
loop and shows a human what's happening — we borrow before we build. See
[Build order](#build-order-mcp-first).

---

## North star

Not "10 PRs a day." The real target is:

> **Merged, correct PRs at near-zero human cost.**

A PR isn't value — a *merged, correct* PR is. If we optimize for raw PR count,
we just relocate the bottleneck onto whoever has to review ten PRs a day, and an
unmerged PR is worse than nothing: it's review burden that produced zero.

So the number we actually drive is **human-minutes per merged PR → 0**. Get that
low enough and 10/day falls out on its own — and they're real ones. Chase the
count directly and you get 10 PRs and a reviewer who quietly stops reading them.

(Metrics in [METRICS.md](./METRICS.md).)

---

## Build order: MCP-first

The agentic UI is the *presentation + orchestration shell*, not the load-bearing
part — so we defer it and **borrow a shell instead of building one.** Phase 1
exposes the environment as an **MCP tool surface** and drives it from an existing
host (Claude Desktop, Cursor). The host is the chat, the dashboard, the
orchestrator, and the human-in-the-loop — all for free.

This defers more than the UI: it defers the *autonomous orchestration loop* too.
A person driving the host runs that loop by hand while we validate the pieces —
which is how we learn what the autonomous version should even do.

What makes it non-throwaway: **the tool verbs are the same API a future
autonomous orchestrator will call.** `run_tests`, `screenshot_route`,
`run_skill`, `open_pr` don't change when we later put our own agentic UI on top.
We build the substrate now and swap the shell later.

And it's *especially* good for UI: MCP tool results can carry images, so
`screenshot_route` / `visual_diff` hand the actual pictures back to the host, and
the host's multimodal model does the inspecting. The whole verification loop runs
with zero UI we had to build.

> **The real work is the substrate: the tools, the workspace, the skills, the
> eyes. The UI is the easy part to add last.**

We develop that substrate against a disposable **nx-angular fixture** the harness
targets — not inside a real project — so the eventual port is a config change,
not surgery. See [SANDBOX.md](./SANDBOX.md).

(Tool surface in [MCP.md](./MCP.md); MVP scope in [MVP.md](./MVP.md); phasing in
[ROADMAP.md](./ROADMAP.md).)

---

## The central bet: the verification loop

This is the thing that makes or breaks the system, and it's hard *specifically
because* it's UI.

Backend work has a cheap oracle. Does it compile, do the tests pass, does the
type-checker go green? An agent can grind against that signal unattended.

UI work has no such oracle. "Does this look right / behave right?" isn't
something the code tells you. So the workspace for UI dev is **not** really
about node + a dev server — the load-bearing part is giving the agent **eyes**:

- a running dev server,
- a headless browser (Playwright or similar),
- screenshot capture,
- visual-diff against a baseline, plus interaction tests.

If the agent can render its change and inspect it, UI PRs get good. If it can't,
you get plausible-looking diffs that are subtly broken — and catching that falls
on a human every time, which kills the whole economic case.

(The loop and the stack are drawn out in [ARCHITECTURE.md](./ARCHITECTURE.md).)

---

## Skills are the flywheel

Skills aren't a feature of this system — they're the *primary artifact*. The
flywheel isn't "agent makes PRs." It's:

> agent hits a wall → someone writes a skill so it never hits that wall again.

Every recurring failure gets codified into a repeatable procedure. That's what
turns this from a fixed-capability tool into something that improves week over
week. PR count is a *lagging indicator* of how good the skill library has gotten.

Treat the skill library as the thing you're really building.

---

## Start where success is verifiable

"Fix things, heal things" is where we **start**, not where we end.

Self-healing tasks — a failing test, a broken build, a lint error, a dependency
bump, a flaky spec — have a cheap, unambiguous success signal: **CI goes green.**
That's the safe end of the autonomy spectrum: verifiable and bounded.

Prove the loop there before pointing it at "build this feature," where success
is a matter of taste and the only oracle is a person.

(Phasing in [ROADMAP.md](./ROADMAP.md).)

---

## Docs in this set

- [ARCHITECTURE.md](./ARCHITECTURE.md) — the layered stack, the verification loop, diagrams
- [MCP.md](./MCP.md) — Phase 1 tool surface: the verbs, granularity, workspace model
- [SANDBOX.md](./SANDBOX.md) — the nx-angular fixture we develop against, and the port story
- [MVP.md](./MVP.md) — the smallest thing worth building first (draft)
- [METRICS.md](./METRICS.md) — what to measure instead of PR count
- [ROADMAP.md](./ROADMAP.md) — the autonomy ladder: verifiable first, judgment last
