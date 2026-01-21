import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'updateAsset',
  description: 'Update asset metadata in Sitecore XM Cloud Media Library. Use this when the user wants to modify asset properties like alt text.',
  category: 'XMC SDK',
  inputSchema: z.object({
    assetId: z.string().describe('The ID of the asset to update'),
    fields: z.record(z.string(), z.unknown()).describe('The field values to update'),
    language: z.string().describe('The language version'),
    name: z.string().optional().describe('Optional new name for the asset'),
    altText: z.string().optional().describe('Optional alt text for images'),
  }),
  examples: [
    {
      input: {
        assetId: '{ASSET-ID}',
        fields: {
          Alt: 'Updated alt text',
        },
        language: 'en',
        altText: 'Updated alt text',
      },
      output: {
        itemId: '{ASSET-ID}',
        name: 'example.jpg',
        path: '/sitecore/Media Library/Images/example',
        updatedFields: {
          Alt: 'Updated alt text',
        },
      },
      description: 'Updates asset metadata',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { assetId, fields, language, name, altText } = input as { assetId: string; fields: Record<string, unknown>; language: string; name?: string; altText?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate("xmc.agent.assetsUpdateAsset", {
      params: {
        path: {
          assetId,
        },
        body: {
          fields,
          language,
          name: name || null,
          altText: altText || null,
        },
        query: {
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
      error: err instanceof Error ? err.message : 'Failed to update asset',
    };
  }
};
