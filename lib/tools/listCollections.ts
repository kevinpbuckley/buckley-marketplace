import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listCollections',
  description: 'Get a list of all site collections in the environment. Use this to review multisite setup and collection organization.',
  category: 'XMC SDK',
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        collections: [
          { id: 'col-1', name: 'Corporate Sites' },
          { id: 'col-2', name: 'Marketing Campaigns' },
        ],
        count: 2,
      },
      description: 'Returns all site collections',
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
    const response = await context.client.query("xmc.xmapp.listCollections", {
      params: {
        query: { sitecoreContextId: context.contextId },
      },
    });

    const collections = response.data?.data ?? [];

    return {
      success: true,
      output: {
        collections: collections.map((col) => ({
          id: col.id ?? '',
          name: col.name ?? '',
          displayName: col.displayName ?? '',
        })),
        count: collections.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch collections',
    };
  }
};
