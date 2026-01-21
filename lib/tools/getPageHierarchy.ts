import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPageHierarchy',
  description: 'Get hierarchy information about a page including its children, ancestors, and siblings. Use this to analyze content structure and check item counts per node.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The ID of the site'),
    pageId: z.string().describe('The ID of the page to get hierarchy for'),
  }),
  examples: [
    {
      input: { siteId: 'site-123', pageId: 'page-456' },
      output: {
        hierarchy: {
          current: { id: 'page-456', name: 'Products' },
          children: [
            { id: 'page-789', name: 'Category 1' },
            { id: 'page-012', name: 'Category 2' },
          ],
          ancestors: [{ id: 'page-123', name: 'Home' }],
          childCount: 2,
        },
      },
      description: 'Returns page hierarchy with children and ancestors',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteId, pageId } = input as { siteId: string; pageId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.xmapp.retrievePageHierarchy", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { siteId: siteId, pageId: pageId },
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
      error: err instanceof Error ? err.message : 'Failed to fetch page hierarchy',
    };
  }
};
