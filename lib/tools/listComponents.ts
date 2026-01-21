import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listComponents',
  description: 'List all available components for a specific site. This includes both built-in and custom components. Use this to review component count and naming conventions.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteName: z.string().describe('The name of the site to list components for'),
  }),
  examples: [
    {
      input: { siteName: 'my-site' },
      output: {
        components: [
          { id: 'comp-1', name: 'Hero Banner' },
          { id: 'comp-2', name: 'Rich Text' },
          { id: 'comp-3', name: 'Image Gallery' },
        ],
        count: 3,
      },
      description: 'Returns all components available for the site',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteName } = input as { siteName: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.componentsListComponents", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          site_name: siteName,
        },
      },
    });

    const data = response.data?.data;
    const componentsData = data?.components;
    
    // Flatten grouped and ungrouped components
    const allComponents: Array<{ id: string; name: string; category: string }> = [];
    
    // Add components from groups
    if (componentsData?.groups) {
      for (const group of componentsData.groups) {
        for (const comp of group.components) {
          allComponents.push({
            id: comp.id ?? '',
            name: comp.displayName ?? comp.componentName ?? '',
            category: comp.category ?? group.title ?? '',
          });
        }
      }
    }
    
    // Add ungrouped components
    if (componentsData?.ungrouped) {
      for (const comp of componentsData.ungrouped) {
        allComponents.push({
          id: comp.id ?? '',
          name: comp.displayName ?? comp.componentName ?? '',
          category: comp.category ?? 'Ungrouped',
        });
      }
    }
    
    return {
      success: true,
      output: {
        components: allComponents,
        count: allComponents.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch components',
    };
  }
};