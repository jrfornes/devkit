import fs from 'node:fs/promises';
import path from 'node:path';
import { formatCommandResult } from '../runner.js';
import type { SkillContext, SkillResult } from '../types.js';

const LINT_SPECIMEN = 'libs/shared-data/src/lib/lint-specimen.ts';
const UNUSED_IMPORT = "import { CatalogItem } from './item-filter';\n";

export async function run(ctx: SkillContext): Promise<SkillResult> {
  const initial = await ctx.config.profile.lint(ctx.config.workspaceRoot);
  if (initial.success) {
    return {
      success: true,
      summary: 'Lint already clean; no changes made.',
    };
  }

  const combinedOutput = `${initial.stdout}\n${initial.stderr}`;
  const targetPath = path.join(ctx.config.workspaceRoot, LINT_SPECIMEN);
  const original = await fs.readFile(targetPath, 'utf8');

  let fixed = original;
  if (original.includes(UNUSED_IMPORT)) {
    fixed = original.replace(UNUSED_IMPORT, '');
  } else if (/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\n/.test(original)) {
    fixed = original.replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"];\n/, '');
  }

  if (fixed === original) {
    const fileLineMatch = combinedOutput.match(
      /lint-specimen\.ts\s*(?:\n[^\n]*)?\s*(\d+):(\d+)/,
    );
    if (!fileLineMatch) {
      return {
        success: false,
        summary: 'Lint failed but no supported fix pattern was found.',
        details: formatCommandResult(initial),
      };
    }
  }

  await fs.writeFile(targetPath, fixed, 'utf8');

  const verification = await ctx.config.profile.lint(ctx.config.workspaceRoot);
  if (!verification.success) {
    return {
      success: false,
      summary: 'Applied lint fix but lint is still failing.',
      details: formatCommandResult(verification),
      filesChanged: [LINT_SPECIMEN],
    };
  }

  return {
    success: true,
    summary: 'Removed unused import from lint-specimen.ts; lint is clean.',
    filesChanged: [LINT_SPECIMEN],
  };
}
