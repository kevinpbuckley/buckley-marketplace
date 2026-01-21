import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'createComponentDatasource',
  description: 'Create a datasource for a component. Use this when adding a component that requires its own datasource item.',
  category: 'XMC SDK',
  inputSchema: z.object({
    componentId: z.string().describe('The ID of the component to create a datasource for'),
    siteName: z.string().describe('The site name'),
    dataFields: z.record(z.string(), z.unknown()).describe('The field values for the datasource'),
    children: z.array(z.record(z.string(), z.unknown())).optional().describe('Optional child items'),
    language: z.string().optional().describe('The language for the datasource'),
  }),
  examples: [
    {
      input: {
        componentId: '{COMPONENT-ID}',
        siteName: 'MySite',
        dataFields: {
          Title: 'Datasource Title',
          Text: 'Content here',
        },
        language: 'en',
      },
      output: {
        datasourceId: '{DATASOURCE-ID}',
        datasourceLocation: '/sitecore/content/Home/Data/Datasources/...',
      },
      description: 'Creates a new datasource for a component',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { componentId, siteName, dataFields, children, language } = input as { componentId: string; siteName: string; dataFields: Record<string, unknown>; children?: Array<Record<string, unknown>>; language?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate("xmc.agent.componentsCreateComponentDatasource", {
      params: {
        path: {
          componentId,
        },
        body: {
          siteName,
          dataFields,
          children: children || null,
          language,
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
      error: err instanceof Error ? err.message : 'Failed to create component datasource',
    };
  }
};
