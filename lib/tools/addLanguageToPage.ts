import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'addLanguageToPage',
  description: 'Add a language version to an existing page in Sitecore XM Cloud. Use this when the user wants to add a new language version.',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page to add the language version to'),
    language: z.string().describe('The language code to add (e.g., de-DE, fr-FR)'),
  }),
  examples: [
    {
      input: {
        pageId: '{PAGE-ID}',
        language: 'de-DE',
      },
      output: {
        success: true,
      },
      description: 'Adds a German language version to a page',
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
    const response = await context.client.mutate("xmc.agent.pagesAddLanguageToPage", {
      params: {
        path: {
          pageId,
        },
        body: {
          language,
        },
        query: {
          sitecoreContextId: context.contextId,
        },
      },
    });

    return {
      success: true,
      output: response.data,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to add language to page',
    };
  }
};
