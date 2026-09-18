import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

export const profileConfigSchema = z.object({
  workspaceRoot: z.string().min(1),
  serveProject: z.string().min(1),
  testProjects: z.array(z.string().min(1)).optional(),
  buildProjects: z.array(z.string().min(1)).optional(),
  lintProjects: z.array(z.string().min(1)).optional(),
  port: z.number().int().positive().default(4200),
  baselinesDir: z.string().min(1).default('visual-baselines'),
  defaultBaseBranch: z.string().min(1).optional(),
});

export type ProfileConfigFile = z.infer<typeof profileConfigSchema>;

export function resolveProfileConfigPath(
  repoRoot: string,
  profileName: string,
  explicitPath?: string,
): string {
  if (explicitPath) {
    return path.resolve(explicitPath);
  }

  return path.join(repoRoot, 'harness/profiles', `${profileName}.local.json`);
}

export function loadProfileConfigFile(configPath: string): ProfileConfigFile {
  if (!fs.existsSync(configPath)) {
    throw new Error(
      `Profile config not found: ${configPath}\n` +
        'Copy harness/profiles/nx-angular-private.example.json to ' +
        'harness/profiles/nx-angular-private.local.json (gitignored) and fill in ' +
        'workspaceRoot plus the real nx project names from `nx show projects`.',
    );
  }

  const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as unknown;
  const parsed = profileConfigSchema.parse(raw);
  return {
    ...parsed,
    workspaceRoot: path.resolve(path.dirname(configPath), parsed.workspaceRoot),
  };
}
