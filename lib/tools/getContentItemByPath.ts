import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getContentItemByPath',
  description: 'Get a content item by its path including all fields, template info, workflow state, and children. Use this to inspect items when you know the path but not the ID.',
  category: 'XMC SDK',
  inputSchema: z.object({
    path: z.string().describe('The path to the content item (e.g., "/sitecore/content/Site/Home")'),
    language: z.string().optional().describe('Language code (e.g., "en"). Defaults to default language.'),
  }),
  examples: [
    {
      input: { path: '/sitecore/content/Site/Home' },
      output: {
        item: {
          itemId: '{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}',
          name: 'Home',
          path: '/sitecore/content/Site/Home',
          template: { templateId: '{...}', name: 'Page' },
          fields: { Title: 'Welcome' },
        },
      },
      description: 'Returns the content item at the specified path',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { path, language } = input as { path: string; language?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.contentGetContentItemByPath", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          language: language,
          item_path: path,
        },
      },
    });

    const item = response.data?.data;
    if (!item) {
      return { success: false, error: 'Item not found at path' };
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
