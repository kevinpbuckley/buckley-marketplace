import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'createPageVersion',
  description: 'Create a new version of a page with an optional version name. Use this before making significant changes to preserve the current state.',
  category: 'Pages API',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page'),
    versionName: z.string().optional().describe('Optional name for the new version (e.g., "Before Black Friday changes")'),
    language: z.string().optional().describe('Language code (e.g., "en")'),
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
  const { pageId, versionName, language } = input as {
    pageId: string;
    versionName?: string;
    language?: string;
  };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    // Try potential SDK operation for creating versions
    try {
      const response = await context.client.mutate("xmc.pages.createVersion" as any, {
        params: {
          path: { pageId },
          body: {
            versionName: versionName || '',
            language: language || 'en',
          },
          query: {
            sitecoreContextId: context.contextId,
          },
        },
      });

      if (response.data) {
        return {
          success: true,
          output: response.data,
        };
      }
    } catch (sdkError) {
      // SDK operation might not exist
      console.log('[createPageVersion] SDK operation not available');
    }

    // Return informative error about SDK limitation
    return {
      success: false,
      error: 'Version creation requires Pages API integration (POST /api/v1/pages/{pageId}/versions). This operation is not yet available in the Marketplace SDK. Please see docs/PAGES_API_INTEGRATION.md for details.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to create page version',
    };
  }
};
