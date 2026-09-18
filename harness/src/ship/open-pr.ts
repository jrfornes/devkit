import path from 'node:path';
import type { HarnessConfig, OpenPrOptions, OpenPrResult } from '../types.js';
import {
  checkoutBranch,
  commit,
  createBranch,
  getCurrentBranch,
  getDirtyFiles,
  push,
  stagePaths,
} from './git.js';
import { buildOpenPrOptions, loadPullRequestProvider } from './pr.js';

export async function openPullRequest(
  config: HarnessConfig,
  input: OpenPrOptions,
): Promise<OpenPrResult> {
  const options = buildOpenPrOptions(input, config.profile.defaultBaseBranch);
  const workspaceRelative = path.relative(config.repoRoot, config.workspaceRoot) || '.';
  const dirtyFiles = await getDirtyFiles(config.repoRoot, workspaceRelative);

  if (dirtyFiles.length === 0) {
    return {
      success: false,
      error: `No changes under workspace path ${workspaceRelative} to commit.`,
    };
  }

  const originalBranch = await getCurrentBranch(config.repoRoot);

  try {
    await createBranch(config.repoRoot, options.branchName);
    await stagePaths(config.repoRoot, dirtyFiles);
    const commitSha = await commit(config.repoRoot, options.commitMessage);
    await push(config.repoRoot, options.branchName);

    const provider = await loadPullRequestProvider();
    const result = await provider.createPullRequest({
      repoRoot: config.repoRoot,
      branch: options.branchName,
      baseBranch: options.baseBranch,
      title: options.title,
      body: options.body,
      draft: options.draft,
    });

    return {
      ...result,
      commitSha: result.commitSha ?? commitSha,
      branch: options.branchName,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      branch: options.branchName,
    };
  } finally {
    await checkoutBranch(config.repoRoot, originalBranch).catch(() => undefined);
  }
}
