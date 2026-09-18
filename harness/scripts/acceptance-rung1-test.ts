import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';
import { createToolHandlers } from '../src/tools.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = loadConfig({ repoRoot });
const tools = createToolHandlers(config);

interface SpecimenCase {
  id: string;
  skill: string;
  oracle: 'run_tests' | 'lint' | 'run_build';
  /** Files that must differ from HEAD after seeding the specimen bug. */
  seededFiles?: string[];
  /** Files reported changed by the skill after healing. */
  expectedFiles: string[];
}

const specimens: SpecimenCase[] = [
  {
    id: 'A',
    skill: 'heal-failing-test',
    oracle: 'run_tests',
    expectedFiles: ['libs/shared-data/src/lib/calculate-total.ts'],
  },
  {
    id: 'B',
    skill: 'heal-failing-test',
    oracle: 'run_tests',
    expectedFiles: ['libs/shared-data/src/lib/item-filter.ts'],
  },
  {
    id: 'C',
    skill: 'heal-failing-test',
    oracle: 'run_tests',
    expectedFiles: ['libs/shared-data/src/lib/sort-items.ts'],
  },
  {
    id: 'D',
    skill: 'heal-lint-error',
    oracle: 'lint',
    expectedFiles: ['libs/shared-data/src/lib/lint-specimen.ts'],
  },
  {
    id: 'E',
    skill: 'heal-build-error',
    oracle: 'run_build',
    expectedFiles: ['apps/demo/src/app/catalog-banner/catalog-banner.html'],
  },
  {
    id: 'dep',
    skill: 'bump-dependency',
    oracle: 'run_tests',
    seededFiles: ['package.json'],
    expectedFiles: ['package.json', 'package-lock.json'],
  },
];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function resetSpecimen(id: string) {
  execFileSync('tsx', ['harness/scripts/reset-specimen.ts', id], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

function restoreGood() {
  execFileSync('tsx', ['harness/scripts/reset-specimen.ts', 'good'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
}

function relativeChangedFiles(): string[] {
  return execFileSync(
    'git',
    ['diff', '--name-only', '--', path.relative(repoRoot, config.workspaceRoot)],
    { cwd: repoRoot, encoding: 'utf8' },
  )
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((file) => file.replace(/^fixtures\/nx-angular-sandbox\//, ''));
}

async function runOracle(oracle: SpecimenCase['oracle']): Promise<string> {
  switch (oracle) {
    case 'run_tests':
      return tools.run_tests();
    case 'lint':
      return tools.lint();
    case 'run_build':
      return tools.run_build();
  }
}

async function runSpecimen(specimen: SpecimenCase) {
  console.log(`\n--- Specimen ${specimen.id} (${specimen.skill}) ---\n`);

  resetSpecimen(specimen.id);

  const failing = await runOracle(specimen.oracle);
  assert(failing.includes('success: false'), `[${specimen.id}] Expected oracle failure`);
  console.log(`[${specimen.id}] Oracle fails as expected`);

  const seededFiles = relativeChangedFiles();
  assert(
    seededFiles.length > 0,
    `[${specimen.id}] Expected seeded specimen to change workspace files`,
  );
  const seedExpectations = specimen.seededFiles ?? specimen.expectedFiles;
  for (const expected of seedExpectations) {
    assert(
      seededFiles.some((file) => file.endsWith(expected)),
      `[${specimen.id}] Expected ${expected} in seeded diff, got: ${seededFiles.join(', ')}`,
    );
  }
  const collateralAtSeed = seededFiles.filter(
    (file) => !seedExpectations.some((expected) => file.endsWith(expected)),
  );
  assert(
    collateralAtSeed.length === 0,
    `[${specimen.id}] Unexpected files in seeded diff: ${collateralAtSeed.join(', ')}`,
  );

  const skillResult = await tools.run_skill(specimen.skill);
  console.log(skillResult);
  assert(skillResult.includes('"success": true'), `[${specimen.id}] Expected skill success`);

  const passing = await runOracle(specimen.oracle);
  assert(passing.includes('success: true'), `[${specimen.id}] Expected oracle pass`);

  if (specimen.oracle === 'run_tests' || specimen.id === 'dep') {
    const lint = await tools.lint();
    assert(lint.includes('success: true'), `[${specimen.id}] Expected lint clean after heal`);
  }

  const parsed = JSON.parse(skillResult) as { filesChanged?: string[] };
  assert(Array.isArray(parsed.filesChanged), `[${specimen.id}] Expected filesChanged in skill result`);
  for (const expected of specimen.expectedFiles) {
    assert(
      parsed.filesChanged!.some((file) => file.endsWith(expected)),
      `[${specimen.id}] Expected ${expected} in filesChanged, got: ${parsed.filesChanged!.join(', ')}`,
    );
  }

  console.log(`✅ Specimen ${specimen.id} passed`);
}

async function run() {
  console.log('Acceptance test: M3 Rung 1 breadth (all specimens)\n');

  for (const specimen of specimens) {
    await runSpecimen(specimen);
  }

  console.log('\n✅ All Rung 1 specimens passed');
}

run()
  .then(() => {
    restoreGood();
  })
  .catch((error) => {
    restoreGood();
    console.error('\n❌ Rung 1 acceptance test failed');
    console.error(error);
    process.exit(1);
  });
