import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { createToolHandlers, shutdownHarness } from '../src/tools.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = loadConfig({ repoRoot });
const tools = createToolHandlers(config);

const cssPath = path.join(
  config.workspaceRoot,
  'apps/demo/src/app/catalog-banner/catalog-banner.css',
);
const BUGGY_BACKGROUND = 'background: #e74c3c;';
const FIXED_BACKGROUND = 'background: #2ecc71;';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function resetVisualFixture() {
  const contents = fs.readFileSync(cssPath, 'utf8');
  const reverted = contents.includes(BUGGY_BACKGROUND)
    ? contents
    : contents.replace(FIXED_BACKGROUND, BUGGY_BACKGROUND);
  fs.writeFileSync(cssPath, reverted, 'utf8');
  assert(
    reverted.includes(BUGGY_BACKGROUND),
    'Catalog banner CSS is not in the expected visual-regression state.',
  );
}

async function run() {
  console.log('Acceptance test: eyes milestone (visual diff loop)\n');

  resetVisualFixture();

  const started = await tools.start_dev_server();
  console.log('1. start_dev_server');
  console.log(started);
  assert(started.includes('"running": true'), 'Expected dev server to be running');

  const failingDiff = await tools.visual_diff('/');
  console.log('\n2. visual_diff (expect failure)');
  console.log(failingDiff.text);
  assert(failingDiff.text.includes('"passed": false'), 'Expected visual diff failure');
  assert(failingDiff.images.length >= 1, 'Expected screenshot image');

  const skillResult = await tools.run_skill('heal-visual-regression');
  console.log('\n3. run_skill heal-visual-regression');
  console.log(skillResult);
  assert(skillResult.includes('"success": true'), 'Expected visual heal skill success');

  const passingDiff = await tools.visual_diff('/');
  console.log('\n4. visual_diff (expect pass)');
  console.log(passingDiff.text);
  assert(passingDiff.text.includes('"passed": true'), 'Expected visual diff pass');

  const tests = await tools.run_tests('demo');
  console.log('\n5. run_tests demo');
  assert(tests.includes('success: true'), 'Expected demo unit tests to pass');

  const lint = await tools.lint();
  console.log('\n6. lint');
  assert(lint.includes('success: true'), 'Expected lint to pass');

  const diff = await tools.get_diff();
  console.log('\n7. get_diff');
  console.log(diff);
  assert(diff.includes('+  background: #2ecc71;'), 'Expected green background in diff');
  assert(diff.includes('-  background: #e74c3c;'), 'Expected red background removed in diff');

  const stopped = await tools.stop_dev_server();
  console.log('\n8. stop_dev_server');
  console.log(stopped);
  assert(stopped.includes('"running": false'), 'Expected dev server stopped');

  console.log('\n✅ Eyes acceptance test passed');
}

run()
  .catch((error) => {
    console.error('\n❌ Eyes acceptance test failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownHarness();
  });
