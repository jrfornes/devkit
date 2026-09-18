import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { shutdownHarness } from '../src/tools.js';
import { captureScreenshotBuffer } from '../src/eyes/screenshot.js';
import { baselinePath } from '../src/profiles/nx-angular.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = loadConfig({ repoRoot });
const cssPath = path.join(
  config.workspaceRoot,
  'apps/demo/src/app/catalog-banner/catalog-banner.css',
);

async function run() {
  const css = await fs.readFile(cssPath, 'utf8');
  const corrected = css.replace('background: #e74c3c;', 'background: #2ecc71;');
  await fs.writeFile(cssPath, corrected, 'utf8');

  try {
    const screenshot = await captureScreenshotBuffer(config, '/');
    const output = baselinePath(config.workspaceRoot, config.profile, '/');
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, screenshot);
    console.log(`Wrote baseline: ${output}`);
  } finally {
    await fs.writeFile(cssPath, css, 'utf8');
    await shutdownHarness();
  }
}

run().catch(async (error) => {
  console.error(error);
  await shutdownHarness();
  process.exit(1);
});
