import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { pollCiStatus } from '../src/ship/ci-status.js';
import { checkoutBranch, deleteRemoteBranch } from '../src/ship/git.js';
import { GitHubPullRequestProvider } from '../src/ship/providers/github.js';
import { createToolHandlers } from '../src/tools.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = loadConfig({ repoRoot });
const tools = createToolHandlers(config);
const github = new GitHubPullRequestProvider();

const BUGGY_FILTER = 'return items.filter((item) => item.active === true);';
const FIXED_FILTER = 'return items.filter((item) => item.active !== false);';
const itemFilterPath = path.join(
  config.workspaceRoot,
  'libs/shared-data/src/lib/item-filter.ts',
);
const workspaceRelative = path.relative(repoRoot, config.workspaceRoot);

const branchName = `harness/acceptance-ship-${Date.now()}`;
const startingBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
  cwd: repoRoot,
  encoding: 'utf8',
}).trim();

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

async function cleanup(prUrl?: string) {
  if (prUrl) {
    await github.closePullRequest(repoRoot, prUrl).catch(() => undefined);
  }
  await deleteRemoteBranch(repoRoot, branchName).catch(() => undefined);
  await checkoutBranch(repoRoot, startingBranch).catch(() => undefined);
  restoreFixture();
}

async function run() {
  console.log('Acceptance test: ship loop (build → PR → CI)\n');

  seedFailure();

  const skillResult = await tools.run_skill('heal-failing-test');
  console.log('1. run_skill heal-failing-test');
  console.log(skillResult);
  assert(skillResult.includes('"success": true'), 'Expected skill success');

  const buildResult = await tools.run_build();
  console.log('\n2. run_build');
  console.log(buildResult.slice(0, 400));
  assert(buildResult.includes('success: true'), 'Expected build to pass');

  const passingTests = await tools.run_tests();
  console.log('\n3. run_tests');
  console.log(passingTests.slice(0, 300));
  assert(passingTests.includes('success: true'), 'Expected passing test run');

  const lintResult = await tools.lint();
  console.log('\n4. lint');
  console.log(lintResult.slice(0, 300));
  assert(lintResult.includes('success: true'), 'Expected lint to pass');

  const openPrResult = await tools.open_pr({
    title: 'fix: heal filterActiveItems edge case',
    body: 'Automated acceptance-ship-test PR.',
    draft: true,
    branchName,
  });
  console.log('\n5. open_pr');
  console.log(openPrResult);

  const openPrPayload = JSON.parse(openPrResult) as {
    success: boolean;
    prUrl?: string;
    error?: string;
  };

  if (!openPrPayload.success) {
    const tokenMissing = !process.env.GITHUB_TOKEN && !process.env.GH_TOKEN;
    const permissionError = openPrPayload.error?.includes('Resource not accessible');
    if (tokenMissing || permissionError) {
      console.log(
        '\n⚠️  Skipping PR/CI steps: set GITHUB_TOKEN with repo + pull_requests scopes to run the full ship loop.',
      );
      await cleanup();
      console.log('\n✅ Acceptance ship test passed (local steps only; PR/CI skipped)');
      return;
    }
  }

  assert(openPrPayload.success, 'Expected open_pr success');
  assert(openPrPayload.prUrl, 'Expected PR URL in open_pr result');

  const prUrl = openPrPayload.prUrl;
  assert(prUrl.startsWith('http'), `Expected valid PR URL, got ${prUrl}`);

  const finalDiff = await tools.get_diff();
  console.log('\n6. get_diff (should be clean on original branch after open_pr)');
  console.log(finalDiff || '(no diff)');

  console.log('\n7. ci_status (polling until success or timeout)');
  const ciResult = await pollCiStatus({
    repoRoot,
    prUrl,
    timeoutMs: 12 * 60 * 1000,
    intervalMs: 20 * 1000,
  });
  console.log(JSON.stringify(ciResult, null, 2));
  assert(ciResult.state === 'success', `Expected CI success, got ${ciResult.state}`);

  const remoteDiff = execFileSync(
    'git',
    ['show', `${branchName}:fixtures/nx-angular-sandbox/libs/shared-data/src/lib/item-filter.ts`],
    { cwd: repoRoot, encoding: 'utf8' },
  );
  assert(
    remoteDiff.includes(FIXED_FILTER) && !remoteDiff.includes(BUGGY_FILTER),
    'Expected committed fix on remote branch',
  );

  const changedFiles = execFileSync(
    'git',
    ['diff', '--name-only', `origin/main...${branchName}`, '--', workspaceRelative],
    { cwd: repoRoot, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean);

  assert(
    changedFiles.length === 1 && changedFiles[0]?.endsWith('item-filter.ts'),
    `Expected only item-filter.ts in PR diff, got: ${changedFiles.join(', ')}`,
  );

  await cleanup(prUrl);

  console.log('\n✅ Acceptance ship test passed');
}

run().catch(async (error) => {
  console.error('\n❌ Acceptance ship test failed');
  console.error(error);
  await cleanup().catch(() => undefined);
  process.exit(1);
});
