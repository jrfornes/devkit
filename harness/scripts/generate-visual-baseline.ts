import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { shutdownHarness } from '../src/tools.js';
import { captureScreenshotBuffer } from '../src/eyes/screenshot.js';
import { baselinePath } from '../src/profiles/nx-angular.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = loadConfig({ repoRoot });
const route = process.argv[2] ?? '/';
const sandboxCssPath = path.join(
  config.workspaceRoot,
  'apps/demo/src/app/catalog-banner/catalog-banner.css',
);

async function maybeCorrectSandboxBanner(): Promise<() => Promise<void>> {
  if (config.profile.name !== 'nx-angular') {
    return async () => undefined;
  }

  try {
    const css = await fs.readFile(sandboxCssPath, 'utf8');
    const corrected = css.replace('background: #e74c3c;', 'background: #2ecc71;');
    if (corrected === css) {
      return async () => undefined;
    }
    await fs.writeFile(sandboxCssPath, corrected, 'utf8');
    return async () => {
      await fs.writeFile(sandboxCssPath, css, 'utf8');
    };
  } catch {
    return async () => undefined;
  }
}

async function run() {
  const restore = await maybeCorrectSandboxBanner();

  try {
    const screenshot = await captureScreenshotBuffer(config, route);
    const output = baselinePath(config.workspaceRoot, config.profile, route);
    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, screenshot);
    console.log(`Wrote baseline: ${output}`);
  } finally {
    await restore();
    await shutdownHarness();
  }
}

run().catch(async (error) => {
  console.error(error);
  await shutdownHarness();
  process.exit(1);
});
