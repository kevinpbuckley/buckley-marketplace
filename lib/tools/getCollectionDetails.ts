import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getCollectionDetails',
  description: 'Get detailed information about a site collection. Use this to understand multisite organization.',
  category: 'XMC SDK',
  inputSchema: z.object({
    collectionId: z.string().describe('The ID of the collection'),
  }),
  examples: [
    {
      input: { collectionId: 'collection-123' },
      output: {
        id: 'collection-123',
        name: 'Corporate Sites',
        siteCount: 5,
      },
      description: 'Returns collection details',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { collectionId } = input as { collectionId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.sites.retrieveCollection", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { collectionId: collectionId },
      },
    });

    const collection = response.data?.data;
    if (!collection) {
      return { success: false, error: 'Collection not found' };
    }

    return {
      success: true,
      output: {
        id: collection.id ?? collectionId,
        name: collection.name ?? '',
        displayName: collection.displayName ?? '',
        collection: collection,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get collection details',
    };
  }
};
