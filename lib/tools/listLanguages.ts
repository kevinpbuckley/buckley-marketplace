import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listLanguages',
  description: 'List all available languages for the current XM Cloud site. Use this when the user asks about languages, localization, or multilingual content.',
  category: 'XMC SDK',
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        languages: [
          { name: 'en', displayName: 'English', iso: 'en' },
          { name: 'de-DE', displayName: 'German (Germany)', iso: 'de-DE' },
        ],
        count: 2,
      },
      description: 'Returns all languages configured for the site',
    },
  ],
  clientSide: true,
};

// Create the AI SDK tool (client-side, no execute function)
export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

// Client-side executor
export const execute: ToolExecutor = async (_input, context) => {
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.xmapp.listLanguages", {
      params: {
        query: {
          sitecoreContextId: context.contextId,
        },
      },
    });

    const languages = response.data?.data ?? [];

    return {
      success: true,
      output: {
        languages: languages.map((lang) => ({
          name: lang.name ?? '',
          displayName: lang.displayName ?? '',
          iso: lang.iso ?? '',
        })),
        count: languages.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch languages',
    };
  }
};
