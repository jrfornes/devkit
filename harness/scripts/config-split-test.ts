import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { loadProfileConfigFile } from '../src/profiles/load-profile-config.js';
import { getDiff, getStatus, workspacePathspec } from '../src/workspace.js';

const harnessRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const harnessDir = path.join(harnessRoot, 'harness');

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function withClearedHarnessEnv<T>(fn: () => T | Promise<T>): Promise<T> {
  const keys = [
    'HARNESS_REPO_ROOT',
    'HARNESS_WORKSPACE',
    'HARNESS_GIT_ROOT',
    'HARNESS_PROFILE',
    'HARNESS_PROFILE_CONFIG',
  ];
  const previous = new Map<string, string | undefined>();
  for (const key of keys) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of previous) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    });
}

function initTempGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-target-'));
  execFileSync('git', ['init', '-b', 'main'], { cwd: dir, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.email', 'harness-test@example.com'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Harness Test'], { cwd: dir });
  fs.writeFileSync(path.join(dir, 'README.md'), 'private target fixture\n');
  execFileSync('git', ['add', 'README.md'], { cwd: dir });
  execFileSync('git', ['commit', '-m', 'init'], { cwd: dir, stdio: 'pipe' });
  return dir;
}

async function run() {
  console.log('Config split: harness root vs target repo\n');

  const launcher = path.join(harnessDir, 'run-mcp.mjs');
  const tsxCli = path.join(harnessDir, 'node_modules/tsx/dist/cli.mjs');
  assert(fs.existsSync(launcher), `Committed MCP launcher missing: ${launcher}`);
  assert(fs.existsSync(tsxCli), `tsx missing; run npm install in ${harnessDir}`);
  console.log('0. MCP launcher is committed (no dist/index.js required)');

  await withClearedHarnessEnv(async () => {
    const sandbox = loadConfig({ repoRoot: harnessRoot });
    assert(sandbox.profile.name === 'nx-angular', 'Default profile should stay nx-angular');
    assert(
      sandbox.workspaceRoot === path.join(harnessRoot, 'fixtures/nx-angular-sandbox'),
      'Default workspace should be the in-tree sandbox',
    );
    assert(sandbox.repoRoot === harnessRoot, 'repoRoot is the harness checkout');
    assert(sandbox.gitRoot === harnessRoot, 'Sandbox git root is the harness repo');
    assert(
      sandbox.skillsDir === path.join(harnessRoot, 'skills'),
      'Skills live under the harness repo',
    );
    assert(
      workspacePathspec(sandbox) === 'fixtures/nx-angular-sandbox',
      'Sandbox ship pathspec stays scoped to the fixture',
    );
    console.log('1. default sandbox profile — gitRoot === harness root');
  });

  const targetRepo = initTempGitRepo();
  const configPath = path.join(targetRepo, 'nx-angular-private.local.json');
  const examplePath = path.join(
    harnessRoot,
    'harness/profiles/nx-angular-private.example.json',
  );

  try {
    const example = JSON.parse(fs.readFileSync(examplePath, 'utf8')) as Record<string, unknown>;
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          ...example,
          workspaceRoot: targetRepo,
          serveProject: 'web-app',
          testProjects: ['web-app', 'shared-lib'],
          buildProjects: ['web-app'],
        },
        null,
        2,
      ),
    );

    const parsedExample = loadProfileConfigFile(examplePath);
    assert(
      parsedExample.serveProject === '<nx app name>',
      'Example profile should keep placeholder project names',
    );

    await withClearedHarnessEnv(async () => {
      let placeholderThrew = false;
      try {
        loadConfig({
          repoRoot: harnessRoot,
          profile: 'nx-angular-private',
          profileConfigPath: examplePath,
        });
      } catch (error) {
        placeholderThrew =
          error instanceof Error && error.message.includes('example placeholder');
      }
      assert(placeholderThrew, 'Unedited example workspaceRoot should fail before git');
      console.log('2b. placeholder workspaceRoot — rejected before git');
    });

    await withClearedHarnessEnv(async () => {
      const missingDir = path.join(os.tmpdir(), 'harness-missing-workspace');
      const missingConfigPath = path.join(os.tmpdir(), 'harness-missing-workspace.json');
      fs.writeFileSync(
        missingConfigPath,
        JSON.stringify(
          {
            workspaceRoot: missingDir,
            serveProject: 'web-app',
            testProjects: ['web-app'],
            buildProjects: ['web-app'],
            port: 4200,
            baselinesDir: 'visual-baselines',
          },
          null,
          2,
        ),
      );
      let missingThrew = false;
      try {
        loadConfig({
          repoRoot: harnessRoot,
          profile: 'nx-angular-private',
          profileConfigPath: missingConfigPath,
        });
      } catch (error) {
        missingThrew =
          error instanceof Error && error.message.includes('workspaceRoot does not exist');
      } finally {
        fs.rmSync(missingConfigPath, { force: true });
      }
      assert(missingThrew, 'Missing workspace directory should fail with a path error');
      console.log('2c. missing workspace directory — rejected before git');
    });

    await withClearedHarnessEnv(async () => {
      let missingConfigThrew = false;
      try {
        loadConfig({ repoRoot: harnessRoot, profile: 'nx-angular-private' });
      } catch (error) {
        missingConfigThrew = error instanceof Error && error.message.includes('Profile config not found');
      }
      assert(missingConfigThrew, 'Private profile without local JSON should fail loudly');
      console.log('2. nx-angular-private without local JSON — helpful error');
    });

    await withClearedHarnessEnv(async () => {
      process.env.HARNESS_PROFILE = 'does-not-exist';
      let unknownThrew = false;
      try {
        loadConfig({ repoRoot: harnessRoot });
      } catch (error) {
        unknownThrew =
          error instanceof Error && error.message.includes('Unknown profile: does-not-exist');
      }
      assert(unknownThrew, 'Unknown HARNESS_PROFILE should throw');
      console.log('3. unknown profile name — rejected');
    });

    const privateConfig = await withClearedHarnessEnv(() =>
      loadConfig({
        repoRoot: harnessRoot,
        profile: 'nx-angular-private',
        profileConfigPath: configPath,
      }),
    );

    assert(privateConfig.repoRoot === harnessRoot, 'Private profile still loads skills from harness');
    assert(
      privateConfig.skillsDir === path.join(harnessRoot, 'skills'),
      'skillsDir must not follow the target repo',
    );
    assert(privateConfig.workspaceRoot === targetRepo, 'workspaceRoot is the private checkout');
    assert(privateConfig.gitRoot === targetRepo, 'gitRoot is the private repo, not jrfornes/devkit');
    assert(privateConfig.profile.name === 'nx-angular-private', 'Profile name from JSON loader');
    assert(privateConfig.profile.devServer.serveProject === 'web-app', 'serveProject from JSON');
    assert(
      JSON.stringify(privateConfig.profile.testProjects) === JSON.stringify(['web-app', 'shared-lib']),
      'testProjects from JSON',
    );
    assert(
      JSON.stringify(privateConfig.profile.buildProjects) === JSON.stringify(['web-app']),
      'buildProjects from JSON',
    );
    assert(workspacePathspec(privateConfig) === '.', 'Private target is its own git root');
    console.log('4. private profile — harness root and target git are split');

    fs.appendFileSync(path.join(targetRepo, 'README.md'), 'only in target\n');
    const status = await getStatus(privateConfig);
    assert(status.gitRoot === targetRepo, 'status gitRoot is the target');
    assert(status.repoRoot === harnessRoot, 'status still reports harness repoRoot');
    assert(
      status.dirtyFiles.some((file) => file.includes('README.md')),
      'status sees target dirty files',
    );
    assert(
      !status.dirtyFiles.some((file) => file.includes('harness/src')),
      'status must not list harness-repo files',
    );

    const diff = await getDiff(privateConfig);
    assert(diff.includes('only in target'), 'get_diff reads the target repo');
    assert(!diff.includes('createNxAngularProfile'), 'get_diff must not leak harness-repo diffs');
    console.log('5. status / get_diff git against the target, skills stay in harness');

    const workspaceOnly = await withClearedHarnessEnv(() =>
      loadConfig({
        repoRoot: harnessRoot,
        workspaceRoot: targetRepo,
      }),
    );
    assert(
      workspaceOnly.profile.name === 'nx-angular',
      'HARNESS_WORKSPACE alone should not switch profiles',
    );
    assert(workspaceOnly.gitRoot === targetRepo, 'HARNESS_WORKSPACE still moves git to the target');
    assert(
      workspaceOnly.skillsDir === path.join(harnessRoot, 'skills'),
      'Setting only HARNESS_WORKSPACE must not steal skills from the harness',
    );
    console.log('6. HARNESS_WORKSPACE override — git follows the target, skills do not');
  } finally {
    fs.rmSync(targetRepo, { recursive: true, force: true });
  }

  console.log('\nConfig split tests passed.');
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
