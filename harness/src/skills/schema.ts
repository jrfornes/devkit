import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

export const skillFrontmatterSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  triggers: z.array(z.string()).optional(),
  oracle: z.array(z.string()).optional(),
});

export type SkillFrontmatter = z.infer<typeof skillFrontmatterSchema>;

export interface SkillMetadata {
  name: string;
  description: string;
  triggers?: string[];
  oracle?: string[];
  documentationPath: string;
  skillDir: string;
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export function parseSkillFrontmatter(
  content: string,
  skillDir: string,
): SkillFrontmatter {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error(
      `SKILL.md in ${skillDir} must start with YAML frontmatter (--- ... ---)`,
    );
  }

  const raw = parseYaml(match[1]);
  const result = skillFrontmatterSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid frontmatter in ${skillDir}/SKILL.md: ${result.error.message}`,
    );
  }

  return result.data;
}

export function skillBody(content: string): string {
  const match = content.match(FRONTMATTER_RE);
  return match ? match[2].trim() : content.trim();
}
