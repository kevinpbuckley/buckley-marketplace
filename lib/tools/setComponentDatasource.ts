import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'setComponentDatasource',
  description: 'Set or change the datasource for a component on a page. Use this when the user wants to connect a component to different content.',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page containing the component'),
    componentId: z.string().describe('The ID of the component to update'),
    datasourceId: z.string().describe('The ID of the datasource to set'),
    language: z.string().optional().describe('The language version'),
  }),
  examples: [
    {
      input: {
        pageId: '{PAGE-ID}',
        componentId: '{COMPONENT-ID}',
        datasourceId: '{DATASOURCE-ID}',
        language: 'en',
      },
      output: {
        success: true,
        message: 'Datasource updated successfully',
        componentId: '{COMPONENT-ID}',
        pageId: '{PAGE-ID}',
        datasourceId: '{DATASOURCE-ID}',
      },
      description: 'Sets a datasource for a component',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, componentId, datasourceId, language } = input as { pageId: string; componentId: string; datasourceId: string; language?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate("xmc.agent.pagesSetComponentDatasource", {
      params: {
        path: {
          pageId,
          componentId,
        },
        body: {
          datasourceId,
          language: language || null,
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
      error: err instanceof Error ? err.message : 'Failed to set component datasource',
    };
  }
};
