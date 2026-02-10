import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPageVersions',
  description: 'Get all versions of a page including version numbers, names, and publication status. Use this to understand the version history and identify which version is publishable.',
  category: 'Pages API',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page'),
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
  const { pageId, language } = input as { pageId: string; language?: string };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    // First, try potential SDK operation
    try {
      const response = await context.client.query("xmc.pages.getVersions" as any, {
        params: {
          query: {
            sitecoreContextId: context.contextId,
            language: language || 'en',
          },
          path: { pageId: pageId },
        },
      });

      if (response.data) {
        return {
          success: true,
          output: response.data,
        };
      }
    } catch (sdkError) {
      // SDK operation might not exist, fall through to alternative
      console.log('[getPageVersions] SDK operation not available, trying alternative');
    }

    // Alternative: Get page details which may include version info
    const response = await context.client.query("xmc.agent.pagesGetPage", {
      params: {
        query: {
          sitecoreContextId: context.contextId,
          language: language || 'en',
        },
        path: { pageId: pageId },
      },
    });

    const page = response.data?.data as Record<string, unknown> | undefined;
    if (!page) {
      return { success: false, error: 'Page not found' };
    }

    // Return available version information from page details
    return {
      success: true,
      output: {
        pageId,
        currentVersion: page.version || null,
        versionInfo: page.versionInfo || null,
        note: 'Full version history requires Pages API integration (GET /api/v1/pages/{pageId}/versions). Currently showing available version info from page details.',
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch page versions',
    };
  }
};
