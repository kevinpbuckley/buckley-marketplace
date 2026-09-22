import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listSites',
  description: 'List all sites in the XM Cloud environment with their details. Use this when the user asks about sites, websites, or wants to see what sites are available.',
  category: 'XMC SDK',
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        sites: [
          { id: 'site-123', name: 'corporate-website', displayName: 'Corporate Website', description: 'Main corporate site' },
          { id: 'site-456', name: 'marketing-site', displayName: 'Marketing Site', description: 'Marketing campaigns' },
        ],
        count: 2,
      },
      description: 'Returns all sites configured in the XM Cloud environment',
    },
  ],
  clientSide: true,
};

// Create the AI SDK tool (client-side, no execute function)
export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

// Client-side executor
export const execute: ToolExecutor = async (_input, context) => {
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.sites.listSites", {
      params: {
        query: {
          sitecoreContextId: context.contextId,
        },
      },
    });

    const sites = response.data?.data ?? [];

    return {
      success: true,
      output: {
        sites: sites.map((site) => ({
          id: site.id ?? '',
          name: site.name ?? '',
          displayName: site.displayName ?? '',
          description: site.description ?? '',
        })),
        count: sites.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch sites',
    };
  }
};
