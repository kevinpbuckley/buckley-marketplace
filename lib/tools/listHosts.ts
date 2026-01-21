import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listHosts',
  description: 'Get a list of hosts (domains) configured for a site. Use this to review site host configuration.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The ID of the site'),
  }),
  examples: [
    {
      input: { siteId: 'site-123' },
      output: {
        hosts: [
          { name: 'www.example.com', type: 'production' },
          { name: 'staging.example.com', type: 'staging' },
        ],
        count: 2,
      },
      description: 'Returns hosts configured for the site',
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
    const response = await context.client.query("xmc.xmapp.listHosts", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { siteId: siteId },
      },
    });

    const hosts = response.data?.data ?? [];

    return {
      success: true,
      output: {
        hosts,
        count: hosts.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch hosts',
    };
  }
};
