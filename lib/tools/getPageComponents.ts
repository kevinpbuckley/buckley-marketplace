import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPageComponents',
  description: 'Get a list of components currently added to a specific page. Use this to analyze page composition and component usage.',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page'),
    language: z.string().optional().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: { pageId: 'page-123' },
      output: {
        components: [
          { name: 'Hero Banner', placeholder: 'main' },
          { name: 'Rich Text', placeholder: 'main' },
          { name: 'Call to Action', placeholder: 'sidebar' },
        ],
        count: 3,
      },
      description: 'Returns components on the page with their placeholders',
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
    const response = await context.client.query("xmc.agent.pagesGetComponentsOnPage", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          language: language,
        },
        path: { pageId: pageId },
      },
    });

    const data = response.data?.data;

    return {
      success: true,
      output: { 
        components: data,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch page components',
    };
  }
};
