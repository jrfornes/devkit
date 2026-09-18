import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './config.js';
import { formatCommandResult, runCommand } from './runner.js';
import { getSkill } from './skills/registry.js';
import { getDiff, getStatus } from './workspace.js';
import type { HarnessConfig, SkillContext } from './types.js';

export interface ToolHandlers {
  status: () => Promise<string>;
  get_diff: () => Promise<string>;
  run_tests: (project?: string) => Promise<string>;
  lint: () => Promise<string>;
  run_skill: (name: string) => Promise<string>;
}

function createSkillContext(config: HarnessConfig): SkillContext {
  return {
    config,
    runCommand,
  };
}

export function createToolHandlers(config = loadConfig()): ToolHandlers {
  return {
    async status() {
      const status = await getStatus(config);
      return JSON.stringify(status, null, 2);
    },

    async get_diff() {
      const diff = await getDiff(config);
      return diff || '(no diff)';
    },

    async run_tests(project) {
      const result = await config.profile.runTests(config.workspaceRoot, project);
      return formatCommandResult(result);
    },

    async lint() {
      const result = await config.profile.lint(config.workspaceRoot);
      return formatCommandResult(result);
    },

    async run_skill(name) {
      const skillMdPath = path.join(config.skillsDir, name, 'SKILL.md');
      const skillDoc = await fs.readFile(skillMdPath, 'utf8').catch(() => null);
      const run = getSkill(name);
      const result = await run(createSkillContext(config));

      const payload = {
        skill: name,
        documentation: skillDoc,
        ...result,
      };
      return JSON.stringify(payload, null, 2);
    },
  };
}
