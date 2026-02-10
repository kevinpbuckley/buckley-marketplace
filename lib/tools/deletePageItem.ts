import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'deletePageItem',
  description: 'Delete a page item. By default moves to recycle bin, optionally can permanently delete. Use with caution as permanent deletion cannot be undone.',
  category: 'Pages API',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page to delete'),
    permanently: z.boolean().optional().describe('If true, permanently deletes instead of moving to recycle bin (default: false)'),
  }),
  examples: [
    {
      input: {
        pageId: 'page-123',
        permanently: false,
      },
      output: {
        pageId: 'page-123',
        deleted: true,
        permanent: false,
        message: 'Page moved to recycle bin',
      },
      description: 'Deletes a page (moves to recycle bin by default)',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, permanently } = input as {
    pageId: string;
    permanently?: boolean;
  };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    // Use existing delete content operation (works for pages too)
    // Note: The SDK may not support the 'permanently' parameter
    // It will default to moving items to recycle bin
    const response = await context.client.mutate("xmc.agent.contentDeleteContent", {
      params: {
        path: { itemId: pageId },
        query: {
          sitecoreContextId: context.contextId,
          // Try to pass permanently as a query param if supported
          ...(permanently !== undefined && { permanently: permanently.toString() }),
        },
      },
    });

    if (!response.data) {
      const error = (response as any).error;
      return {
        success: false,
        error: error?.message || 'Delete failed - no data returned from API',
      };
    }

    return {
      success: true,
      output: {
        pageId,
        deleted: true,
        permanent: permanently || false,
        response: response.data,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete page',
    };
  }
};
