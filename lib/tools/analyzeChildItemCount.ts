import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'analyzeChildItemCount',
  description: 'Analyze the number of child items under a page. Best practice is ≤100 items per node (Section 5.3). Returns a warning if count exceeds limit.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The site ID'),
    pageId: z.string().describe('The ID of the page to analyze'),
    limit: z.number().optional().describe('Custom limit (default: 100)'),
  }),
  examples: [
    {
      input: { siteId: 'site-abc', pageId: 'page-123' },
      output: {
        pageId: 'page-123',
        childCount: 45,
        limit: 100,
        withinLimit: true,
        status: 'OK',
      },
      description: 'Page with acceptable child count',
    },
    {
      input: { siteId: 'site-abc', pageId: 'page-456' },
      output: {
        pageId: 'page-456',
        childCount: 150,
        limit: 100,
        withinLimit: false,
        status: 'WARNING',
        recommendation: 'Consider restructuring content. 150 children exceeds the recommended limit of 100.',
      },
      description: 'Page with too many children',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteId, pageId, limit = 100 } = input as { siteId: string; pageId: string; limit?: number };
  
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
    const childCount = children.length;
    const withinLimit = childCount <= limit;

    return {
      success: true,
      output: {
        pageId: pageId,
        childCount: childCount,
        limit: limit,
        withinLimit: withinLimit,
        status: withinLimit ? 'OK' : 'WARNING',
        recommendation: withinLimit 
          ? null 
          : `Consider restructuring content. ${childCount} children exceeds the recommended limit of ${limit}.`,
        children: children.slice(0, 20).map((child) => ({
          id: child.id ?? '',
          name: child.name ?? '',
        })),
        hasMore: childCount > 20,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to analyze child items',
    };
  }
};
