import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { register } from 'tsx/esm/api';
import type { SkillContext, SkillResult } from '../types.js';
import {
  parseSkillFrontmatter,
  type SkillMetadata,
} from './schema.js';

export type SkillRunner = (ctx: SkillContext) => Promise<SkillResult>;

interface SkillCacheEntry {
  mtimeMs: number;
  metadata: SkillMetadata;
  runner: SkillRunner;
}

let tsxRegistered = false;

function ensureTsxRegistered(): void {
  if (tsxRegistered) {
    return;
  }
  register();
  tsxRegistered = true;
}

const skillCache = new Map<string, SkillCacheEntry>();

function isSkillDirectory(name: string): boolean {
  return !name.startsWith('_') && !name.startsWith('.');
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveRunModulePath(skillDir: string): Promise<string> {
  const runTs = path.join(skillDir, 'run.ts');
  if (await fileExists(runTs)) {
    return runTs;
  }

  const runJs = path.join(skillDir, 'run.js');
  if (await fileExists(runJs)) {
    return runJs;
  }

  throw new Error(`Skill at ${skillDir} is missing run.ts or run.js`);
}

async function loadSkillMetadata(
  skillsDir: string,
  dirName: string,
): Promise<SkillMetadata> {
  const skillDir = path.join(skillsDir, dirName);
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  const content = await fs.readFile(skillMdPath, 'utf8');
  const frontmatter = parseSkillFrontmatter(content, skillDir);

  if (frontmatter.name !== dirName) {
    throw new Error(
      `Skill folder "${dirName}" frontmatter name "${frontmatter.name}" must match folder name`,
    );
  }

  return {
    name: frontmatter.name,
    description: frontmatter.description,
    triggers: frontmatter.triggers,
    oracle: frontmatter.oracle,
    documentationPath: path.join('skills', dirName, 'SKILL.md'),
    skillDir,
  };
}

async function loadSkillRunner(skillDir: string): Promise<SkillRunner> {
  const modulePath = await resolveRunModulePath(skillDir);
  if (modulePath.endsWith('.ts')) {
    ensureTsxRegistered();
  }

  const module = await import(pathToFileURL(modulePath).href);
  if (typeof module.run !== 'function') {
    throw new Error(
      `Skill at ${skillDir} must export async function run(ctx: SkillContext): SkillResult`,
    );
  }

  return module.run as SkillRunner;
}

export async function discoverSkills(skillsDir: string): Promise<SkillMetadata[]> {
  const entries = await fs.readdir(skillsDir, { withFileTypes: true });
  const skillDirs = entries
    .filter((entry) => entry.isDirectory() && isSkillDirectory(entry.name))
    .map((entry) => entry.name)
    .sort();

  const skills: SkillMetadata[] = [];
  for (const dirName of skillDirs) {
    const skillDir = path.join(skillsDir, dirName);
    const hasSkillMd = await fileExists(path.join(skillDir, 'SKILL.md'));
    const hasRunModule =
      (await fileExists(path.join(skillDir, 'run.ts'))) ||
      (await fileExists(path.join(skillDir, 'run.js')));

    if (!hasSkillMd || !hasRunModule) {
      continue;
    }

    skills.push(await loadSkillMetadata(skillsDir, dirName));
  }

  return skills;
}

export async function listSkillSummaries(
  skillsDir: string,
): Promise<
  Array<{
    name: string;
    description: string;
    triggers?: string[];
    oracle?: string[];
    documentationPath: string;
  }>
> {
  const skills = await discoverSkills(skillsDir);
  return skills.map(({ name, description, triggers, oracle, documentationPath }) => ({
    name,
    description,
    ...(triggers ? { triggers } : {}),
    ...(oracle ? { oracle } : {}),
    documentationPath,
  }));
}

export async function getSkill(
  skillsDir: string,
  name: string,
): Promise<{ metadata: SkillMetadata; runner: SkillRunner }> {
  const skillDir = path.join(skillsDir, name);
  if (!(await directoryExists(skillDir))) {
    throw new SkillNotFoundError(name, await listSkillSummaries(skillsDir));
  }

  const runPath = await resolveRunModulePath(skillDir);
  const stat = await fs.stat(runPath);
  const cached = skillCache.get(name);

  if (cached && cached.mtimeMs === stat.mtimeMs) {
    return { metadata: cached.metadata, runner: cached.runner };
  }

  const metadata = await loadSkillMetadata(skillsDir, name);
  const runner = await loadSkillRunner(skillDir);
  skillCache.set(name, { mtimeMs: stat.mtimeMs, metadata, runner });
  return { metadata, runner };
}

export class SkillNotFoundError extends Error {
  readonly availableSkills: Awaited<ReturnType<typeof listSkillSummaries>>;

  constructor(
    name: string,
    availableSkills: Awaited<ReturnType<typeof listSkillSummaries>>,
  ) {
    const names = availableSkills.map((skill) => skill.name).join(', ');
    super(
      names
        ? `Unknown skill: ${name}. Available skills: ${names}`
        : `Unknown skill: ${name}. No skills are currently loaded.`,
    );
    this.name = 'SkillNotFoundError';
    this.availableSkills = availableSkills;
  }
}

export function clearSkillCache(): void {
  skillCache.clear();
}
