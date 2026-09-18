import fs from 'node:fs/promises';
import path from 'node:path';
import { runInteractionTest } from '../../harness/src/eyes/interaction.js';
import type { SkillContext, SkillResult } from '../../harness/src/types.js';

const CATALOG_BANNER_HTML = 'apps/demo/src/app/catalog-banner/catalog-banner.html';
const BUGGY_BUTTON =
  '<button type="button" class="refresh" data-testid="refresh-count">Refresh count</button>';
const FIXED_BUTTON =
  '<button type="button" class="refresh" data-testid="refresh-count" (click)="refreshCount()">Refresh count</button>';

export async function run(ctx: SkillContext): Promise<SkillResult> {
  const htmlPath = path.join(ctx.config.workspaceRoot, CATALOG_BANNER_HTML);
  const original = await fs.readFile(htmlPath, 'utf8');

  const initial = await runInteractionTest(ctx.config, 'catalog-banner');
  if (initial.passed) {
    return {
      success: true,
      summary: 'Interaction test already passes; no changes made.',
    };
  }

  if (!original.includes(BUGGY_BUTTON)) {
    return {
      success: false,
      summary: 'Expected unwired refresh button markup not found in catalog banner HTML.',
      details: initial.failureReason,
    };
  }

  const fixed = original.replace(BUGGY_BUTTON, FIXED_BUTTON);
  await fs.writeFile(htmlPath, fixed, 'utf8');

  const verification = await runInteractionTest(ctx.config, 'catalog-banner');
  if (!verification.passed) {
    return {
      success: false,
      summary: 'Wired refresh handler but interaction test still fails.',
      details: verification.failureReason,
      filesChanged: [CATALOG_BANNER_HTML],
    };
  }

  return {
    success: true,
    summary: 'Wired catalog banner refresh handler and verified interaction test passes.',
    filesChanged: [CATALOG_BANNER_HTML],
  };
}
