import type { SkillContext, SkillResult } from '../types.js';
import { run as healFailingTest } from './heal-failing-test.js';
import { run as healVisualRegression } from './heal-visual-regression.js';

type SkillRunner = (ctx: SkillContext) => Promise<SkillResult>;

const skills: Record<string, SkillRunner> = {
  'heal-failing-test': healFailingTest,
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
