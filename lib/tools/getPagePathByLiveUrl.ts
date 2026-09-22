import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

const inputSchema = z.object({
  liveUrl: z.string().describe('A live site URL, e.g. https://www.example.com/products/overview'),
});

export const definition: ToolDefinition = {
  name: 'getPagePathByLiveUrl',
  description:
    'Resolve a live website URL back to the Sitecore page item path. Use this when the user gives you a URL rather than a page name or ID.',
  category: 'Pages',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { liveUrl } = input as z.infer<typeof inputSchema>;

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query('xmc.agent.pagesGetPagePathByLiveUrl', {
      params: {
        query: {
          live_url: liveUrl,
          sitecoreContextId: context.contextId,
        },
      },
    });

    return { success: true, output: response.data?.data ?? response.data ?? null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to resolve live URL',
    };
  }
};
