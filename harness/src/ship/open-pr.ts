import type { HarnessConfig, OpenPrOptions, OpenPrResult } from '../types.js';
import { workspacePathspec } from '../workspace.js';
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
  const gitRoot = config.gitRoot;
  const workspaceRelative = workspacePathspec(config);
  const dirtyFiles = await getDirtyFiles(gitRoot, workspaceRelative);

  if (dirtyFiles.length === 0) {
    return {
      success: false,
      error: `No changes under workspace path ${workspaceRelative} to commit.`,
    };
  }

  const originalBranch = await getCurrentBranch(gitRoot);

  try {
    await createBranch(gitRoot, options.branchName);
    await stagePaths(gitRoot, dirtyFiles);
    const commitSha = await commit(gitRoot, options.commitMessage);
    await push(gitRoot, options.branchName);

    const provider = await loadPullRequestProvider();
    const result = await provider.createPullRequest({
      repoRoot: gitRoot,
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
    await checkoutBranch(gitRoot, originalBranch).catch(() => undefined);
  }
}
