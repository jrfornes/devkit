import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { createToolHandlers, shutdownHarness } from '../src/tools.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = loadConfig({ repoRoot });
const tools = createToolHandlers(config);

const htmlPath = path.join(
  config.workspaceRoot,
  'apps/demo/src/app/catalog-banner/catalog-banner.html',
);
const cssPath = path.join(
  config.workspaceRoot,
  'apps/demo/src/app/catalog-banner/catalog-banner.css',
);

const BUGGY_BUTTON =
  '<button type="button" class="refresh" data-testid="refresh-count">Refresh count</button>';
const FIXED_BUTTON =
  '<button type="button" class="refresh" data-testid="refresh-count" (click)="refreshCount()">Refresh count</button>';
const BUGGY_BACKGROUND = 'background: #e74c3c;';
const FIXED_BACKGROUND = 'background: #2ecc71;';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function resetInteractionFixture() {
  const contents = fs.readFileSync(htmlPath, 'utf8');
  const reverted = contents.includes(FIXED_BUTTON)
    ? contents.replace(FIXED_BUTTON, BUGGY_BUTTON)
    : contents;
  fs.writeFileSync(htmlPath, reverted, 'utf8');
  assert(
    reverted.includes(BUGGY_BUTTON) && !reverted.includes('(click)="refreshCount()"'),
    'Catalog banner HTML is not in the expected interaction-test state.',
  );
}

function ensureVisualFixturePasses() {
  const contents = fs.readFileSync(cssPath, 'utf8');
  const fixed = contents.includes(BUGGY_BACKGROUND)
    ? contents.replace(BUGGY_BACKGROUND, FIXED_BACKGROUND)
    : contents;
  fs.writeFileSync(cssPath, fixed, 'utf8');
  assert(
    fixed.includes(FIXED_BACKGROUND),
    'Catalog banner CSS is not in the expected passing visual state.',
  );
}

async function run() {
  console.log('Acceptance test: interaction tests milestone\n');

  resetInteractionFixture();
  ensureVisualFixturePasses();

  const started = await tools.start_dev_server();
  console.log('1. start_dev_server');
  console.log(started);
  assert(started.includes('"running": true'), 'Expected dev server to be running');

  const failingTest = await tools.run_interaction_test('catalog-banner');
  console.log('\n2. run_interaction_test catalog-banner (expect failure)');
  console.log(failingTest.text);
  assert(failingTest.text.includes('"passed": false'), 'Expected interaction test failure');
  assert(failingTest.images.length >= 1, 'Expected failure screenshot');

  const skillResult = await tools.run_skill('heal-interaction-test');
  console.log('\n3. run_skill heal-interaction-test');
  console.log(skillResult);
  assert(skillResult.includes('"success": true'), 'Expected interaction heal skill success');

  const passingTest = await tools.run_interaction_test('catalog-banner');
  console.log('\n4. run_interaction_test catalog-banner (expect pass)');
  console.log(passingTest.text);
  assert(passingTest.text.includes('"passed": true'), 'Expected interaction test pass');

  const visual = await tools.visual_diff('/');
  console.log('\n5. visual_diff (expect pass)');
  console.log(visual.text);
  assert(visual.text.includes('"passed": true'), 'Expected visual diff pass');

  const stopped = await tools.stop_dev_server();
  console.log('\n6. stop_dev_server');
  console.log(stopped);
  assert(stopped.includes('"running": false'), 'Expected dev server stopped');

  console.log('\n✅ Interaction acceptance test passed');
}

run()
  .catch((error) => {
    console.error('\n❌ Interaction acceptance test failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownHarness();
  });
