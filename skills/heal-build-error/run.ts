import fs from 'node:fs/promises';
import path from 'node:path';
import { formatCommandResult } from '../../harness/src/runner.js';
import type { SkillContext, SkillResult } from '../../harness/src/types.js';

const CATALOG_BANNER_HTML = 'apps/demo/src/app/catalog-banner/catalog-banner.html';
const BUGGY_TITLE = '<h1>{{ brokenBannerTitle() }}</h1>';
const FIXED_TITLE = '<h1>Active Catalog</h1>';

export async function run(ctx: SkillContext): Promise<SkillResult> {
  const initial = await ctx.config.profile.runBuild(ctx.config.workspaceRoot);
  if (initial.success) {
    return {
      success: true,
      summary: 'Build already succeeds; no changes made.',
    };
  }

  const combinedOutput = `${initial.stdout}\n${initial.stderr}`;
  const targetPath = path.join(ctx.config.workspaceRoot, CATALOG_BANNER_HTML);
  const original = await fs.readFile(targetPath, 'utf8');

  let fixed = original;
  if (original.includes(BUGGY_TITLE)) {
    fixed = original.replace(BUGGY_TITLE, FIXED_TITLE);
  } else if (combinedOutput.includes('brokenBannerTitle')) {
    fixed = original.replace(/<h1>\{\{\s*brokenBannerTitle\(\)\s*\}\}<\/h1>/, FIXED_TITLE);
  }

  if (fixed === original) {
    return {
      success: false,
      summary: 'Build failed but no supported template fix was found.',
      details: formatCommandResult(initial),
    };
  }

  await fs.writeFile(targetPath, fixed, 'utf8');

  const verification = await ctx.config.profile.runBuild(ctx.config.workspaceRoot);
  if (!verification.success) {
    return {
      success: false,
      summary: 'Applied build fix but build is still failing.',
      details: formatCommandResult(verification),
      filesChanged: [CATALOG_BANNER_HTML],
    };
  }

  return {
    success: true,
    summary: 'Restored catalog banner title template; build succeeds.',
    filesChanged: [CATALOG_BANNER_HTML],
  };
}
