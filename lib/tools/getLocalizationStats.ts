import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getLocalizationStats',
  description: 'Get localization statistics for a site including the number of pages in each locale. Use this to review internationalization setup and content translation status.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The ID of the site to get localization statistics for'),
  }),
  examples: [
    {
      input: { siteId: 'site-123' },
      output: {
        locales: [
          { language: 'en', pageCount: 50 },
          { language: 'de-DE', pageCount: 45 },
          { language: 'fr-FR', pageCount: 30 },
        ],
        totalLanguages: 3,
      },
      description: 'Returns page counts per language',
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
    const response = await context.client.query("xmc.xmapp.retrieveLocalizationStatistics", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { siteId: siteId },
      },
    });

    const data = response.data?.data;
    
    return {
      success: true,
      output: {
        statistics: data,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch localization statistics',
    };
  }
};
