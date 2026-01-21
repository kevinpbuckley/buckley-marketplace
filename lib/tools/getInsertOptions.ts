import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getInsertOptions',
  description: 'Get the available insert options (templates that can be created as children) for a specific item. Use this to review insert option configuration.',
  category: 'XMC SDK',
  inputSchema: z.object({
    itemId: z.string().describe('The ID of the parent item to check insert options for'),
  }),
  examples: [
    {
      input: { itemId: '{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}' },
      output: {
        insertOptions: [
          { id: '{...}', name: 'Article Page' },
          { id: '{...}', name: 'Landing Page' },
          { id: '{...}', name: 'Product Page' },
        ],
        count: 3,
      },
      description: 'Returns templates available as insert options',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { itemId } = input as { itemId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.contentListAvailableInsertoptions", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { itemId: itemId },
      },
    });

    const options = response.data?.data ?? [];

    return {
      success: true,
      output: {
        insertOptions: options,
        count: options.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch insert options',
    };
  }
};
