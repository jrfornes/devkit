import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { createToolHandlers } from '../src/tools.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = loadConfig({ repoRoot });
const tools = createToolHandlers(config);

const BUGGY_FILTER = "return items.filter((item) => item.active === true);";
const FIXED_FILTER = "return items.filter((item) => item.active !== false);";
const itemFilterPath = path.join(
  config.workspaceRoot,
  'libs/shared-data/src/lib/item-filter.ts',
);

function resetSpecimen(id: string) {
  execFileSync('tsx', ['harness/scripts/reset-specimen.ts', id], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log('Acceptance test: MVP loop against nx-angular sandbox\n');

  resetSpecimen('B');

  const status = await tools.status();
  console.log('1. status');
  console.log(status);
  assert(status.includes('nx-angular'), 'Expected nx-angular profile in status');

  const initialDiff = await tools.get_diff();
  console.log('\n2. get_diff (seeded bug)');
  console.log(initialDiff || '(no diff)');
  assert(initialDiff.includes(BUGGY_FILTER), 'Expected seeded buggy filter in diff');

  const failingTests = await tools.run_tests();
  console.log('\n3. run_tests (expect failure)');
  console.log(failingTests.slice(0, 500));
  assert(failingTests.includes('success: false'), 'Expected failing test run');

  const skillResult = await tools.run_skill('heal-failing-test');
  console.log('\n4. run_skill heal-failing-test');
  console.log(skillResult);
  assert(skillResult.includes('"success": true'), 'Expected skill success');

  const passingTests = await tools.run_tests();
  console.log('\n5. run_tests (expect pass)');
  console.log(passingTests.slice(0, 300));
  assert(passingTests.includes('success: true'), 'Expected passing test run');

  const lintResult = await tools.lint();
  console.log('\n6. lint');
  console.log(lintResult.slice(0, 300));
  assert(lintResult.includes('success: true'), 'Expected lint to pass');

  const fixedSource = fs.readFileSync(itemFilterPath, 'utf8');
  assert(
    fixedSource.includes(FIXED_FILTER),
    'Expected healed item-filter implementation on disk',
  );

  const parsed = JSON.parse(skillResult) as { filesChanged?: string[] };
  assert(
    parsed.filesChanged?.some((file) => file.endsWith('item-filter.ts')),
    'Expected item-filter.ts in skill filesChanged',
  );

  console.log('\n✅ Acceptance test passed');
}

run()
  .then(() => {
    resetSpecimen('good');
  })
  .catch((error) => {
    resetSpecimen('good');
    console.error('\n❌ Acceptance test failed');
    console.error(error);
    process.exit(1);
  });
