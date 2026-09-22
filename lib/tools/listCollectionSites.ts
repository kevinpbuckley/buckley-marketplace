import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listCollectionSites',
  description: 'List all sites within a collection. Use this to analyze multisite setup and content sharing patterns (Section 4.6.7).',
  category: 'XMC SDK',
  inputSchema: z.object({
    collectionId: z.string().describe('The ID of the collection'),
  }),
  examples: [
    {
      input: { collectionId: 'collection-123' },
      output: {
        collectionId: 'collection-123',
        sites: [
          { id: 'site-1', name: 'US Site' },
          { id: 'site-2', name: 'UK Site' },
        ],
        count: 2,
      },
      description: 'Returns all sites in a collection',
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
    const response = await context.client.query("xmc.sites.listCollectionSites", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { collectionId: collectionId },
      },
    });

    const sites = response.data?.data ?? [];

    return {
      success: true,
      output: {
        collectionId: collectionId,
        sites: sites.map((site) => ({
          id: site.id ?? '',
          name: site.name ?? '',
          displayName: site.displayName ?? '',
        })),
        count: sites.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to list collection sites',
    };
  }
};
