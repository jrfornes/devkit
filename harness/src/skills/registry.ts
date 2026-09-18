import type { SkillContext, SkillResult } from '../types.js';
import { run as bumpDependency } from './bump-dependency.js';
import { run as healBuildError } from './heal-build-error.js';
import { run as healFailingTest } from './heal-failing-test.js';
import { run as healLintError } from './heal-lint-error.js';
import { run as healVisualRegression } from './heal-visual-regression.js';

type SkillRunner = (ctx: SkillContext) => Promise<SkillResult>;

const skills: Record<string, SkillRunner> = {
  'bump-dependency': bumpDependency,
  'heal-build-error': healBuildError,
  'heal-failing-test': healFailingTest,
  'heal-lint-error': healLintError,
  'heal-visual-regression': healVisualRegression,
};

export function getSkill(name: string): SkillRunner {
  const skill = skills[name];
  if (!skill) {
    throw new Error(`Unknown skill: ${name}`);
  }
  return skill;
}

export function listSkills(): string[] {
  return Object.keys(skills);
}
