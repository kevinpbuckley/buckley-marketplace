import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'searchPagesAdvanced',
  description: 'Search pages and folders by name, optionally scoped to specific parent items, with a Pages/Folders/All type filter and pagination. Use searchPages instead when you want to search within a single site by content.',
  category: 'Pages API',
  inputSchema: z.object({
    searchText: z.string().describe('Text to match against page name or display name'),
    rootIds: z
      .array(z.string())
      .optional()
      .describe('Limit the search to items under these parent item IDs'),
    filter: z
      .enum(['Pages', 'Folders', 'All'])
      .optional()
      .describe('Pages = renderable items, Folders = folder-based items, All = both'),
    language: z.string().optional().describe('Filter by language code'),
    pageSize: z.number().optional().describe('Number of results per page'),
    pageNumber: z.number().optional().describe('Page number for pagination'),
  }),
  examples: [
    {
      input: { searchText: 'product', filter: 'Pages', pageSize: 50 },
      output: {
        results: [
          { id: 'page-1', name: 'Product Overview', path: '/products/overview' },
          { id: 'page-2', name: 'Product Features', path: '/products/features' },
        ],
        count: 2,
      },
      description: 'Returns matching pages with pagination',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { searchText, rootIds, filter, language, pageSize, pageNumber } = input as {
    searchText: string;
    rootIds?: string[];
    filter?: 'Pages' | 'Folders' | 'All';
    language?: string;
    pageSize?: number;
    pageNumber?: number;
  };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query('xmc.pages.search', {
      params: {
        query: {
          searchText,
          ...(rootIds?.length && { rootIds }),
          ...(filter && { filter }),
          ...(language && { language }),
          ...(pageSize !== undefined && { pageSize }),
          ...(pageNumber !== undefined && { pageNumber }),
          sitecoreContextId: context.contextId,
        },
      },
    });

    return { success: true, output: response.data ?? null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to search pages',
    };
  }
};
