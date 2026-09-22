import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listPageChildren',
  description: 'Get all children of a page. Use this to check item counts under nodes (should be ≤100 per best practices) and analyze content structure.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The ID of the site'),
    pageId: z.string().describe('The ID of the parent page'),
  }),
  examples: [
    {
      input: { siteId: 'site-123', pageId: 'page-456' },
      output: {
        children: [
          { id: 'page-1', name: 'Child 1', path: '/products/child-1' },
          { id: 'page-2', name: 'Child 2', path: '/products/child-2' },
        ],
        count: 2,
        exceedsRecommendedLimit: false,
      },
      description: 'Returns child pages with count analysis',
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
    const response = await context.client.query("xmc.sites.listPageChildren", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { siteId: siteId, pageId: pageId },
      },
    });

    const children = response.data?.data ?? [];
    const count = children.length;

    return {
      success: true,
      output: {
        children: children.map((child) => ({
          id: child.id ?? '',
          name: child.name ?? '',
          displayName: child.displayName ?? '',
        })),
        count,
        exceedsRecommendedLimit: count > 100,
        recommendation: count > 100 
          ? `WARNING: ${count} children exceeds the recommended limit of 100 items per node.`
          : `OK: ${count} children is within the recommended limit.`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch page children',
    };
  }
};
