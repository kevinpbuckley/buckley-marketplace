import 'server-only';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface Skill {
  id: string;
  name: string;
  description: string;
  whenToUse: string;
  body: string;
}

const SKILLS_DIR = join(process.cwd(), 'lib', 'skills');

/** Minimal frontmatter reader — skills are authored in this repo, so no parser dependency. */
function parseSkill(id: string, raw: string): Skill {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) {
    return { id, name: id, description: '', whenToUse: '', body: raw.trim() };
  }

  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^(\w+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].replace(/^["']|["']$/g, '').trim();
  }

  return {
    id,
    name: fields.name || id,
    description: fields.description || '',
    whenToUse: fields.when_to_use || '',
    body: match[2].trim(),
  };
}

let cache: Skill[] | null = null;

export function getSkills(): Skill[] {
  if (cache) return cache;

  try {
    cache = readdirSync(SKILLS_DIR)
      .filter((file) => file.endsWith('.md'))
      .map((file) => parseSkill(file.replace(/\.md$/, ''), readFileSync(join(SKILLS_DIR, file), 'utf-8')))
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    cache = [];
  }

  return cache;
}

export function getSkill(id: string): Skill | undefined {
  return getSkills().find((skill) => skill.id === id);
}

/**
 * Only names and descriptions go in the system prompt; bodies load on demand through the
 * loadSkill tool, so adding a playbook costs a line of context rather than its full text.
 */
export function getSkillsIndex(): string {
  const skills = getSkills();
  if (skills.length === 0) return '';

  const lines = skills.map(
    (skill) => `- **${skill.id}** — ${skill.description}${skill.whenToUse ? ` Use when: ${skill.whenToUse}` : ''}`
  );

  return `## Available skills\n\nStep-by-step playbooks. Call \`loadSkill\` to read one before starting that kind of task.\n\n${lines.join('\n')}`;
}
