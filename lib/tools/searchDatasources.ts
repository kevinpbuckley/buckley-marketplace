import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'searchDatasources',
  description: 'Search for available datasources that can be used with a specific component. Use this to find existing content items for component datasources.',
  category: 'XMC SDK',
  inputSchema: z.object({
    componentId: z.string().describe('The ID of the component'),
    term: z.string().describe('Search term to filter datasources'),
  }),
  examples: [
    {
      input: { componentId: 'comp-456', term: 'Hero' },
      output: {
        datasources: [
          { id: 'ds-1', name: 'Hero Content 1', path: '/sitecore/content/Site/Data/Heroes/Hero1' },
          { id: 'ds-2', name: 'Hero Content 2', path: '/sitecore/content/Site/Data/Heroes/Hero2' },
        ],
        count: 2,
      },
      description: 'Returns available datasources for the component',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { componentId, term } = input as { componentId: string; term: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.componentsSearchComponentDatasources", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          term: term,
        },
        path: { componentId: componentId },
      },
    });

    const data = response.data?.data;

    return {
      success: true,
      output: {
        datasources: data,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to search datasources',
    };
  }
};
