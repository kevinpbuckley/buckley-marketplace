import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition } from './types';
import { getSkill, getSkills } from '../skills';

const inputSchema = z.object({
  id: z.string().describe('Skill id from the available skills list, e.g. "brand-compliance-review"'),
});

export const definition: ToolDefinition = {
  name: 'loadSkill',
  description:
    'Load the step-by-step playbook for a skill listed in the system prompt. Call this before starting that kind of task — the playbook has the correct operation keys and the safety rules for it.',
  category: 'Catalog',
  inputSchema,
  clientSide: false,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
  execute: async ({ id }) => {
    const skill = getSkill(id);

    if (!skill) {
      return {
        success: false,
        error: `No skill "${id}".`,
        available: getSkills().map((entry) => ({ id: entry.id, description: entry.description })),
      };
    }

    return { success: true, id: skill.id, name: skill.name, instructions: skill.body };
  },
});
