import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPagePreviewUrl',
  description: 'Get the preview URL for a page. Use this to verify pages can be previewed without errors (Section 5.3 - Preview check).',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page to get preview URL for'),
    language: z.string().optional().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: { pageId: 'page-123' },
      output: {
        pageId: 'page-123',
        previewUrl: 'https://preview.sitecorecloud.io/...',
      },
      description: 'Returns the preview URL for a page',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, language } = input as { pageId: string; language?: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.pagesGetPagePreviewUrl", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          language: language,
        },
        path: { pageId: pageId },
      },
    });

    const data = response.data?.data;
    if (!data) {
      return { success: false, error: 'Could not get preview URL' };
    }

    return {
      success: true,
      output: {
        pageId: data.pageId ?? pageId,
        previewUrl: data.previewUrl ?? '',
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get preview URL',
    };
  }
};
