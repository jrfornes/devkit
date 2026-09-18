import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { getDevServerStatus } from './eyes/dev-server.js';
import type { HarnessConfig } from './types.js';

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return stdout.trimEnd();
}

export async function getStatus(config: HarnessConfig) {
  const cwd = config.repoRoot;
  const branch = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const workspaceRelative = path.relative(config.repoRoot, config.workspaceRoot) || '.';
  const dirty = await git(cwd, ['status', '--porcelain', '--', workspaceRelative]);
  const diffStat = await git(cwd, ['diff', '--stat', '--', workspaceRelative]).catch(
    () => '',
  );

  return {
    profile: config.profile.name,
    branch,
    workspaceRoot: config.workspaceRoot,
    workspaceRelative,
    dirtyFiles: dirty
      .split('\n')
      .filter(Boolean)
      .map((line) => line.slice(3)),
    diffStat: diffStat || '(no changes)',
    devServer: getDevServerStatus(),
  };
}

export async function getDiff(config: HarnessConfig): Promise<string> {
  const workspaceRelative = path.relative(config.repoRoot, config.workspaceRoot) || '.';
  return git(config.repoRoot, ['diff', '--', workspaceRelative]);
}
