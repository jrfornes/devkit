import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CiCheck, CiStatusResult, OpenPrResult } from '../../types.js';
import { withHostPath } from '../../host-env.js';
import type { PullRequestProvider } from '../pr.js';

const execFileAsync = promisify(execFile);

interface GhPullRequestView {
  url: string;
  headRefOid: string;
  headRefName: string;
  statusCheckRollup: Array<{
    name: string;
    status: string;
    conclusion: string | null;
    detailsUrl?: string;
  }> | null;
}

function resolveToken(): string | undefined {
  return process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
}

async function gh(args: string[], cwd: string): Promise<string> {
  const token = resolveToken();
  const env = withHostPath(token ? { ...process.env, GH_TOKEN: token } : process.env);

  try {
    const { stdout } = await execFileAsync('gh', args, {
      cwd,
      env,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    const execError = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string };
    const details = execError.stderr?.trim() || execError.stdout?.trim() || execError.message;
    throw new Error(`gh ${args.join(' ')} failed: ${details}`);
  }
}

async function githubApi<T>(
  repoRoot: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = resolveToken();
  if (!token) {
    throw new Error(
      'GITHUB_TOKEN is required for open_pr and ci_status (repo + pull_requests scopes).',
    );
  }

  const repo = await getRepoSlug(repoRoot);
  const response = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  });

  const body = (await response.json()) as T & { message?: string };
  if (!response.ok) {
    throw new Error(
      body.message ??
        `GitHub API ${init?.method ?? 'GET'} /repos/${repo}/${path} failed (${response.status})`,
    );
  }

  return body;
}

async function getRepoSlug(repoRoot: string): Promise<string> {
  if (process.env.HARNESS_GITHUB_REPO) {
    return process.env.HARNESS_GITHUB_REPO;
  }

  return gh(['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], repoRoot);
}

function mapCheckStatus(
  status: string,
  conclusion: string | null | undefined,
): CiCheck['status'] {
  if (status === 'queued' || status === 'in_progress' || status === 'waiting') {
    return 'pending';
  }
  if (status === 'completed') {
    if (conclusion === 'success' || conclusion === 'neutral') {
      return 'success';
    }
    if (conclusion === 'skipped') {
      return 'skipped';
    }
    return 'failure';
  }
  return 'pending';
}

function aggregateState(checks: CiCheck[]): CiStatusResult['state'] {
  if (checks.some((check) => check.status === 'failure')) {
    return 'failure';
  }
  if (checks.some((check) => check.status === 'pending')) {
    return 'pending';
  }
  if (checks.length === 0) {
    return 'pending';
  }
  return 'success';
}

export class GitHubPullRequestProvider implements PullRequestProvider {
  async createPullRequest(options: {
    repoRoot: string;
    branch: string;
    baseBranch: string;
    title: string;
    body?: string;
    draft?: boolean;
  }): Promise<OpenPrResult> {
    const token = resolveToken();
    if (token) {
      try {
        const pr = await githubApi<{ html_url: string; head: { sha: string } }>(
          options.repoRoot,
          'pulls',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: options.title,
              body: options.body ?? '',
              head: options.branch,
              base: options.baseBranch,
              draft: options.draft ?? true,
            }),
          },
        );

        return {
          success: true,
          prUrl: pr.html_url,
          branch: options.branch,
          commitSha: pr.head.sha,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('Resource not accessible')) {
          throw error;
        }
      }
    }

    const args = [
      'pr',
      'create',
      '--head',
      options.branch,
      '--base',
      options.baseBranch,
      '--title',
      options.title,
    ];

    if (options.body) {
      args.push('--body', options.body);
    }
    if (options.draft ?? true) {
      args.push('--draft');
    }

    const output = await gh(args, options.repoRoot);
    const prUrl = output.split('\n').find((line) => line.startsWith('http')) ?? output;

    const prView = JSON.parse(
      await gh(['pr', 'view', prUrl, '--json', 'headRefOid'], options.repoRoot),
    ) as { headRefOid: string };

    return {
      success: true,
      prUrl,
      branch: options.branch,
      commitSha: prView.headRefOid,
    };
  }

  async getCiStatus(options: {
    repoRoot: string;
    branch?: string;
    prUrl?: string;
  }): Promise<CiStatusResult> {
    const prSelector = options.prUrl ?? options.branch;
    if (!prSelector) {
      throw new Error('ci_status requires branch or prUrl.');
    }

    const pr = JSON.parse(
      await gh(
        [
          'pr',
          'view',
          prSelector,
          '--json',
          'url,headRefOid,headRefName,statusCheckRollup',
        ],
        options.repoRoot,
      ),
    ) as GhPullRequestView;

    const checks: CiCheck[] = (pr.statusCheckRollup ?? []).map((check) => ({
      name: check.name,
      status: mapCheckStatus(check.status, check.conclusion),
      url: check.detailsUrl,
    }));

    return {
      state: aggregateState(checks),
      checks,
      prUrl: pr.url,
      headSha: pr.headRefOid,
      branch: pr.headRefName,
    };
  }

  async closePullRequest(repoRoot: string, prUrl: string): Promise<void> {
    await gh(['pr', 'close', prUrl], repoRoot);
  }
}
