# Contributing skills

## Flywheel rule

When a human fixes a failure the agent could not handle, add a skill before closing
the PR. The goal is that the next instance of the same failure class heals without
human intervention.

## Checklist for a new skill

1. Copy `skills/_template/` to `skills/<name>/`.
2. Fill in `SKILL.md` frontmatter and documentation.
3. Implement `run.ts` with a minimal, verifiable fix strategy.
4. Seed a specimen in the sandbox when a reproducible failure is needed.
5. Add or extend an acceptance script that proves the skill works end-to-end.
6. Run `list_skills` after restarting the harness to confirm discovery.

## Design guidelines

- Keep skills focused on one failure class or task type.
- Prefer oracle verification (`run_tests`, `lint`, `visual_diff`) over assuming success.
- Return structured `SkillResult` with `summary`, optional `details`, and `filesChanged`.
- Avoid changing unrelated files — minimal diffs merge faster and review easier.

## Out of scope (for now)

- LLM calls inside skills (the host reasons; skills apply known fixes)
- Skill versioning or semver
- Remote skill registries
