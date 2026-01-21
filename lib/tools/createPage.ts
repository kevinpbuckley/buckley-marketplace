import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'createPage',
  description: 'Create a new page in Sitecore XM Cloud. Use this when the user wants to create a new page.',
  category: 'XMC SDK',
  inputSchema: z.object({
    templateId: z.string().describe('The template ID to use for the new page'),
    name: z.string().describe('The name of the new page'),
    parentId: z.string().describe('The parent item ID where the page will be created'),
    language: z.string().optional().describe('The language for the page (default: en)'),
  }),
  examples: [
    {
      input: {
        templateId: '{76036F5E-CBCE-46D1-AF0A-4143F9B557AA}',
        name: 'New Page',
        parentId: '{110D559F-DEA5-42EA-9C1C-8A5DF7E70EF9}',
        language: 'en',
      },
      output: {
        itemId: '{NEW-PAGE-ID}',
        name: 'New Page',
      },
      description: 'Creates a new page',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { templateId, name, parentId, language } = input as { templateId: string; name: string; parentId: string; language?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate("xmc.agent.pagesCreatePage", {
      params: {
        body: {
          templateId,
          name,
          parentId,
          language: language || 'en',
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
      error: err instanceof Error ? err.message : 'Failed to create page',
    };
  }
};
