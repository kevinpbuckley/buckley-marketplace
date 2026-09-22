import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listRenderingHosts',
  description: 'Get a list of rendering hosts configured for a site. Use this to review hosting configuration.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The ID of the site'),
  }),
  examples: [
    {
      input: { siteId: 'site-123' },
      output: {
        renderingHosts: [
          { name: 'default', url: 'https://render.example.com' },
          { name: 'preview', url: 'https://preview.example.com' },
        ],
        count: 2,
      },
      description: 'Returns rendering hosts for the site',
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
    const response = await context.client.query("xmc.sites.getRenderingHosts", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { siteId: siteId },
      },
    });

    const hosts = response.data?.data ?? [];

    return {
      success: true,
      output: {
        renderingHosts: hosts,
        count: hosts.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch rendering hosts',
    };
  }
};
