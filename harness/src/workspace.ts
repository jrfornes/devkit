import path from 'node:path';
import { runGit } from './ship/git.js';
import { getDevServerStatus } from './eyes/dev-server.js';
import type { HarnessConfig } from './types.js';

export function workspacePathspec(config: HarnessConfig): string {
  const relative = path.relative(config.gitRoot, config.workspaceRoot);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(
      `Workspace ${config.workspaceRoot} is not inside git root ${config.gitRoot}. ` +
        'status / get_diff / open_pr git against the target checkout, not the harness repo.',
    );
  }
  return relative || '.';
}

export async function getStatus(config: HarnessConfig) {
  const cwd = config.gitRoot;
  const branch = await runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const workspaceRelative = workspacePathspec(config);
  const dirty = await runGit(cwd, ['status', '--porcelain', '--', workspaceRelative]);
  const diffStat = await runGit(cwd, ['diff', '--stat', '--', workspaceRelative]).catch(
    () => '',
  );

  return {
    profile: config.profile.name,
    branch,
    repoRoot: config.repoRoot,
    gitRoot: config.gitRoot,
    workspaceRoot: config.workspaceRoot,
    workspaceRelative,
    skillsDir: config.skillsDir,
    dirtyFiles: dirty
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(3)),
    diffStat: diffStat || '(no changes)',
    devServer: getDevServerStatus(),
  };
}

export async function getDiff(config: HarnessConfig): Promise<string> {
  const workspaceRelative = workspacePathspec(config);
  return runGit(config.gitRoot, ['diff', '--', workspaceRelative]);
}
