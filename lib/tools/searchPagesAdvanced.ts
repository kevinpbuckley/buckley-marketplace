import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'searchPagesAdvanced',
  description: 'Search pages with advanced filters including search term, site, template, and language. Use this for more sophisticated page discovery than the basic search.',
  category: 'Pages API',
  inputSchema: z.object({
    searchTerm: z.string().describe('Text to search for in page names and content'),
    site: z.string().describe('Site name to search in'),
    language: z.string().optional().describe('Filter by language code'),
    templateId: z.string().optional().describe('Filter by template ID'),
    pageSize: z.number().optional().describe('Number of results per page (default: 100)'),
    pageNumber: z.number().optional().describe('Page number for pagination (default: 1)'),
  }),
  examples: [
    {
      input: {
        searchTerm: 'product',
        site: 'corporate',
        language: 'en',
        pageSize: 50,
      },
      output: {
        results: [
          { id: 'page-1', name: 'Product Overview', path: '/products/overview' },
          { id: 'page-2', name: 'Product Features', path: '/products/features' },
        ],
        totalCount: 25,
        pageNumber: 1,
        pageSize: 50,
      },
      description: 'Returns filtered search results with pagination',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { searchTerm, site, language, templateId, pageSize, pageNumber } = input as {
    searchTerm: string;
    site: string;
    language?: string;
    templateId?: string;
    pageSize?: number;
    pageNumber?: number;
  };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    // Try potential Pages API search operation
    try {
      const response = await context.client.query("xmc.pages.search" as any, {
        params: {
          query: {
            sitecoreContextId: context.contextId,
            searchTerm: searchTerm || '',
            site: site || '',
            language: language || '',
            templateId: templateId || '',
            pageSize: pageSize || 100,
            pageNumber: pageNumber || 1,
          },
        },
      });

      if (response.data) {
        return {
          success: true,
          output: response.data,
        };
      }
    } catch (sdkError) {
      console.log('[searchPagesAdvanced] Pages API search not available, trying basic search');
    }

    // Fall back to existing basic search (pagesSearchSite)
    const response = await context.client.query("xmc.agent.pagesSearchSite", {
      params: {
        query: {
          sitecoreContextId: context.contextId,
          search_query: searchTerm,
          site_name: site,
          language: language,
        },
      },
    });

    const results = response.data?.data ?? [];

    return {
      success: true,
      output: {
        results: results.map((page: any) => ({
          itemId: page.itemId ?? '',
          name: page.name ?? '',
          path: page.path ?? '',
          templateId: page.templateId ?? '',
        })),
        count: results.length,
        note: 'Using basic search (xmc.agent.pagesSearchSite). Advanced Pages API search (GET /api/v1/pages/search) provides additional filters like template ID and better pagination.',
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to search pages',
    };
  }
};
