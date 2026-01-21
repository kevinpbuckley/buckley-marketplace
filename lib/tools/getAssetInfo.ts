import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getAssetInfo',
  description: 'Get detailed information about a specific digital asset including metadata, file properties, and usage info.',
  category: 'XMC SDK',
  inputSchema: z.object({
    assetId: z.string().describe('The ID of the asset'),
  }),
  examples: [
    {
      input: { assetId: 'asset-123' },
      output: {
        asset: {
          id: 'asset-123',
          name: 'hero-banner.jpg',
          fileSize: 245000,
          dimensions: { width: 1920, height: 1080 },
          usedIn: ['page-1', 'page-2'],
        },
      },
      description: 'Returns asset details and usage',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { assetId } = input as { assetId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.assetsGetAssetInformation", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { assetId: assetId },
      },
    });

    const asset = response.data?.data;
    if (!asset) {
      return { success: false, error: 'Asset not found' };
    }

    return {
      success: true,
      output: { asset },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch asset info',
    };
  }
};
