import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listSiteTemplates',
  description: 'Get site templates available in the environment that can be used for creating sites. Use this to review available site templates.',
  category: 'XMC SDK',
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        templates: [
          { id: 'tmpl-1', name: 'Corporate Site' },
          { id: 'tmpl-2', name: 'Marketing Site' },
          { id: 'tmpl-3', name: 'Blog' },
        ],
        count: 3,
      },
      description: 'Returns available site templates',
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
    const response = await context.client.query("xmc.sites.listSiteTemplates", {
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
      error: err instanceof Error ? err.message : 'Failed to fetch site templates',
    };
  }
};
