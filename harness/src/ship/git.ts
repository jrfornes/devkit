import { execFile, execFileSync } from 'node:child_process';
import { promisify } from 'node:util';

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

async function git(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 10 * 1024 * 1024,
    });
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
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      encoding: 'utf8',
    }).trim();
  } catch (error) {
    const details =
      error instanceof Error ? error.message : 'git rev-parse --show-toplevel failed';
    throw new Error(
      `Workspace is not inside a git repository: ${cwd}. ${details}`,
    );
  }
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
