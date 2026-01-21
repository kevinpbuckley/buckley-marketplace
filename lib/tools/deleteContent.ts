import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'deleteContent',
  description: 'Delete a content item from Sitecore XM Cloud. Use this when the user wants to remove content. Use with caution.',
  category: 'XMC SDK',
  inputSchema: z.object({
    itemId: z.string().describe('The ID of the content item to delete'),
    language: z.string().optional().describe('The language version to delete (optional)'),
  }),
  examples: [
    {
      input: {
        itemId: '{ITEM-ID}',
        language: 'en',
      },
      output: {
        success: true,
        deletedId: '{ITEM-ID}',
      },
      description: 'Deletes a content item',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { itemId, language } = input as { itemId: string; language?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate("xmc.agent.contentDeleteContent", {
      params: {
        path: {
          itemId,
        },
        query: {
          language,
          sitecoreContextId: context.contextId,
        },
      },
    });

    return {
      success: true,
      output: response.data,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete content',
    };
  }
};
