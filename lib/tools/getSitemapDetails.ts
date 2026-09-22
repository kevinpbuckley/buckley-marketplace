import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

const inputSchema = z.object({
  siteId: z
    .string()
    .describe('The site identifier. Use listSites or getSiteDetails to find it.'),
});

export const definition: ToolDefinition = {
  name: 'getSitemapDetails',
  description:
    "Get a site's sitemap configuration, including cache and generation settings. Use listSites first if you do not have the site ID.",
  category: 'XMC SDK',
  inputSchema,
  examples: [
    {
      input: { siteId: 'ee5c791590a24d7e88fccc443cbf6ac6' },
      output: {
        siteId: 'ee5c791590a24d7e88fccc443cbf6ac6',
        sitemap: { cacheExpiration: 60, isEnabled: true },
      },
      description: 'Returns the sitemap configuration for the site',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteId } = input as z.infer<typeof inputSchema>;

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query('xmc.sites.retrieveSitemapConfiguration', {
      params: {
        path: { siteId },
        query: { sitecoreContextId: context.contextId },
      },
    });

    const sitemap = response.data ?? null;

    if (!sitemap) {
      return {
        success: false,
        error: `No sitemap configuration found for site ${siteId}.`,
      };
    }

    return { success: true, output: { siteId, sitemap } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch sitemap configuration',
    };
  }
};
