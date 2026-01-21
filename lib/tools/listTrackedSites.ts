import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listTrackedSites',
  description: 'Get a list of sites that have a specific analytics identifier configured. Use this to verify analytics setup.',
  category: 'XMC SDK',
  inputSchema: z.object({
    analyticsIdentifier: z.string().describe('The analytics identifier to check for tracked sites'),
  }),
  examples: [
    {
      input: { analyticsIdentifier: 'analytics-123' },
      output: {
        trackedSites: [
          { id: 'site-1', name: 'Corporate Website' },
          { id: 'site-2', name: 'Marketing Site' },
        ],
        count: 2,
      },
      description: 'Returns sites with the specified analytics identifier',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { analyticsIdentifier } = input as { analyticsIdentifier: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.xmapp.listTrackedSites", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { analyticsIdentifier: analyticsIdentifier },
      },
    });

    const sites = response.data?.data ?? [];

    return {
      success: true,
      output: {
        trackedSites: sites.map((site) => ({
          id: site.id ?? '',
          name: site.name ?? '',
          displayName: site.displayName ?? '',
        })),
        count: sites.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch tracked sites',
    };
  }
};
