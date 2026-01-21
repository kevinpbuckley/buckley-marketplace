import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listAllPages',
  description: 'Get a flat list of all pages/routes for a specific site. Use this to review content structure, check page count, or analyze site architecture.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteName: z.string().describe('The name of the site to list pages for'),
    language: z.string().optional().describe('Language code (e.g., "en"). Defaults to default language.'),
  }),
  examples: [
    {
      input: { siteName: 'my-site', language: 'en' },
      output: {
        pages: [
          { id: 'page-1', path: '/' },
          { id: 'page-2', path: '/about' },
          { id: 'page-3', path: '/products' },
        ],
        count: 3,
      },
      description: 'Returns all page routes for the site',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteName, language } = input as { siteName: string; language?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.sitesGetAllPagesBySite", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          language: language,
        },
        path: { siteName: siteName },
      },
    });

    const pages = response.data?.data ?? [];

    return {
      success: true,
      output: {
        pages: pages.map((page) => ({
          id: page.id ?? '',
          path: page.path ?? '',
        })),
        count: pages.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch pages',
    };
  }
};
