import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPersonalizationVariants',
  description: 'Get all personalization variants configured for a specific page including their targeting rules. Use this to review personalization setup.',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page to get personalization variants for'),
  }),
  examples: [
    {
      input: { pageId: 'page-123' },
      output: {
        variants: [
          { id: 'var-1', name: 'Returning Visitors', conditions: ['Has visited before'] },
          { id: 'var-2', name: 'New Users', conditions: ['First visit'] },
        ],
        count: 2,
        hasPersonalization: true,
      },
      description: 'Returns personalization variants for the page',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId } = input as { pageId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.personalizationGetPersonalizationVersionsByPage", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { pageId: pageId },
      },
    });

    const variants = response.data?.data ?? [];

    return {
      success: true,
      output: {
        variants,
        count: variants.length,
        hasPersonalization: variants.length > 0,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch personalization variants',
    };
  }
};
