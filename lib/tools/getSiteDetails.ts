import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getSiteDetails',
  description: 'Get detailed information about a specific site including its configuration, themes, and available languages. Use this to review site setup and configuration.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The ID of the site to get details for'),
  }),
  examples: [
    {
      input: { siteId: 'site-123' },
      output: {
        site: {
          id: 'site-123',
          name: 'corporate-website',
          displayName: 'Corporate Website',
          languages: ['en', 'de-DE'],
          hostName: 'www.example.com',
        },
      },
      description: 'Returns detailed site configuration',
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
    const response = await context.client.query("xmc.agent.sitesGetSiteDetails", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { siteId: siteId },
      },
    });

    const site = response.data?.data;
    if (!site) {
      return { success: false, error: 'Site not found' };
    }

    return {
      success: true,
      output: { site },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch site details',
    };
  }
};
