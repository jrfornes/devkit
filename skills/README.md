# Skills library

Skills are the primary artifact in the agentic UI dev environment. Each skill is a
self-contained package the harness discovers at runtime from this directory.

## Package layout

```
skills/
  heal-failing-test/
    SKILL.md    # YAML frontmatter + documentation
    run.ts      # export async function run(ctx): SkillResult
```

The harness scans subdirectories of `skills/` (skipping folders that start with `_`)
and loads any folder that contains both `SKILL.md` and `run.ts`.

## Authoring a new skill

1. Copy `skills/_template/` to `skills/<your-skill-name>/`.
2. Edit `SKILL.md`:
   - Set `name` to match the folder name
   - Write a clear `description`
   - List `triggers` (when the host should consider this skill)
   - List `oracle` tools used for verification (e.g. `run_tests`, `lint`, `visual_diff`)
3. Implement `run.ts`:
   - Export `async function run(ctx: SkillContext): Promise<SkillResult>`
   - Use `ctx.config` for workspace paths and profile oracles
   - Use `ctx.runCommand` for ad-hoc shell commands when needed
4. Add or extend a sandbox specimen if the skill needs a reproducible failure.
5. Add coverage to an acceptance script under `harness/scripts/`.

No harness code changes are required — restart the MCP server and call `list_skills`
to confirm discovery.

## Discovery API

- `list_skills` — returns name, description, triggers, oracle, and documentation path
- `run_skill` — runs a skill by name; unknown names return the list of available skills

## Frontmatter schema

```yaml
---
name: heal-failing-test
description: Fix a non-visual test failure in the target workspace
triggers:
  - test failure
  - failing spec
oracle:
  - run_tests
---
```

See `harness/src/skills/schema.ts` for the validated schema.
