import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getContentItem',
  description: 'Get a content item by its ID including all fields, template info, workflow state, and children. Use this to inspect any Sitecore item, check field values, or analyze templates.',
  category: 'XMC SDK',
  inputSchema: z.object({
    itemId: z.string().describe('The ID of the content item to retrieve'),
    language: z.string().optional().describe('Language code (e.g., "en"). Defaults to default language.'),
  }),
  examples: [
    {
      input: { itemId: '{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}' },
      output: {
        item: {
          itemId: '{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}',
          name: 'Home',
          path: '/sitecore/content/Site/Home',
          template: { templateId: '{...}', name: 'Page' },
          fields: { Title: 'Welcome', Description: 'Home page' },
        },
      },
      description: 'Returns the content item with all its data',
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
    const response = await context.client.query("xmc.agent.contentGetContentItemById", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          language: language,
        },
        path: { itemId: itemId },
      },
    });

    const item = response.data?.data;
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    return {
      success: true,
      output: { item },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch content item',
    };
  }
};
