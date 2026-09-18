import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
import { withHostPath } from '../host-env.js';

const execFileAsync = promisify(execFile);

export class GitError extends Error {
  constructor(
    message: string,
    readonly command: string,
    readonly stderr: string,
  ) {
    super(message);
    this.name = 'GitError';
  }
}

let cachedGitBin: string | undefined;

export function resolveGitBinary(): string {
  if (cachedGitBin) {
    return cachedGitBin;
  }

  const env = withHostPath();
  const candidates = [
    process.env.HARNESS_GIT_BIN,
    'git',
    '/opt/homebrew/bin/git',
    '/usr/local/bin/git',
    '/usr/bin/git',
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      if (candidate !== 'git' && !fs.existsSync(candidate)) {
        continue;
      }
      execFileSync(candidate, ['--version'], {
        encoding: 'utf8',
        env,
        timeout: 5000,
      });
      cachedGitBin = candidate;
      return candidate;
    } catch {
      // try the next location
    }
  }

  throw new Error(
    'git executable not found (spawn ENOENT). Cursor MCP often starts with a stripped PATH.\n' +
      'From a normal terminal run `which git`, then in the MCP env set either:\n' +
      '  HARNESS_GIT_BIN=/opt/homebrew/bin/git\n' +
      '  PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin',
  );
}

function gitOptions(cwd: string) {
  return {
    cwd,
    env: withHostPath(),
    maxBuffer: 10 * 1024 * 1024,
  };
}

async function git(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(resolveGitBinary(), args, gitOptions(cwd));
    return stdout.trimEnd();
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & {
      stdout?: string;
      stderr?: string;
    };
    throw new GitError(
      execError.message || 'Git command failed',
      ['git', ...args].join(' '),
      execError.stderr?.trim() || execError.stdout?.trim() || '',
    );
  }
}

export function resolveGitRoot(cwd: string): string {
  try {
    return execFileSync(resolveGitBinary(), ['rev-parse', '--show-toplevel'], {
      ...gitOptions(cwd),
      encoding: 'utf8',
    }).trim();
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      throw new Error(
        `git failed with ENOENT at workspace ${cwd}. ` +
          (fs.existsSync(cwd)
            ? 'git is not on the MCP PATH.'
            : 'That folder does not exist.') +
          ` ${err.message}`,
      );
    }
    const details = error instanceof Error ? error.message : 'git rev-parse --show-toplevel failed';
    throw new Error(`Workspace is not inside a git repository: ${cwd}. ${details}`);
  }
}

export async function runGit(cwd: string, args: string[]): Promise<string> {
  return git(cwd, args);
}

export async function getCurrentBranch(repoRoot: string): Promise<string> {
  return git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
}

export async function getDirtyFiles(repoRoot: string, pathspec: string): Promise<string[]> {
  const output = await git(repoRoot, ['status', '--porcelain', '--', pathspec]);
  return output
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim());
}

export async function createBranch(repoRoot: string, branchName: string): Promise<void> {
  await git(repoRoot, ['checkout', '-b', branchName]);
}

export async function checkoutBranch(repoRoot: string, branchName: string): Promise<void> {
  await git(repoRoot, ['checkout', branchName]);
}

export async function stagePaths(repoRoot: string, paths: string[]): Promise<void> {
  if (paths.length === 0) {
    throw new Error('No paths to stage.');
  }
  await git(repoRoot, ['add', '--', ...paths]);
}

export async function commit(repoRoot: string, message: string): Promise<string> {
  await git(repoRoot, ['commit', '-m', message]);
  return git(repoRoot, ['rev-parse', 'HEAD']);
}

export async function push(repoRoot: string, branchName: string): Promise<void> {
  await git(repoRoot, ['push', '-u', 'origin', branchName]);
}

export async function deleteRemoteBranch(repoRoot: string, branchName: string): Promise<void> {
  await git(repoRoot, ['push', 'origin', '--delete', branchName]).catch(() => undefined);
}

export async function resetHard(repoRoot: string, ref = 'HEAD'): Promise<void> {
  await git(repoRoot, ['reset', '--hard', ref]);
}

export async function cleanUntracked(repoRoot: string, pathspec: string): Promise<void> {
  await git(repoRoot, ['clean', '-fd', '--', pathspec]).catch(() => undefined);
}
