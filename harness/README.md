# Agentic UI Dev Harness

MCP server exposing the Phase 1 tool surface for the agentic UI dev environment.

## Tools

| Tool | Description |
|------|-------------|
| `status` | Branch, workspace path, dirty files |
| `get_diff` | Git diff for the configured workspace |
| `run_tests` | Run nx test suite (optional `project` filter) |
| `run_build` | Run nx build for profile default project(s) |
| `lint` | Run nx lint across projects |
| `list_skills` | List discoverable skills with metadata from SKILL.md |
| `run_skill` | Invoke a skill by name |
| `start_dev_server` | Start the nx dev server |
| `stop_dev_server` | Stop dev server and browser |
| `screenshot_route` | Capture a route screenshot (returns image) |
| `visual_diff` | Compare route to baseline (returns screenshot + diff image) |
| `open_pr` | Commit workspace changes, push branch, open pull request |
| `ci_status` | Report CI check status for a branch or PR URL |

## Configuration

Two roots, not one:

| Root | Env | What lives there |
|------|-----|------------------|
| **Harness** | `HARNESS_REPO_ROOT` | This repo: `skills/`, MCP server, profiles. Default: parent of `harness/`. |
| **Target** | `HARNESS_WORKSPACE` | The nx app the tools test/lint/build/serve. Default: `fixtures/nx-angular-sandbox`. |

`status`, `get_diff`, `open_pr`, and `ci_status` git against the **target's** git
repo (discovered via `git rev-parse --show-toplevel` from the workspace). Skills
always load from the harness. Do not point `HARNESS_REPO_ROOT` at the private
app — that makes ship and skills fight each other.

Other environment variables:

- `HARNESS_PROFILE` — `nx-angular` (default, sandbox) or `nx-angular-private`
- `HARNESS_PROFILE_CONFIG` — path to a gitignored JSON profile (required for `nx-angular-private`)
- `HARNESS_GIT_ROOT` — override git toplevel (rarely needed)
- `HARNESS_GIT_BIN` — absolute path to `git` if Cursor's MCP PATH cannot find it
- `HARNESS_FORGE` — forge provider (default: `github`)
- `HARNESS_BASE_BRANCH` — default base branch for `open_pr` (default: `main`)
- `HARNESS_GITHUB_REPO` — optional `owner/name` override; otherwise `gh` uses the target repo
- `GITHUB_TOKEN` — required for `open_pr` and `ci_status` (repo + pull_requests scopes **on the target GitHub repo**)

Print the resolved split:

```bash
cd harness
npm run print-config
```

## Setup

```bash
# Install fixture dependencies
cd fixtures/nx-angular-sandbox && npm install

# Install harness dependencies
cd ../../harness && npm install
```

You do **not** need `npm run build` to run the MCP server. Cursor should execute
the committed launcher `harness/run-mcp.mjs` (it runs `src/index.ts` via tsx).
`dist/` is gitignored, so it will not show up in the GitHub PR or in Cursor's
default file tree.

## Run the MCP server

```bash
cd harness
npm start
```

### Cursor / Claude Desktop config (sandbox)

```json
{
  "mcpServers": {
    "agentic-ui-dev": {
      "command": "node",
      "args": ["/absolute/path/to/devkit/harness/run-mcp.mjs"],
      "env": {
        "HARNESS_REPO_ROOT": "/absolute/path/to/devkit",
        "HARNESS_WORKSPACE": "/absolute/path/to/devkit/fixtures/nx-angular-sandbox"
      }
    }
  }
}
```

### Point at a private checkout (M6)

Do **not** copy the private app into this repo. Clone it next to `devkit`,
`npm install` there, then copy the example profile:

```bash
cp harness/profiles/nx-angular-private.example.json \
   harness/profiles/nx-angular-private.local.json
```

Fill in real values (`nx show projects` in the private checkout):

```json
{
  "workspaceRoot": "/absolute/path/to/private/repo",
  "serveProject": "<nx app name>",
  "testProjects": ["<app>", "<libs>"],
  "buildProjects": ["<app>"],
  "port": 4200,
  "baselinesDir": "visual-baselines"
}
```

`*.local.json` is gitignored. `workspaceRoot` must be a real clone path, not
`/absolute/path/to/private/repo`. Point Cursor's MCP env at that checkout.
GUI-launched MCP processes often lack Homebrew `git`; include PATH (or
`HARNESS_GIT_BIN`):

```json
{
  "mcpServers": {
    "agentic-ui-dev": {
      "command": "node",
      "args": ["/absolute/path/to/devkit/harness/run-mcp.mjs"],
      "env": {
        "PATH": "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
        "HARNESS_REPO_ROOT": "/absolute/path/to/devkit",
        "HARNESS_PROFILE": "nx-angular-private",
        "HARNESS_PROFILE_CONFIG": "/absolute/path/to/devkit/harness/profiles/nx-angular-private.local.json",
        "GITHUB_TOKEN": "<token with access to the private GitHub repo>"
      }
    }
  }
}
```

`open_pr` / `ci_status` then use the **private** GitHub repo (via `gh` in that
checkout), not `jrfornes/devkit`. Keep the sandbox profile as the default so
CI/acceptance stay green.

Generate a visual baseline in the **target** repo (sandbox still patches the
catalog-banner specimen; private captures the current route as-is):

```bash
cd harness
npm run baseline:generate
# or a specific route:
npx tsx scripts/generate-visual-baseline.ts /some-route
```

## Acceptance tests

MVP loop (test oracle):

```bash
cd harness
npm run acceptance
```

Eyes milestone (visual diff loop):

```bash
cd harness
npm run acceptance:eyes
```

Generate visual baselines after intentional UI changes:

```bash
cd harness
npm run baseline:generate
```

Ship loop (build → PR → CI):

```bash
cd harness
npm run acceptance:ship
```

Skill discovery (dynamic load):

```bash
cd harness
npm run acceptance:skills
```

Rung 1 breadth (all self-healing specimens A–E + dep):

```bash
cd harness
npm run acceptance:rung1
```

Harness vs target root split (no private clone required):

```bash
cd harness
npm run test:config
```

Reset a sandbox specimen to a known bug (or `good`):

```bash
cd harness
npm run reset-specimen -- B
```

Requires `gh` authenticated with permission to push branches and open PRs. Set
`GITHUB_TOKEN` with repo + pull_requests scopes for `open_pr` / `ci_status`. The
sandbox CI workflow (`.github/workflows/sandbox-ci.yml`) must be present on the
pushed branch.
