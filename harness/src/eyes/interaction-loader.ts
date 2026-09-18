import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { InteractionTestSpec } from './interaction-types.js';

function assertInteractionTestSpec(
  value: unknown,
  specPath: string,
): asserts value is InteractionTestSpec {
  if (!value || typeof value !== 'object') {
    throw new Error(`Interaction test at ${specPath} must export a spec object`);
  }

  const spec = value as Partial<InteractionTestSpec>;
  if (typeof spec.route !== 'string' || spec.route.length === 0) {
    throw new Error(`Interaction test at ${specPath} is missing route`);
  }
  if (!Array.isArray(spec.actions)) {
    throw new Error(`Interaction test at ${specPath} is missing actions[]`);
  }
  if (!Array.isArray(spec.assertions)) {
    throw new Error(`Interaction test at ${specPath} is missing assertions[]`);
  }
}

async function importSpecModule(specPath: string): Promise<unknown> {
  if (specPath.endsWith('.ts')) {
    const { register } = await import('tsx/esm/api');
    register();
  }

  const module = await import(pathToFileURL(specPath).href);
  return module.default ?? module.spec;
}

export async function loadInteractionTest(
  workspaceRoot: string,
  name: string,
): Promise<InteractionTestSpec> {
  const interactionTestsDir = path.join(workspaceRoot, 'interaction-tests');
  const candidates = [
    path.join(interactionTestsDir, `${name}.ts`),
    path.join(interactionTestsDir, `${name}.js`),
  ];

  for (const specPath of candidates) {
    try {
      await fs.access(specPath);
      const exported = await importSpecModule(specPath);
      assertInteractionTestSpec(exported, specPath);
      return exported;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        continue;
      }
      throw error;
    }
  }

  throw new Error(
    `Interaction test "${name}" not found in ${interactionTestsDir} (expected ${name}.ts or ${name}.js)`,
  );
}
