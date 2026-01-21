import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getComponentDetails',
  description: 'Get detailed information about a component including its datasource template, fields, and configuration. Use this to review component setup, check datasource requirements, and validate field types.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The ID of the site'),
    componentId: z.string().describe('The ID of the component to retrieve'),
  }),
  examples: [
    {
      input: { siteId: 'site-123', componentId: 'comp-456' },
      output: {
        component: {
          id: 'comp-456',
          name: 'Hero Banner',
          datasourceTemplateId: '{...}',
          datasourceTemplatePath: '/sitecore/templates/Project/Components/Hero',
          datasourceRequired: true,
          datasourceFields: [
            { name: 'Heading', type: 'Single-Line Text', validation: '' },
            { name: 'Image', type: 'Image', validation: '' },
          ],
        },
      },
      description: 'Returns component details with datasource field definitions',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteId, componentId } = input as { siteId: string; componentId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.componentsGetComponent", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { componentId: componentId },
      },
    });

    const component = response.data?.data;
    if (!component) {
      return { success: false, error: 'Component not found' };
    }

    return {
      success: true,
      output: { component },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch component details',
    };
  }
};
