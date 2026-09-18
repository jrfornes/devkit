import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import {
  clearSkillCache,
  discoverSkills,
  getSkill,
  listSkillSummaries,
} from '../src/skills/loader.js';
import { createToolHandlers } from '../src/tools.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function withTempSkill<T>(
  fn: (skillsDir: string, skillName: string) => Promise<T>,
): Promise<T> {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'harness-skills-'));
  const skillsDir = path.join(tempRoot, 'skills');
  const skillName = 'stub-skill';
  const skillDir = path.join(skillsDir, skillName);

  await fs.mkdir(skillDir, { recursive: true });
  await fs.copyFile(
    path.join(repoRoot, 'skills/_template/SKILL.md'),
    path.join(skillDir, 'SKILL.md'),
  );
  await fs.copyFile(
    path.join(repoRoot, 'skills/_template/run.ts'),
    path.join(skillDir, 'run.ts'),
  );

  let skillMd = await fs.readFile(path.join(skillDir, 'SKILL.md'), 'utf8');
  skillMd = skillMd.replace(/^name: my-skill-name$/m, `name: ${skillName}`);
  skillMd = skillMd.replace(
    /^description: One-line summary of what this skill fixes or automates$/m,
    'description: Stub skill for dynamic discovery acceptance',
  );
  await fs.writeFile(path.join(skillDir, 'SKILL.md'), skillMd, 'utf8');

  try {
    return await fn(skillsDir, skillName);
  } finally {
    clearSkillCache();
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
}

async function run() {
  console.log('Acceptance test: dynamic skill discovery\n');

  const config = loadConfig({ repoRoot });
  const tools = createToolHandlers(config);

  const discovered = await discoverSkills(config.skillsDir);
  console.log('1. discoverSkills');
  console.log(discovered.map((skill) => skill.name).join(', '));
  assert(
    discovered.some((skill) => skill.name === 'heal-failing-test'),
    'Expected heal-failing-test to be discovered',
  );
  assert(
    discovered.some((skill) => skill.name === 'heal-visual-regression'),
    'Expected heal-visual-regression to be discovered',
  );
  assert(
    !discovered.some((skill) => skill.name.startsWith('_')),
    'Expected _template to be excluded from discovery',
  );

  const listed = JSON.parse(await tools.list_skills()) as Array<{
    name: string;
    description: string;
    oracle?: string[];
    documentationPath: string;
  }>;
  console.log('\n2. list_skills');
  console.log(JSON.stringify(listed, null, 2));
  assert(listed.length >= 2, 'Expected at least two skills from list_skills');
  const healFailing = listed.find((skill) => skill.name === 'heal-failing-test');
  assert(healFailing, 'Expected heal-failing-test in list_skills result');
  assert(healFailing.description.length > 0, 'Expected heal-failing-test description');
  assert(
    healFailing.documentationPath === 'skills/heal-failing-test/SKILL.md',
    'Expected documentationPath for heal-failing-test',
  );

  const unknown = JSON.parse(await tools.run_skill('does-not-exist')) as {
    success: boolean;
    error: string;
    availableSkills: Array<{ name: string }>;
  };
  console.log('\n3. run_skill unknown name');
  console.log(JSON.stringify(unknown, null, 2));
  assert(unknown.success === false, 'Expected success:false for unknown skill');
  assert(unknown.error.includes('Unknown skill'), 'Expected helpful unknown skill error');
  assert(
    unknown.availableSkills.length >= 2,
    'Expected availableSkills list in unknown skill response',
  );

  await withTempSkill(async (skillsDir, skillName) => {
    clearSkillCache();
    const tempConfig = loadConfig({ repoRoot });
    tempConfig.skillsDir = skillsDir;

    const summaries = await listSkillSummaries(skillsDir);
    console.log('\n4. stub skill discovery');
    console.log(JSON.stringify(summaries, null, 2));
    assert(
      summaries.some((skill) => skill.name === skillName),
      'Expected stub skill to appear after drop-in without harness code changes',
    );

    const { runner } = await getSkill(skillsDir, skillName);
    const result = await runner({
      config: tempConfig,
      runCommand: async () => ({
        success: true,
        exitCode: 0,
        stdout: '',
        stderr: '',
        command: 'noop',
      }),
    });
    assert(result.success === false, 'Expected stub skill to return success:false');
  });

  console.log('\n✅ Skills acceptance test passed');
}

run().catch((error) => {
  console.error('\n❌ Skills acceptance test failed');
  console.error(error);
  process.exit(1);
});
