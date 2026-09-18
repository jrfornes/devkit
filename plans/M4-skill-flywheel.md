# M4 — Skill flywheel (Rung 2)

*Skills as the primary artifact — mounted, discoverable, composable.*

## Goal

Achieve Rung 2 done-when: **new instances of known failure classes are handled
without a human ever seeing them**, because the skill library covers them.

Reference: [README.md](../README.md#skills-are-the-flywheel).

## Done when

1. Skills live under `skills/` and are **discovered at runtime**, not hardcoded in
   `registry.ts`.
2. `run_skill` with unknown name returns helpful list of available skills.
3. New MCP tool: `list_skills` — name, description, when-to-use from SKILL.md frontmatter.
4. Skill metadata schema validated (YAML frontmatter in SKILL.md).
5. Adding a skill = new folder + implementation file; no harness code change.
6. Acceptance: drop in a stub skill folder, restart server, `list_skills` shows it.

## In scope

### Skill package format

```
skills/
  heal-lint-error/
    SKILL.md          # YAML frontmatter + markdown body
    run.ts            # export async function run(ctx): SkillResult
```

SKILL.md frontmatter:

```yaml
---
name: heal-lint-error
description: Fix eslint failures reported by lint
triggers:
  - lint failure
  - eslint error
oracle:
  - lint
---
```

### Dynamic loader

Replace `harness/src/skills/registry.ts` hardcoded map with:

- `discoverSkills(skillsDir)` — scan subdirs
- Load `run.ts` via dynamic import (esbuild bundle optional for prod)
- Cache with mtime invalidation

Optional: `skills/index.json` generated manifest for fast startup.

### Skill authoring workflow

Document in `skills/README.md`:

1. Copy `skills/_template/`
2. Fill SKILL.md + implement `run.ts`
3. Add specimen to sandbox if needed
4. Add case to acceptance-rung1 or dedicated skill test

### Host-facing discovery

`list_skills` returns:

```json
[
  {
    "name": "heal-failing-test",
    "description": "...",
    "oracle": ["run_tests"],
    "documentationPath": "skills/heal-failing-test/SKILL.md"
  }
]
```

Host uses this to pick skills; `run_skill` still returns full documentation in result.

### Flywheel process (operational, not code)

Define in `skills/CONTRIBUTING.md`:

> When a human fixes a failure the agent couldn't handle → add a skill before closing the PR.

## Out of scope

- LLM-generated skills
- Skill versioning / semver
- Remote skill registry (npm package of skills)

## Implementation steps

1. Define frontmatter schema + zod validator.
2. Implement filesystem discovery + dynamic import.
3. Migrate existing skills to new layout (`run.ts` in skill folder, move from harness).
4. Add `list_skills` MCP tool.
5. Template + CONTRIBUTING docs.
6. Acceptance: dynamic load test + existing heal skills still pass.

## Migration note

Move `harness/src/skills/heal-*.ts` → `skills/*/run.ts`. Harness keeps only loader.
Acceptance tests unchanged if behavior preserved.

## Files (expected)

```
harness/src/skills/loader.ts
harness/src/skills/schema.ts
skills/_template/SKILL.md
skills/_template/run.ts
skills/README.md
skills/CONTRIBUTING.md
harness/src/index.ts           (list_skills tool)
```

## Depends on

- M3 — enough skills to prove discovery is worth it (≥4)
