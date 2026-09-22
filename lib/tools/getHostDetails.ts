import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getHostDetails',
  description: 'Get detailed information about a specific host configuration. Use this to verify hosting setup (Section 8.1).',
  category: 'XMC SDK',
  inputSchema: z.object({
    hostId: z.string().describe('The ID of the host'),
    siteId: z.string().describe('The ID of the site'),
  }),
  examples: [
    {
      input: { hostId: 'host-123', siteId: 'site-456' },
      output: {
        id: 'host-123',
        hostname: 'www.example.com',
        isDefault: true,
      },
      description: 'Returns host configuration details',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { hostId, siteId } = input as { hostId: string; siteId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.sites.retrieveHost", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { hostId: hostId, siteId: siteId },
      },
    });

    const host = response.data?.data;
    if (!host) {
      return { success: false, error: 'Host not found' };
    }

    return {
      success: true,
      output: {
        host: host,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get host details',
    };
  }
};
