import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HarnessConfig } from './types.js';
import { nxAngularProfile } from './profiles/nx-angular.js';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(moduleDir, '../..');

const profiles = {
  'nx-angular': nxAngularProfile,
} as const;

export type ProfileName = keyof typeof profiles;

export function loadConfig(options?: {
  repoRoot?: string;
  workspaceRoot?: string;
  profile?: ProfileName;
}): HarnessConfig {
  const repoRoot = path.resolve(
    options?.repoRoot ?? process.env.HARNESS_REPO_ROOT ?? defaultRepoRoot,
  );

  const workspaceRoot = path.resolve(
    options?.workspaceRoot ??
      process.env.HARNESS_WORKSPACE ??
      path.join(repoRoot, 'fixtures/nx-angular-sandbox'),
  );

  const profileName =
    options?.profile ??
    (process.env.HARNESS_PROFILE as ProfileName | undefined) ??
    'nx-angular';

  const profile = profiles[profileName];
  if (!profile) {
    throw new Error(`Unknown profile: ${profileName}`);
  }

  return {
    repoRoot,
    workspaceRoot,
    profile,
    skillsDir: path.join(repoRoot, 'skills'),
  };
}
