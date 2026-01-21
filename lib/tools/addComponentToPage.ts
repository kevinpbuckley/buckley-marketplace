import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'addComponentToPage',
  description: 'Add a component to a page in Sitecore XM Cloud. Use this when the user wants to add a component to a page.',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page to add the component to'),
    componentRenderingId: z.string().describe('The rendering ID of the component to add'),
    placeholderPath: z.string().describe('The placeholder path where the component should be added'),
    componentItemName: z.string().describe('The name for the component instance'),
    language: z.string().optional().describe('The language version (default: en)'),
    fields: z.record(z.string(), z.unknown()).optional().describe('Optional field values for the component datasource'),
  }),
  examples: [
    {
      input: {
        pageId: '{PAGE-ID}',
        componentRenderingId: '{COMPONENT-RENDERING-ID}',
        placeholderPath: '/main/jss-main',
        componentItemName: 'My Component',
        language: 'en',
      },
      output: {
        componentId: '{COMPONENT-ID}',
        pageId: '{PAGE-ID}',
        placeholderId: '{PLACEHOLDER-ID}',
        datasourceId: '{DATASOURCE-ID}',
      },
      description: 'Adds a component to a page placeholder',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, componentRenderingId, placeholderPath, componentItemName, language, fields } = input as { pageId: string; componentRenderingId: string; placeholderPath: string; componentItemName: string; language?: string; fields?: Record<string, unknown> };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate("xmc.agent.pagesAddComponentOnPage", {
      params: {
        path: {
          pageId,
        },
        body: {
          componentRenderingId,
          placeholderPath,
          componentItemName,
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
      error: err instanceof Error ? err.message : 'Failed to add component to page',
    };
  }
};
