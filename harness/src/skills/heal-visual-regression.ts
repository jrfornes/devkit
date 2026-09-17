import fs from 'node:fs/promises';
import path from 'node:path';
import { visualDiff } from '../eyes/visual-diff.js';
import type { SkillContext, SkillResult } from '../types.js';

const CATALOG_BANNER_CSS = 'apps/demo/src/app/catalog-banner/catalog-banner.css';
const BUGGY_BACKGROUND = 'background: #e74c3c;';
const FIXED_BACKGROUND = 'background: #2ecc71;';

export async function run(ctx: SkillContext): Promise<SkillResult> {
  const cssPath = path.join(ctx.config.workspaceRoot, CATALOG_BANNER_CSS);
  const original = await fs.readFile(cssPath, 'utf8');

  const initial = await visualDiff(ctx.config, '/');
  if (initial.passed) {
    return {
      success: true,
      summary: 'Visual diff already matches baseline; no changes made.',
    };
  }

  if (!original.includes(BUGGY_BACKGROUND)) {
    return {
      success: false,
      summary: 'Expected catalog banner background regression not found in CSS.',
      details: JSON.stringify(
        {
          diffPixels: initial.diffPixels,
          diffRatio: initial.diffRatio,
        },
        null,
        2,
      ),
    };
  }

  const fixed = original.replace(BUGGY_BACKGROUND, FIXED_BACKGROUND);
  await fs.writeFile(cssPath, fixed, 'utf8');

  const verification = await visualDiff(ctx.config, '/');
  if (!verification.passed) {
    return {
      success: false,
      summary: 'Applied CSS fix but visual diff still fails.',
      details: JSON.stringify(
        {
          diffPixels: verification.diffPixels,
          diffRatio: verification.diffRatio,
        },
        null,
        2,
      ),
      filesChanged: [CATALOG_BANNER_CSS],
    };
  }

  return {
    success: true,
    summary: 'Fixed catalog banner background and verified visual diff passes.',
    filesChanged: [CATALOG_BANNER_CSS],
  };
}
