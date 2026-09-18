# Agentic UI Dev Harness

MCP server exposing the Phase 1 tool surface for the agentic UI dev environment.

## Tools

| Tool | Description |
|------|-------------|
| `status` | Branch, workspace path, dirty files |
| `get_diff` | Git diff for the configured workspace |
| `run_tests` | Run nx test suite (optional `project` filter) |
| `lint` | Run nx lint across projects |
| `run_skill` | Invoke a skill by name |
| `start_dev_server` | Start the nx dev server |
| `stop_dev_server` | Stop dev server and browser |
| `screenshot_route` | Capture a route screenshot (returns image) |
| `visual_diff` | Compare route to baseline (returns screenshot + diff image) |

## Configuration

Environment variables:

- `HARNESS_REPO_ROOT` — repo root (default: parent of `harness/`)
- `HARNESS_WORKSPACE` — target workspace path (default: `fixtures/nx-angular-sandbox`)
- `HARNESS_PROFILE` — project profile name (default: `nx-angular`)

## Setup

```bash
# Install fixture dependencies
cd fixtures/nx-angular-sandbox && npm install

# Install harness dependencies
cd ../../harness && npm install && npm run build
```

## Run the MCP server

```bash
cd harness
npm run dev
```

### Cursor / Claude Desktop config

```json
{
  "mcpServers": {
    "agentic-ui-dev": {
      "command": "node",
      "args": ["/absolute/path/to/repo/harness/dist/index.js"],
      "env": {
        "HARNESS_WORKSPACE": "/absolute/path/to/repo/fixtures/nx-angular-sandbox"
      }
    }
  }
}
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
