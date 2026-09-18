import type { CiStatusResult, OpenPrOptions, OpenPrResult } from '../types.js';

export interface PullRequestProvider {
  createPullRequest(options: {
    repoRoot: string;
    branch: string;
    baseBranch: string;
    title: string;
    body?: string;
    draft?: boolean;
  }): Promise<OpenPrResult>;

  getCiStatus(options: {
    repoRoot: string;
    branch?: string;
    prUrl?: string;
  }): Promise<CiStatusResult>;
}

export type ForgeName = 'github';

export function getForgeName(): ForgeName {
  const forge = process.env.HARNESS_FORGE ?? 'github';
  if (forge !== 'github') {
    throw new Error(`Unsupported forge: ${forge}. Only github is implemented.`);
  }
  return forge;
}

export async function loadPullRequestProvider(): Promise<PullRequestProvider> {
  getForgeName();
  const { GitHubPullRequestProvider } = await import('./providers/github.js');
  return new GitHubPullRequestProvider();
}

export function resolveBaseBranch(
  profileDefault?: string,
  option?: string,
): string {
  return option ?? profileDefault ?? process.env.HARNESS_BASE_BRANCH ?? 'main';
}

export function resolveBranchName(option?: string): string {
  if (option) {
    return option;
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `harness/ship-${timestamp}`;
}

export function buildOpenPrOptions(
  input: OpenPrOptions,
  profileDefaultBaseBranch?: string,
): Required<Pick<OpenPrOptions, 'title' | 'draft' | 'baseBranch' | 'branchName' | 'commitMessage'>> &
  Pick<OpenPrOptions, 'body'> {
  return {
    title: input.title,
    body: input.body,
    draft: input.draft ?? true,
    baseBranch: resolveBaseBranch(profileDefaultBaseBranch, input.baseBranch),
    branchName: resolveBranchName(input.branchName),
    commitMessage: input.commitMessage ?? input.title,
  };
}
