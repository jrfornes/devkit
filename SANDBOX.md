# The nx-angular-sandbox fixture

*Status: in-tree fixture on `main`. Default target for CI and acceptance.
Not a submodule.*

We build the harness against a realistic target instead of in a vacuum — but the
target is a **swappable fixture the harness points at**, never the root of the
work. That one distinction is the entire porting story.

## Fixture, not root

The product is the harness (MCP server, skills, eyes). The workspace
it operates on is a *test subject*. If the workspace were the root and we built
tooling inside it, the tool would quietly grow assumptions about that specific
workspace — paths, layout, "the app is right here" — and "grab the things into my
real project" becomes a disentangling job.

Instead the harness is the root and the workspace is an **input**: a path/repo it
is configured to target. The seam stays clean. And it is the *same seam* as the
architecture's local workspace — the harness is pointed at a checkout; it
shouldn't care which one. Building against a fixture just exercises that seam
early.

M6 splits that seam into two roots so a *second* checkout (the private app) can
be the target without moving skills:

| Root | Default | Private spike |
|------|---------|----------------|
| Harness (`HARNESS_REPO_ROOT`) | this repo | this repo |
| Target (`HARNESS_WORKSPACE`) | `fixtures/nx-angular-sandbox` | the private clone |

Git / PRs follow the **target**. Skills stay in the harness. See
[plans/M6-port-real-repo.md](./plans/M6-port-real-repo.md).

## The project profile (where the leverage is)

`run_tests`, `lint`, `start_dev_server`, `screenshot_route` are stack-agnostic
*verbs*. How you build / test / lint / serve *this* workspace is
**configuration** — a thin "project profile." The harness core stays generic;
there is a small nx-angular profile (the commands, where components live, how the
dev server comes up).

Porting, then, isn't "grab the code." It's **point the harness at the real repo
and write its profile.** Skills, server, eyes all stay put. The
fixture's whole job is to prove the nx-angular profile works. (Profile concept
also in [ARCHITECTURE.md](./ARCHITECTURE.md).)

## Why nx + angular specifically (not a generic app)

The stack-specific interfaces are *exactly* what the eyes and the CI-oracle tools
bind to. A generic vite/react fixture would hide the integration work we need to
get right — Angular's dev-server startup, its test / build / lint commands, nx's
task runner — and we'd redo it against the real repo. Match the interfaces, not a
toy.

nx also gives the agent loop real affordances worth having from day one:

- `nx affected` — run only what changed → a faster oracle
- the project graph — a machine-readable map for the agent to navigate
- computed caching

## Keep it tiny and deliberately breakable

Match the interfaces, not the scale. Just enough surface to exercise Rungs 0–1:

- one app (`demo`) + one lib (`shared-data`)
- a component worth screenshotting (catalog banner — the eyes)
- specimens A–E + a dependency bump (the `heal-*` / `bump-dependency` skills)

## Layout

Harness at root, fixture as a sibling it targets:

```
devkit/
  *.md                     # the planning docs
  harness/                 # MCP server, project profiles
  skills/
  fixtures/
    nx-angular-sandbox/    # minimal, synthetic, disposable (in-tree)
```

## Decision: keep the fixture in-tree

**Decision (M6):** do **not** extract `fixtures/nx-angular-sandbox` as a git
submodule.

A submodule would force the target to look "external," but it does not prove
the port. The proof is pointing the same harness at a checkout you already
have, via profile JSON. Extracting the fixture now is extra clone/CI friction
for no additional seam.

Revisit only if the fixture starts leaking harness-repo assumptions that a
second local checkout cannot express.

## Versions

Pinned in the fixture today:

| Component | Sandbox |
|-----------|---------|
| nx | 23.2.1 |
| Angular | ~22.1.0 |

Align the sandbox to the private app only when commands actually diverge (see
the M6 spike). Do not churn versions preemptively.
