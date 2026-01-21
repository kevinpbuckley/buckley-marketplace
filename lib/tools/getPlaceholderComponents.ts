import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPlaceholderComponents',
  description: 'Get a list of components allowed in a specific placeholder on a page. Use this to review placeholder configuration and component restrictions.',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page'),
    placeholder: z.string().describe('The placeholder key (e.g., "main", "sidebar"). Use "*" to get all components.'),
  }),
  examples: [
    {
      input: { pageId: 'page-123', placeholder: 'main' },
      output: {
        allowedComponents: [
          { id: 'comp-1', name: 'Rich Text' },
          { id: 'comp-2', name: 'Image' },
          { id: 'comp-3', name: 'Container' },
        ],
        count: 3,
      },
      description: 'Returns components allowed in the placeholder',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, placeholder } = input as { pageId: string; placeholder: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.pagesGetAllowedComponentsByPlaceholder", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
        },
        path: { pageId: pageId, placeholderName: placeholder },
      },
    });

    const components = response.data?.data ?? [];

    return {
      success: true,
      output: {
        allowedComponents: components.map((comp) => ({
          id: comp.id ?? '',
          name: comp.name ?? '',
        })),
        count: components.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch placeholder components',
    };
  }
};
