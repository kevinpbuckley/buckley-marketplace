import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPageDetails',
  description: 'Get comprehensive information about a page including its layout, components, placeholders, and available actions. Use this to analyze page structure and component usage.',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page to retrieve'),
    language: z.string().optional().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: { pageId: 'page-123' },
      output: {
        page: {
          id: 'page-123',
          name: 'Home',
          template: 'Landing Page',
          components: ['Hero', 'Content Block', 'Footer'],
        },
      },
      description: 'Returns page details with layout information',
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
    const response = await context.client.query("xmc.agent.pagesGetPage", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          language: language,
        },
        path: { pageId: pageId },
      },
    });

    const page = response.data?.data;
    if (!page) {
      return { success: false, error: 'Page not found' };
    }

    return {
      success: true,
      output: { page },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch page details',
    };
  }
};
