import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'createContentItem',
  description: 'Create a new content item in Sitecore XM Cloud. Use this when the user wants to create new content.',
  category: 'XMC SDK',
  inputSchema: z.object({
    templateId: z.string().describe('The template ID to use for the new content item'),
    name: z.string().describe('The name of the new content item'),
    parentId: z.string().describe('The parent item ID where the content will be created'),
    language: z.string().optional().describe('The language for the content item (default: en)'),
    fields: z.record(z.string(), z.unknown()).optional().describe('Optional field values for the new content item'),
  }),
  examples: [
    {
      input: {
        templateId: '{76036F5E-CBCE-46D1-AF0A-4143F9B557AA}',
        name: 'New Article',
        parentId: '{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}',
        language: 'en',
        fields: {
          Title: 'My Article Title',
          Text: 'Article content here',
        },
      },
      output: {
        itemId: '{NEW-ITEM-ID}',
        name: 'New Article',
        path: '/sitecore/content/Home/Articles/New Article',
        templateId: '{76036F5E-CBCE-46D1-AF0A-4143F9B557AA}',
        version: 1,
      },
      description: 'Creates a new content item with field values',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { templateId, name, parentId, language, fields } = input as { templateId: string; name: string; parentId: string; language?: string; fields?: Record<string, unknown> };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate("xmc.agent.contentCreateContentItem", {
      params: {
        body: {
          templateId,
          name,
          parentId,
          language: language || 'en',
          fields: fields || null,
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
      error: err instanceof Error ? err.message : 'Failed to create content item',
    };
  }
};
