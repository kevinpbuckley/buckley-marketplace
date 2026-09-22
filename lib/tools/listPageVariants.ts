import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listPageVariants',
  description: 'List all variants of a page. Use this to check rendering variant count (Section 4.6.3 - Limit variants to 15 or less).',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page to get variants for'),
    language: z.string().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: { pageId: 'page-123', language: 'en' },
      output: {
        variants: [
          { id: 'default', name: 'Default' },
          { id: 'mobile', name: 'Mobile View' },
        ],
        count: 2,
        withinLimit: true,
      },
      description: 'Returns page variants - should be ≤15',
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
    const response = await context.client.query("xmc.pages.listPageVariants", {
      params: {
        query: { sitecoreContextId: context.contextId, language: language },
        path: { pageId: pageId },
      },
    });

    const variants = response.data?.data ?? [];
    const count = variants.length;

    return {
      success: true,
      output: {
        pageId: pageId,
        variants: variants,
        count: count,
        withinLimit: count <= 15,
        recommendation: count > 15 
          ? `Page has ${count} variants. Best practice is ≤15 (preferably ≤10).`
          : count > 10 
            ? `Page has ${count} variants. Consider reducing to ≤10 for optimal performance.`
            : null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get page variants',
    };
  }
};
