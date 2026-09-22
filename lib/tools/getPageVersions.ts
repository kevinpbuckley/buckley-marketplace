import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPageVersions',
  description: 'Get all versions of a page including version numbers, names, and publication status. Use this to understand the version history and identify which version is publishable.',
  category: 'Pages API',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page'),
    site: z.string().describe('The site identifier the page belongs to'),
    language: z.string().optional().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: { pageId: 'page-123', language: 'en' },
      output: {
        pageId: 'page-123',
        versions: [
          {
            version: 2,
            versionName: 'Black Friday Update',
            revision: 'rev-456',
            isLatestPublishableVersion: true,
          },
          {
            version: 1,
            versionName: 'Initial version',
            revision: 'rev-123',
            isLatestPublishableVersion: false,
          },
        ],
      },
      description: 'Returns list of all page versions with metadata',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, site, language } = input as { pageId: string; site: string; language?: string };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query('xmc.pages.retrievePageVersions', {
      params: {
        path: { pageId },
        query: {
          site,
          ...(language && { language }),
          sitecoreContextId: context.contextId,
        },
      },
    });

    return { success: true, output: { pageId, versions: response.data ?? null } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch page versions',
    };
  }
};
