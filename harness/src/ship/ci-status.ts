import type { CiStatusResult } from '../types.js';
import { loadPullRequestProvider } from './pr.js';

export interface PollCiStatusOptions {
  repoRoot: string;
  branch?: string;
  prUrl?: string;
  timeoutMs?: number;
  intervalMs?: number;
}

export async function getCiStatus(options: {
  repoRoot: string;
  branch?: string;
  prUrl?: string;
}): Promise<CiStatusResult> {
  const provider = await loadPullRequestProvider();
  return provider.getCiStatus(options);
}

export async function pollCiStatus(options: PollCiStatusOptions): Promise<CiStatusResult> {
  const timeoutMs = options.timeoutMs ?? 10 * 60 * 1000;
  const intervalMs = options.intervalMs ?? 15 * 1000;
  const deadline = Date.now() + timeoutMs;
  let latest: CiStatusResult | null = null;

  while (Date.now() < deadline) {
    latest = await getCiStatus({
      repoRoot: options.repoRoot,
      branch: options.branch,
      prUrl: options.prUrl,
    });

    if (latest.state === 'success' || latest.state === 'failure') {
      return latest;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return (
    latest ?? {
      state: 'pending',
      checks: [],
      branch: options.branch,
      prUrl: options.prUrl,
    }
  );
}
