import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './config.js';
import { startDevServer, stopDevServer } from './eyes/dev-server.js';
import { closeBrowser, screenshotRoute } from './eyes/screenshot.js';
import { visualDiff } from './eyes/visual-diff.js';
import { formatCommandResult, runCommand } from './runner.js';
import { getCiStatus } from './ship/ci-status.js';
import { openPullRequest } from './ship/open-pr.js';
import { getSkill, listSkillSummaries, SkillNotFoundError } from './skills/registry.js';
import { getDiff, getStatus } from './workspace.js';
import type {
  HarnessConfig,
  ImagePayload,
  OpenPrOptions,
  SkillContext,
  VisualDiffResult,
} from './types.js';

export interface ToolHandlers {
  status: () => Promise<string>;
  get_diff: () => Promise<string>;
  run_tests: (project?: string) => Promise<string>;
  run_build: (project?: string) => Promise<string>;
  lint: () => Promise<string>;
  run_skill: (name: string) => Promise<string>;
  list_skills: () => Promise<string>;
  start_dev_server: () => Promise<string>;
  stop_dev_server: () => Promise<string>;
  screenshot_route: (route?: string) => Promise<ScreenshotToolResult>;
  visual_diff: (route?: string) => Promise<VisualDiffToolResult>;
  open_pr: (options: OpenPrOptions) => Promise<string>;
  ci_status: (options: { branch?: string; prUrl?: string }) => Promise<string>;
}

export interface ScreenshotToolResult {
  text: string;
  images: ImagePayload[];
}

export interface VisualDiffToolResult {
  text: string;
  images: ImagePayload[];
}

function createSkillContext(config: HarnessConfig): SkillContext {
  return {
    config,
    runCommand,
  };
}

function formatVisualDiffSummary(result: VisualDiffResult): string {
  return JSON.stringify(
    {
      route: result.route,
      url: result.url,
      baselinePath: result.baselinePath,
      passed: result.passed,
      diffPixels: result.diffPixels,
      totalPixels: result.totalPixels,
      diffRatio: Number(result.diffRatio.toFixed(6)),
    },
    null,
    2,
  );
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

    async run_build(project) {
      const result = await config.profile.runBuild(config.workspaceRoot, project);
      return formatCommandResult(result);
    },

    async lint() {
      const result = await config.profile.lint(config.workspaceRoot);
      return formatCommandResult(result);
    },

    async run_skill(name) {
      try {
        const { runner } = await getSkill(config.skillsDir, name);
        const skillMdPath = path.join(config.skillsDir, name, 'SKILL.md');
        const skillDoc = await fs.readFile(skillMdPath, 'utf8').catch(() => null);
        const result = await runner(createSkillContext(config));

        const payload = {
          skill: name,
          documentation: skillDoc,
          ...result,
        };
        return JSON.stringify(payload, null, 2);
      } catch (error) {
        if (error instanceof SkillNotFoundError) {
          return JSON.stringify(
            {
              success: false,
              error: error.message,
              availableSkills: error.availableSkills,
            },
            null,
            2,
          );
        }
        throw error;
      }
    },

    async list_skills() {
      const skills = await listSkillSummaries(config.skillsDir);
      return JSON.stringify(skills, null, 2);
    },

    async start_dev_server() {
      const serverStatus = await startDevServer(config);
      return JSON.stringify(serverStatus, null, 2);
    },

    async stop_dev_server() {
      const serverStatus = await stopDevServer();
      await closeBrowser();
      return JSON.stringify(serverStatus, null, 2);
    },

    async screenshot_route(route = '/') {
      const result = await screenshotRoute(config, route);
      return {
        text: JSON.stringify(
          { route: result.route, url: result.url, image: 'attached' },
          null,
          2,
        ),
        images: [result.image],
      };
    },

    async visual_diff(route = '/') {
      const result = await visualDiff(config, route);
      const images: ImagePayload[] = [result.screenshot];
      if (result.diffImage) {
        images.push(result.diffImage);
      }

      return {
        text: formatVisualDiffSummary(result),
        images,
      };
    },

    async open_pr(options) {
      const result = await openPullRequest(config, options);
      return JSON.stringify(result, null, 2);
    },

    async ci_status(options) {
      const result = await getCiStatus({
        repoRoot: config.gitRoot,
        branch: options.branch,
        prUrl: options.prUrl,
      });
      return JSON.stringify(result, null, 2);
    },
  };
}

export async function shutdownHarness(): Promise<void> {
  await stopDevServer();
  await closeBrowser();
}
