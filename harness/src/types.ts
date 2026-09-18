export interface CommandResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  command: string;
}

export interface ProjectProfile {
  name: string;
  runTests: (workspaceRoot: string, project?: string) => Promise<CommandResult>;
  lint: (workspaceRoot: string) => Promise<CommandResult>;
}

export interface HarnessConfig {
  repoRoot: string;
  workspaceRoot: string;
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
