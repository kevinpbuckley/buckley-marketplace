import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listPageAncestors',
  description: 'Get all ancestor (parent) pages of a specific page. Use this to understand content hierarchy and verify structure matches website (Section 5.3).',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The site ID'),
    pageId: z.string().describe('The ID of the page to get ancestors for'),
  }),
  examples: [
    {
      input: { siteId: 'site-abc', pageId: 'page-123' },
      output: {
        ancestors: [
          { id: 'home', name: 'Home', path: '/' },
          { id: 'products', name: 'Products', path: '/products' },
        ],
        depth: 2,
      },
      description: 'Returns parent pages up to root',
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
    const response = await context.client.query("xmc.xmapp.listPageAncestors", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { siteId: siteId, pageId: pageId },
      },
    });

    const ancestors = response.data?.data ?? [];

    return {
      success: true,
      output: {
        pageId: pageId,
        ancestors: ancestors.map((page) => ({
          id: page.id ?? '',
          name: page.name ?? '',
          displayName: page.displayName ?? '',
        })),
        depth: ancestors.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get page ancestors',
    };
  }
};
