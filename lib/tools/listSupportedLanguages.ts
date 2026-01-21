import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listSupportedLanguages',
  description: 'Get all languages supported by Sitecore XM Cloud. Use this to see what languages are available to add.',
  category: 'XMC SDK',
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        languages: [
          { name: 'en', displayName: 'English' },
          { name: 'de-DE', displayName: 'German (Germany)' },
          { name: 'fr-FR', displayName: 'French (France)' },
        ],
        count: 3,
      },
      description: 'Returns all XM Cloud supported languages',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (_input, context) => {
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.xmapp.listSupportedLanguages", {
      params: {
        query: { sitecoreContextId: context.contextId },
      },
    });

    const languages = response.data?.data ?? [];

    return {
      success: true,
      output: {
        languages,
        count: languages.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch supported languages',
    };
  }
};
