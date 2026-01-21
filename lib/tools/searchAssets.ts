import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'searchAssets',
  description: 'Search for digital assets (images, files) based on query terms, file types, or tags. Use this to find media items.',
  category: 'XMC SDK',
  inputSchema: z.object({
    query: z.string().optional().describe('Search query for asset name or tags'),
    fileType: z.string().optional().describe('Filter by file type (e.g., "image", "pdf")'),
  }),
  examples: [
    {
      input: { query: 'hero' },
      output: {
        assets: [
          { id: 'asset-1', name: 'hero-banner.jpg', type: 'image' },
          { id: 'asset-2', name: 'hero-background.png', type: 'image' },
        ],
        count: 2,
      },
      description: 'Returns matching assets',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { query, fileType } = input as { query?: string; fileType?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.assetsSearchAssets", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          query: query,
          type: fileType,
        },
      },
    });

    const assets = response.data?.data ?? [];

    return {
      success: true,
      output: {
        assets,
        count: assets.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to search assets',
    };
  }
};
