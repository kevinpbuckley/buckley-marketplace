import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'updateContent',
  description: 'Update an existing content item in Sitecore XM Cloud. Use this when the user wants to modify content field values.',
  category: 'XMC SDK',
  inputSchema: z.object({
    itemId: z.string().describe('The ID of the content item to update'),
    fields: z.record(z.string(), z.unknown()).describe('The field values to update'),
    language: z.string().optional().describe('The language version to update (default: en)'),
    createNewVersion: z.boolean().optional().describe('Whether to create a new version (default: false)'),
    siteName: z.string().optional().describe('The site name context'),
  }),
  examples: [
    {
      input: {
        itemId: '{ITEM-ID}',
        fields: {
          Title: 'Updated Title',
          Text: 'Updated content',
        },
        language: 'en',
        createNewVersion: false,
      },
      output: {
        itemId: '{ITEM-ID}',
        name: 'Article Name',
        path: '/sitecore/content/Home/Articles/Article',
        updatedFields: {
          Title: 'Updated Title',
          Text: 'Updated content',
        },
      },
      description: 'Updates field values on an existing content item',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { itemId, fields, language, createNewVersion, siteName } = input as { itemId: string; fields: Record<string, unknown>; language?: string; createNewVersion?: boolean; siteName?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate("xmc.agent.contentUpdateContent", {
      params: {
        path: {
          itemId,
        },
        body: {
          fields,
          language: language || 'en',
          createNewVersion: createNewVersion || false,
          siteName: siteName || null,
        },
        query: {
          sitecoreContextId: context.contextId,
        },
      },
    });

    // Check if response indicates an error
    if (!response.data) {
      const error = (response as any).error;
      return {
        success: false,
        error: error?.message || 'Update failed - no data returned from API',
      };
    }

    return {
      success: true,
      output: response.data,
    };
  } catch (err) {
    console.error('[updateContent] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update content',
    };
  }
};
