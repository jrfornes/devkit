# MCP tool surface — Phase 1

Phase 1 exposes the environment as an **MCP server** and drives it from an
existing host (Claude Desktop, Cursor). We borrow the shell — chat, dashboard,
orchestrator, human-in-the-loop — instead of building it, and spend our effort on
the substrate: the tools, the workspace, the skills, the eyes.

The key property: **these verbs are the same API a future autonomous
orchestrator will call.** Swap the shell later; the surface underneath doesn't
change.

---

## The first tool surface

Maps straight onto Rungs 0–1 of the [roadmap](./ROADMAP.md).

**The CI oracle** — run locally, return structured pass/fail + output:
- `run_tests` — run the suite (or a filtered subset)
- `run_build` — build the project
- `lint` — lint / type-check

**The eyes** — return images in the tool result:
- `start_dev_server` — bring the app up in the workspace
- `screenshot_route` — render a route, return the picture
- `visual_diff` — diff a route against a baseline, return the diff image

**Skills:**
- `run_skill` — invoke a skill by name

**State (read):**
- `get_diff` — the current working diff
- `status` — what's running, which branch, workspace state

**Ship:**
- `open_pr` — push the branch and open the PR

> **Stack-specifics live in a project profile, not in the tools.** How each verb
> maps to a concrete command for *this* workspace (nx/Angular now, your real repo
> later) is configuration — see [SANDBOX.md](./SANDBOX.md) and
> [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Granularity — the one thing to get right

Each tool should be a **meaningful verb with a clear pass/fail signal** — a rung
the host can compose and check. Avoid the two failure modes:

- **Too fine** (a tool per bash command) → the host micromanages, every task is
  a tedious sequence of low-level calls.
- **Too coarse** (one opaque `do_the_task`) → the verification loop is buried
  inside a black box and you've lost the whole point.

Rule of thumb: if the host can't tell whether a call *succeeded* from its result,
the tool is drawn at the wrong altitude.

---

## The eyes work over MCP

This is why MCP-first is *especially* good for UI, not a compromise. MCP tool
results can carry images, so `screenshot_route` and `visual_diff` return the
actual pictures to the host, and the host's multimodal model does the inspecting.
The entire verification loop from [ARCHITECTURE.md](./ARCHITECTURE.md) runs with
zero UI we had to build — the inspector is just the model looking at the
screenshot the tool handed back.

---

## The workspace still has to exist

MCP removes the *UI* for orchestration, not the thing itself. You still need:

> point tools at a checkout for this branch → tools operate against it.

The tools are stateless-ish; the **local workspace** holds the state. Isolation
is a git branch on a configured checkout (`HARNESS_WORKSPACE`), not a container.
Orient with `status`; there is nothing to spin up or reap. Docker is out of
scope — see [plans/README.md](./plans/README.md).

---

## What this buys us

- A working system with **no shell to build** — the host is the shell.
- A person running the verification loop by hand, which teaches us what the
  autonomous version should do before we build it.
- A stable API. When [Phase 2](./ROADMAP.md#phase-2--agentic-ui-deferred) comes,
  the agentic UI slots in behind these same verbs.
