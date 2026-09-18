import fs from 'node:fs/promises';
import path from 'node:path';
import { formatCommandResult } from '../runner.js';
import type { SkillContext, SkillResult } from '../types.js';

const PACKAGE_JSON = 'package.json';
const SUPPORTED_RXJS = '~7.8.0';
const OUTDATED_RXJS = '7.5.0';

export async function run(ctx: SkillContext): Promise<SkillResult> {
  const packageJsonPath = path.join(ctx.config.workspaceRoot, PACKAGE_JSON);
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8')) as {
    dependencies: Record<string, string>;
  };

  const currentRxjs = packageJson.dependencies.rxjs;
  if (currentRxjs === SUPPORTED_RXJS) {
    const tests = await ctx.config.profile.runTests(ctx.config.workspaceRoot);
    if (tests.success) {
      return {
        success: true,
        summary: 'rxjs is already at the supported version and tests pass.',
      };
    }
  }

  if (currentRxjs !== OUTDATED_RXJS && currentRxjs !== SUPPORTED_RXJS) {
    const tests = await ctx.config.profile.runTests(ctx.config.workspaceRoot);
    if (tests.success) {
      return {
        success: true,
        summary: 'Dependency versions already satisfy tests.',
      };
    }
  }

  packageJson.dependencies.rxjs = SUPPORTED_RXJS;
  await fs.writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');

  const install = await ctx.runCommand(ctx.config.workspaceRoot, 'npm', ['install']);
  if (!install.success) {
    return {
      success: false,
      summary: 'Updated package.json but npm install failed.',
      details: formatCommandResult(install),
      filesChanged: [PACKAGE_JSON],
    };
  }

  const verification = await ctx.config.profile.runTests(ctx.config.workspaceRoot);
  if (!verification.success) {
    return {
      success: false,
      summary: 'Bumped rxjs but dependency version tests are still failing.',
      details: formatCommandResult(verification),
      filesChanged: [PACKAGE_JSON, 'package-lock.json'],
    };
  }

  return {
    success: true,
    summary: `Bumped rxjs to ${SUPPORTED_RXJS} and verified tests pass.`,
    filesChanged: [PACKAGE_JSON, 'package-lock.json'],
  };
}
