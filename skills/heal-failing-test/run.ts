import fs from 'node:fs/promises';
import path from 'node:path';
import { formatCommandResult } from '../../harness/src/runner.js';
import type { SkillContext, SkillResult } from '../../harness/src/types.js';

const IMPLEMENTATION = 'libs/shared-data/src/lib/item-filter.ts';

export async function run(ctx: SkillContext): Promise<SkillResult> {
  const initial = await ctx.config.profile.runTests(ctx.config.workspaceRoot);
  if (initial.success) {
    return {
      success: true,
      summary: 'Test suite already green; no changes made.',
    };
  }

  const combinedOutput = `${initial.stdout}\n${initial.stderr}`;
  if (!combinedOutput.includes('filterActiveItems')) {
    return {
      success: false,
      summary: 'No supported failing test found for heal-failing-test.',
      details: formatCommandResult(initial),
    };
  }

  const targetPath = path.join(ctx.config.workspaceRoot, IMPLEMENTATION);
  const original = await fs.readFile(targetPath, 'utf8');
  const fixed = original.replace(
    'item.active === true',
    'item.active !== false',
  );

  if (fixed === original) {
    return {
      success: false,
      summary: 'Expected filterActiveItems bug pattern not found in implementation.',
      details: formatCommandResult(initial),
    };
  }

  await fs.writeFile(targetPath, fixed, 'utf8');

  const verification = await ctx.config.profile.runTests(ctx.config.workspaceRoot);
  if (!verification.success) {
    return {
      success: false,
      summary: 'Applied fix but test suite is still failing.',
      details: formatCommandResult(verification),
      filesChanged: [IMPLEMENTATION],
    };
  }

  return {
    success: true,
    summary: 'Fixed filterActiveItems and verified full test suite is green.',
    filesChanged: [IMPLEMENTATION],
  };
}
