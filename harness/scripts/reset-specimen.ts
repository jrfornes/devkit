import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../src/config.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = loadConfig({ repoRoot });
const workspaceRoot = config.workspaceRoot;

const paths = {
  calculateTotal: path.join(workspaceRoot, 'libs/shared-data/src/lib/calculate-total.ts'),
  itemFilter: path.join(workspaceRoot, 'libs/shared-data/src/lib/item-filter.ts'),
  sortItems: path.join(workspaceRoot, 'libs/shared-data/src/lib/sort-items.ts'),
  lintSpecimen: path.join(workspaceRoot, 'libs/shared-data/src/lib/lint-specimen.ts'),
  catalogBannerHtml: path.join(
    workspaceRoot,
    'apps/demo/src/app/catalog-banner/catalog-banner.html',
  ),
  packageJson: path.join(workspaceRoot, 'package.json'),
};

const states = {
  calculateTotal: {
    good: `export interface PricedItem {
  price: number;
}

/**
 * Sum item prices. Used by catalog pricing smoke tests.
 */
export function calculateTotal(items: PricedItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
`,
    buggy: `export interface PricedItem {
  price: number;
}

/**
 * Sum item prices. Used by catalog pricing smoke tests.
 */
export function calculateTotal(items: PricedItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0) + 1;
}
`,
  },
  itemFilter: {
    good: "return items.filter((item) => item.active !== false);",
    buggy: "return items.filter((item) => item.active === true);",
  },
  sortItems: {
    good: `  return [...items].sort(
    (a, b) => b.priority - a.priority || a.id.localeCompare(b.id),
  );`,
    buggy: `  return [...items].sort((a, b) => b.priority - a.priority);`,
  },
  lintSpecimen: {
    good: `/**
 * Helper used by lint specimen acceptance checks.
 */
export function lintSpecimenLabel(): string {
  return 'lint-specimen';
}
`,
    buggy: `import { CatalogItem } from './item-filter';

/**
 * Helper used by lint specimen acceptance checks.
 */
export function lintSpecimenLabel(): string {
  return 'lint-specimen';
}
`,
  },
  catalogBannerHtml: {
    good: `<section class="banner" data-testid="catalog-banner">
  <p class="eyebrow">Storefront</p>
  <h1>Active Catalog</h1>
  <p class="subtitle">{{ activeCount() }} items available</p>
</section>
`,
    buggy: `<section class="banner" data-testid="catalog-banner">
  <p class="eyebrow">Storefront</p>
  <h1>{{ brokenBannerTitle() }}</h1>
  <p class="subtitle">{{ activeCount() }} items available</p>
</section>
`,
  },
  packageJson: {
    goodRxjs: '~7.8.0',
    buggyRxjs: '7.5.0',
  },
};

type SpecimenId = 'A' | 'B' | 'C' | 'D' | 'E' | 'dep' | 'good';

function writeFile(filePath: string, contents: string) {
  fs.writeFileSync(filePath, contents, 'utf8');
}

function setCalculateTotal(mode: 'good' | 'buggy') {
  writeFile(paths.calculateTotal, states.calculateTotal[mode]);
}

function setItemFilter(mode: 'good' | 'buggy') {
  const contents = fs.readFileSync(paths.itemFilter, 'utf8');
  const next = contents.replace(states.itemFilter.good, states.itemFilter.buggy);
  if (mode === 'good') {
    writeFile(paths.itemFilter, contents.replace(states.itemFilter.buggy, states.itemFilter.good));
    return;
  }
  if (next === contents) {
    throw new Error('item-filter.ts is not in a recognized state.');
  }
  writeFile(paths.itemFilter, next);
}

function setSortItems(mode: 'good' | 'buggy') {
  const contents = fs.readFileSync(paths.sortItems, 'utf8');
  if (mode === 'good') {
    writeFile(paths.sortItems, contents.replace(states.sortItems.buggy, states.sortItems.good));
    return;
  }
  const next = contents.replace(states.sortItems.good, states.sortItems.buggy);
  if (next === contents) {
    throw new Error('sort-items.ts is not in a recognized state.');
  }
  writeFile(paths.sortItems, next);
}

function setLintSpecimen(mode: 'good' | 'buggy') {
  writeFile(paths.lintSpecimen, states.lintSpecimen[mode]);
}

function setCatalogBannerHtml(mode: 'good' | 'buggy') {
  writeFile(paths.catalogBannerHtml, states.catalogBannerHtml[mode]);
}

function setPackageJsonRxjs(mode: 'good' | 'buggy') {
  const packageJson = JSON.parse(fs.readFileSync(paths.packageJson, 'utf8')) as {
    dependencies: Record<string, string>;
  };
  packageJson.dependencies.rxjs =
    mode === 'good' ? states.packageJson.goodRxjs : states.packageJson.buggyRxjs;
  writeFile(paths.packageJson, `${JSON.stringify(packageJson, null, 2)}\n`);
}

function restoreGood() {
  setCalculateTotal('good');
  setItemFilter('good');
  setSortItems('good');
  setLintSpecimen('good');
  setCatalogBannerHtml('good');
  setPackageJsonRxjs('good');
}

function seedSpecimen(id: SpecimenId) {
  restoreGood();
  switch (id) {
    case 'A':
      setCalculateTotal('buggy');
      break;
    case 'B':
      setItemFilter('buggy');
      break;
    case 'C':
      setSortItems('buggy');
      break;
    case 'D':
      setLintSpecimen('buggy');
      break;
    case 'E':
      setCatalogBannerHtml('buggy');
      break;
    case 'dep':
      setPackageJsonRxjs('buggy');
      break;
    case 'good':
      break;
    default:
      throw new Error(`Unknown specimen: ${id}`);
  }
}

function printUsage() {
  console.log(`Usage: reset-specimen.ts <A|B|C|D|E|dep|good>

Resets the nx-angular sandbox to a known specimen state.
Workspace: ${workspaceRoot}
`);
}

const specimenArg = process.argv[2]?.toUpperCase() as SpecimenId | undefined;
const normalized =
  process.argv[2]?.toLowerCase() === 'dep'
    ? 'dep'
    : process.argv[2]?.toLowerCase() === 'good'
      ? 'good'
      : specimenArg;

if (!normalized || !['A', 'B', 'C', 'D', 'E', 'dep', 'good'].includes(normalized)) {
  printUsage();
  process.exit(1);
}

try {
  seedSpecimen(normalized);
  console.log(`✅ Sandbox set to specimen: ${normalized}`);
} catch (error) {
  console.error('❌ Failed to reset specimen');
  console.error(error);
  process.exit(1);
}
