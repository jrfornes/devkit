# The nx-angular-sandbox fixture

*Status: planned, not yet scaffolded.*

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

- one app + maybe one lib
- a component or two worth screenshotting (the eyes)
- a test you can make fail on command (the `heal-failing-test` skill)
- a lint error to fix, a dependency to bump (the other Rung-1 tasks)

## Layout

Harness at root, fixture as a sibling it targets:

```
agentic-ui-dev/
  *.md                     # the planning docs
  harness/                 # MCP server, project profiles
  skills/
  fixtures/
    nx-angular-sandbox/    # minimal, synthetic, disposable
```

**Optional discipline:** make `nx-angular-sandbox` a git submodule (or a separate
repo cloned in) so the harness treats the target as *external* from day one. That
forces the seam honest — the eventual port becomes a config change rather than
surgery. Slightly more friction now, much less later; a call to make early.

## Open scaffolding decisions

- **Versions** — the real target is a *private* nx + Angular repo, so eventually
  the profile's interfaces should match its nx / Angular line. For an eyes-out MVP
  this matters little; pin to `nx@latest` now and align when the eyes go in.
  (Deferred until we scaffold.)
- **Submodule vs. in-tree** — adopt the external-target discipline now, or start
  in-tree and extract later?
