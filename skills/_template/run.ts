import type { SkillContext, SkillResult } from '../../harness/src/types.js';

export async function run(ctx: SkillContext): Promise<SkillResult> {
  void ctx;

  return {
    success: false,
    summary: 'Replace this stub with your skill implementation.',
  };
}
