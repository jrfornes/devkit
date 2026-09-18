import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { HarnessConfig } from './types.js';
import { nxAngularProfile } from './profiles/nx-angular.js';
import { createPrivateNxAngularProfile } from './profiles/nx-angular-private.js';
import {
  loadProfileConfigFile,
  resolveProfileConfigPath,
} from './profiles/load-profile-config.js';
import { applyHostPath, assertWorkspaceReady } from './host-env.js';
import { resolveGitRoot } from './ship/git.js';

applyHostPath();

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(moduleDir, '../..');

export const PROFILE_NAMES = ['nx-angular', 'nx-angular-private'] as const;
export type ProfileName = (typeof PROFILE_NAMES)[number];

export function loadConfig(options?: {
  repoRoot?: string;
  workspaceRoot?: string;
  gitRoot?: string;
  profile?: ProfileName;
  profileConfigPath?: string;
}): HarnessConfig {
  const repoRoot = path.resolve(
    options?.repoRoot ?? process.env.HARNESS_REPO_ROOT ?? defaultRepoRoot,
  );

  const profileName =
    parseProfileName(options?.profile ?? process.env.HARNESS_PROFILE) ?? 'nx-angular';

  let workspaceRoot: string;
  let profile = nxAngularProfile;

  if (profileName === 'nx-angular-private') {
    const configPath = resolveProfileConfigPath(
      repoRoot,
      profileName,
      options?.profileConfigPath ?? process.env.HARNESS_PROFILE_CONFIG,
    );
    const fileConfig = loadProfileConfigFile(configPath);
    profile = createPrivateNxAngularProfile(fileConfig);
    workspaceRoot = path.resolve(
      options?.workspaceRoot ?? process.env.HARNESS_WORKSPACE ?? fileConfig.workspaceRoot,
    );
  } else {
    workspaceRoot = path.resolve(
      options?.workspaceRoot ??
        process.env.HARNESS_WORKSPACE ??
        path.join(repoRoot, 'fixtures/nx-angular-sandbox'),
    );
  }

  assertWorkspaceReady(workspaceRoot);

  const gitRoot = path.resolve(
    options?.gitRoot ?? process.env.HARNESS_GIT_ROOT ?? resolveGitRoot(workspaceRoot),
  );

  return {
    repoRoot,
    workspaceRoot,
    gitRoot,
    profile,
    skillsDir: path.join(repoRoot, 'skills'),
  };
}

function parseProfileName(value: string | undefined): ProfileName | undefined {
  if (!value) {
    return undefined;
  }
  if (value === 'nx-angular' || value === 'nx-angular-private') {
    return value;
  }
  throw new Error(
    `Unknown profile: ${value}. Known profiles: ${PROFILE_NAMES.join(', ')}.`,
  );
}
