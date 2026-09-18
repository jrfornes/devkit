export interface CommandResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
}

export interface DevServerConfig {
  serveProject: string;
  port: number;
  baselinesDir: string;
}

export interface ProjectProfile {
  name: string;
  devServer: DevServerConfig;
  runTests: (workspaceRoot: string, project?: string) => Promise<CommandResult>;
  runBuild: (workspaceRoot: string, project?: string) => Promise<CommandResult>;
  lint: (workspaceRoot: string) => Promise<CommandResult>;
  devServerUrl: (port?: number) => string;
  routeToBaselineName: (route: string) => string;
  testProjects?: string[];
  buildProjects?: string[];
  lintProjects?: string[];
  defaultBaseBranch?: string;
}

export interface HarnessConfig {
  /** Harness checkout: `skills/`, MCP server, profiles. Not the target app. */
  repoRoot: string;
  /** Target nx workspace: tests, lint, build, eyes, baselines. */
  workspaceRoot: string;
  /** Git repo that contains `workspaceRoot` — used by status / diff / open_pr / ci_status. */
  gitRoot: string;
  profile: ProjectProfile;
  skillsDir: string;
}

export interface SkillContext {
  config: HarnessConfig;
  runCommand: (
    cwd: string,
    command: string,
    args: string[],
  ) => Promise<CommandResult>;
}

export interface SkillResult {
  success: boolean;
  summary: string;
  details?: string;
  filesChanged?: string[];
}

export interface ImagePayload {
  data: string;
  mimeType: 'image/png';
}

export interface ScreenshotResult {
  route: string;
  url: string;
  image: ImagePayload;
}

export interface VisualDiffResult {
  route: string;
  url: string;
  baselinePath: string;
  passed: boolean;
  diffPixels: number;
  totalPixels: number;
  diffRatio: number;
  screenshot: ImagePayload;
  diffImage: ImagePayload | null;
}

export interface DevServerStatus {
  running: boolean;
  url: string | null;
  port: number | null;
  project: string | null;
  pid: number | null;
}

export interface OpenPrOptions {
  title: string;
  body?: string;
  draft?: boolean;
  baseBranch?: string;
  branchName?: string;
  commitMessage?: string;
}

export interface OpenPrResult {
  success: boolean;
  prUrl?: string;
  branch?: string;
  commitSha?: string;
  error?: string;
}

export interface CiCheck {
  name: string;
  status: 'pending' | 'success' | 'failure' | 'skipped';
  url?: string;
}

export interface CiStatusResult {
  state: 'pending' | 'success' | 'failure';
  checks: CiCheck[];
  prUrl?: string;
  headSha?: string;
  branch?: string;
}
