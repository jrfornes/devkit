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

function seedFailure() {
  const contents = fs.readFileSync(itemFilterPath, 'utf8');
  if (contents.includes(BUGGY_FILTER)) {
    return;
  }
  if (contents.includes(FIXED_FILTER)) {
    fs.writeFileSync(itemFilterPath, contents.replace(FIXED_FILTER, BUGGY_FILTER), 'utf8');
    return;
  }
  throw new Error('Fixture is not in a recognized filterActiveItems state.');
}

function restoreFixture() {
  const contents = fs.readFileSync(itemFilterPath, 'utf8');
  if (contents.includes(FIXED_FILTER)) {
    return;
  }
  if (contents.includes(BUGGY_FILTER)) {
    fs.writeFileSync(itemFilterPath, contents.replace(BUGGY_FILTER, FIXED_FILTER), 'utf8');
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log('Acceptance test: MVP loop against nx-angular sandbox\n');

  seedFailure();

  const status = await tools.status();
  console.log('1. status');
  console.log(status);
  assert(status.includes('nx-angular'), 'Expected nx-angular profile in status');

  const initialDiff = await tools.get_diff();
  console.log('\n2. get_diff (initial)');
  console.log(initialDiff || '(no diff)');

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

  const finalDiff = await tools.get_diff();
  console.log('\n7. get_diff (final)');
  console.log(finalDiff);
  assert(
    finalDiff.includes(`+  ${FIXED_FILTER}`),
    'Expected fixed filter as added line in diff',
  );
  assert(
    finalDiff.includes(`-  ${BUGGY_FILTER}`),
    'Expected buggy filter as removed line in diff',
  );

  const changedFiles = execFileSync(
    'git',
    ['diff', '--name-only', '--', path.relative(repoRoot, config.workspaceRoot)],
    { cwd: repoRoot, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean);

  assert(
    changedFiles.length === 1 && changedFiles[0]?.endsWith('item-filter.ts'),
    `Expected only item-filter.ts to change, got: ${changedFiles.join(', ')}`,
  );

  console.log('\n✅ Acceptance test passed');
}

run()
  .then(() => {
    restoreFixture();
  })
  .catch((error) => {
    restoreFixture();
    console.error('\n❌ Acceptance test failed');
    console.error(error);
    process.exit(1);
  });
