import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listConditionTemplates',
  description: 'Get all available condition templates for personalization. Use this to review what personalization conditions are available.',
  category: 'XMC SDK',
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        templates: [
          { id: 'cond-1', name: 'Visitor from Country' },
          { id: 'cond-2', name: 'Has visited page' },
          { id: 'cond-3', name: 'Device type' },
        ],
        count: 3,
      },
      description: 'Returns available personalization condition templates',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (_input, context) => {
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.personalizationGetConditionTemplates", {
      params: {
        query: { sitecoreContextId: context.contextId },
      },
    });

    const templates = response.data?.data ?? [];

    return {
      success: true,
      output: {
        templates,
        count: templates.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch condition templates',
    };
  }
};
