import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getLivePageState',
  description: 'Check if a page is live/published. Use this to identify broken links or unpublished pages (Section 5.3 - No broken links).',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page to check'),
    language: z.string().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: { pageId: 'page-123', language: 'en' },
      output: {
        pageId: 'page-123',
        isLive: true,
        state: 'published',
      },
      description: 'Returns whether the page is live',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, language } = input as { pageId: string; language: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.xmapp.getLivePageState", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          language: language,
        },
        path: { pageId: pageId },
      },
    });

    const data = response.data?.data as Record<string, unknown> | undefined;

    return {
      success: true,
      output: {
        pageId: pageId,
        isLive: data?.isLive ?? false,
        state: data,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get page state',
    };
  }
};
