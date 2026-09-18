# M2 — Container lifecycle

*Per-branch Docker workspaces — the architecture's isolation layer.*

## Goal

Replace "tools run on host against local checkout" with "tools run against a
container-mounted workspace keyed by branch," as described in
[ARCHITECTURE.md](../ARCHITECTURE.md) and [MCP.md](../MCP.md).

## Done when

1. `status` reports active container id, branch, and mount path.
2. First tool call for a branch ensures a container is running with that branch
   checked out.
3. All existing tools (`run_tests`, eyes, etc.) work unchanged inside the container.
4. Idle timeout or `stop_workspace` tears down the container.
5. Acceptance: `acceptance-container-test.ts` runs MVP + eyes loops inside Docker.

## In scope

### Base image

`container/Dockerfile`:

- Pinned Node LTS (match real target when known)
- nx global CLI optional; project uses local nx
- Playwright + Chromium deps (for eyes)
- git, openssh-client (for push in M1)
- Non-root user `agent`

`container/package-versions.lock` — document pinned versions.

### Workspace manager

`harness/src/container/lifecycle.ts`:

```typescript
interface WorkspaceSession {
  branch: string;
  containerId: string;
  workspaceRoot: string;  // path inside container, e.g. /workspace
  hostMount?: string;     // optional bind mount on host
  lastActivityAt: number;
}

ensureWorkspace(branch: string): Promise<WorkspaceSession>;
stopWorkspace(branch: string): Promise<void>;
listWorkspaces(): Promise<WorkspaceSession[]>;
```

Model (from MCP.md): **implicit workspace per branch** — first tool call for
branch X starts container with branch X checked out.

### Execution adapter

Refactor `harness/src/runner.ts`:

- `runCommand(cwd, cmd, args)` → dispatches to host or `docker exec`
- Profile commands unchanged; only execution context moves

Eyes/dev-server runs **inside** container (port publish to host for Playwright on
host, or Playwright inside container — prefer all-in-container for fidelity).

### New MCP tools

| Tool | Purpose |
|------|---------|
| `stop_workspace` | Tear down container for current/specified branch |
| (extend) `status` | container id, branch, idle time, dev server state |

### Configuration

```
HARNESS_EXECUTOR=local|docker     # default local for dev, docker for prod
HARNESS_CONTAINER_IMAGE=...
HARNESS_WORKSPACE_IDLE_MS=900000  # 15 min
```

## Out of scope

- Kubernetes / cloud orchestration
- Multi-repo workspaces
- Container per PR comment thread
- Agent runtime bash/file-edit inside container (host still drives via MCP)

## Implementation steps

1. Dockerfile + build script `container/build.sh`.
2. `lifecycle.ts` using Dockerode or CLI wrapper.
3. Branch checkout inside container on start (clone or bind-mount repo).
4. Refactor runner for docker exec dispatch.
5. Wire config switch `HARNESS_EXECUTOR`.
6. Move Playwright into container OR document port-forward pattern; pick one.
7. Idle reaper background timer in MCP server process.
8. Acceptance test in CI (requires Docker-in-Docker or socket mount).

## Acceptance test

```bash
HARNESS_EXECUTOR=docker npm run acceptance
HARNESS_EXECUTOR=docker npm run acceptance:eyes
```

Both pass inside container with no host node_modules in workspace path.

## Open decisions

| Decision | Options | Lean |
|----------|---------|------|
| Mount strategy | Bind-mount repo vs clone inside | Bind-mount for speed in dev |
| Playwright location | In container vs on host | In container |
| Image publish | Local build vs registry | Local build first |

## Files (expected)

```
container/Dockerfile
container/build.sh
harness/src/container/lifecycle.ts
harness/src/container/docker-runner.ts
harness/src/runner.ts              (refactor)
harness/scripts/acceptance-container-test.ts
```

## Depends on

- M1 optional — `open_pr` from inside container needs git credentials mounted
