import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getSiteHierarchy',
  description: 'Get the page hierarchy for the main page of a site including its children, ancestors, and siblings. Use this to get an overview of site structure.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The ID of the site'),
  }),
  examples: [
    {
      input: { siteId: 'site-123' },
      output: {
        hierarchy: {
          root: { id: 'page-123', name: 'Home' },
          children: [
            { id: 'page-456', name: 'About' },
            { id: 'page-789', name: 'Products' },
            { id: 'page-012', name: 'Contact' },
          ],
        },
      },
      description: 'Returns site root hierarchy',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteId } = input as { siteId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.xmapp.retrieveSiteHierarchy", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { siteId: siteId },
      },
    });

    const hierarchy = response.data?.data;

    return {
      success: true,
      output: { hierarchy },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch site hierarchy',
    };
  }
};
