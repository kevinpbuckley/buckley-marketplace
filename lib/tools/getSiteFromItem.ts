import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getSiteFromItem',
  description: 'Get the site that an item belongs to. Use this to understand site boundaries and validate content organization.',
  category: 'XMC SDK',
  inputSchema: z.object({
    itemId: z.string().describe('The ID of any content item'),
  }),
  examples: [
    {
      input: { itemId: 'item-123' },
      output: {
        itemId: 'item-123',
        siteId: 'site-456',
        siteName: 'Corporate Website',
      },
      description: 'Returns the site containing this item',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { itemId } = input as { itemId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.sitesGetSiteIdFromItem", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { itemId: itemId },
      },
    });

    const data = response.data?.data as Record<string, unknown> | undefined;

    return {
      success: true,
      output: {
        itemId: itemId,
        siteId: data?.siteId ?? '',
        siteName: data?.siteName ?? '',
        siteRootPath: data?.siteRootPath ?? '',
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get site from item',
    };
  }
};
