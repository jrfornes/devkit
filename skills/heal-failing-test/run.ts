import fs from 'node:fs/promises';
import path from 'node:path';
import { formatCommandResult } from '../../harness/src/runner.js';
import type { SkillContext, SkillResult } from '../../harness/src/types.js';

type SpecimenHandler = {
  detect: (output: string) => boolean;
  implementation: string;
  applyFix: (source: string) => string;
  summary: string;
};

const handlers: SpecimenHandler[] = [
  {
    detect: (output) => output.includes('calculateTotal'),
    implementation: 'libs/shared-data/src/lib/calculate-total.ts',
    applyFix: (source) =>
      source.replace(
        'return items.reduce((sum, item) => sum + item.price, 0) + 1;',
        'return items.reduce((sum, item) => sum + item.price, 0);',
      ),
    summary: 'Removed off-by-one constant from calculateTotal.',
  },
  {
    detect: (output) => output.includes('filterActiveItems'),
    implementation: 'libs/shared-data/src/lib/item-filter.ts',
    applyFix: (source) =>
      source.replace(
        'item.active === true',
        'item.active !== false',
      ),
    summary: 'Fixed filterActiveItems to treat omitted active flags as active.',
  },
  {
    detect: (output) => output.includes('sortByPriority'),
    implementation: 'libs/shared-data/src/lib/sort-items.ts',
    applyFix: (source) =>
      source.replace(
        'return [...items].sort((a, b) => b.priority - a.priority);',
        `return [...items].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );`,
      ),
    summary: 'Fixed sortByPriority with id tie-break for equal priorities.',
  },
];

export async function run(ctx: SkillContext): Promise<SkillResult> {
  const initial = await ctx.config.profile.runTests(ctx.config.workspaceRoot);
  if (initial.success) {
    return {
      success: true,
      summary: 'Test suite already green; no changes made.',
    };
  }

  const combinedOutput = `${initial.stdout}\n${initial.stderr}`;
  const handler = handlers.find((candidate) => candidate.detect(combinedOutput));
  if (!handler) {
    return {
      success: false,
      summary: 'No supported failing test found for heal-failing-test.',
      details: formatCommandResult(initial),
    };
  }

  const targetPath = path.join(ctx.config.workspaceRoot, handler.implementation);
  const original = await fs.readFile(targetPath, 'utf8');
  const fixed = handler.applyFix(original);

  if (fixed === original) {
    return {
      success: false,
      summary: `Expected bug pattern not found in ${handler.implementation}.`,
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
      filesChanged: [handler.implementation],
    };
  }

  return {
    success: true,
    summary: `${handler.summary} Full test suite is green.`,
    filesChanged: [handler.implementation],
  };
}
