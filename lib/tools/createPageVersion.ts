import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'createPageVersion',
  description: 'Create a new version of a page with an optional version name. Use this before making significant changes to preserve the current state.',
  category: 'Pages API',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page'),
    site: z.string().optional().describe('The site name the page belongs to'),
    versionName: z.string().optional().describe('Optional name for the new version (e.g., "Before Black Friday changes")'),
    language: z.string().optional().describe('Language code (e.g., "en")'),
    baseVersion: z.number().optional().describe('Version number to base the new version on'),
  }),
  examples: [
    {
      input: {
        pageId: 'page-123',
        versionName: 'Black Friday content update',
        language: 'en',
      },
      output: {
        pageId: 'page-123',
        version: 3,
        versionName: 'Black Friday content update',
        revision: 'f7d29433-001e-4a35-a744-876759dba468',
        isLatestPublishableVersion: true,
      },
      description: 'Creates a new version and returns version metadata',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, site, versionName, language, baseVersion } = input as {
    pageId: string;
    site?: string;
    versionName?: string;
    language?: string;
    baseVersion?: number;
  };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate('xmc.pages.addPageVersion', {
      params: {
        path: { pageId },
        body: {
          ...(site && { site }),
          ...(versionName && { versionName }),
          ...(language && { language }),
          ...(baseVersion !== undefined && { baseVersion }),
        },
        query: {
          sitecoreContextId: context.contextId,
        },
      },
    });

    return { success: true, output: response.data ?? null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create page version',
    };
  }
};
