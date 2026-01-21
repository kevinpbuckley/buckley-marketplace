import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'searchPages',
  description: 'Search all pages in a site by title or content. Use this to find duplicate content, search for specific pages, or analyze content patterns.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteName: z.string().describe('The name of the site to search'),
    searchQuery: z.string().describe('Search query to find in page titles or content'),
    language: z.string().optional().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: { siteName: 'my-site', searchQuery: 'product' },
      output: {
        results: [
          { id: 'page-1', path: '/products', displayName: 'Products' },
          { id: 'page-2', path: '/products/new', displayName: 'New Products' },
        ],
        count: 2,
      },
      description: 'Returns pages matching the search query',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteName, searchQuery, language } = input as { siteName: string; searchQuery: string; language?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.pagesSearchSite", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          search_query: searchQuery,
          site_name: siteName,
          language: language,
        },
      },
    });

    const results = response.data?.data ?? [];

    return {
      success: true,
      output: {
        results: results.map((page) => ({
          itemId: page.itemId ?? '',
          name: page.name ?? '',
          path: page.path ?? '',
          templateId: page.templateId ?? '',
        })),
        count: results.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to search pages',
    };
  }
};