import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'checkPageLive',
  description: 'Check if a page is published to the Edge (live/production). Use this to verify publishing status and identify unpublished changes.',
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
        isLive: true,
        lastPublished: '2024-02-01T10:30:00Z',
        publishingInfo: {
          isPublishable: true,
          hasPublishableVersion: true,
          isAvailableToPublish: true,
        },
      },
      description: 'Returns Edge publication status for the page',
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
    // Use existing SDK operation that checks live state
    const response = await context.client.query("xmc.pages.getLivePageState", {
      params: {
        query: {
          sitecoreContextId: context.contextId,
          language: language || 'en',
        },
        path: { pageId: pageId },
      },
    });

    const data = response.data?.data as Record<string, unknown> | undefined;

    // Also try to get publishing info from page details
    let publishingInfo = null;
    try {
      const pageResponse = await context.client.query("xmc.agent.pagesGetPage", {
        params: {
          query: {
            sitecoreContextId: context.contextId,
            language: language || 'en',
          },
          path: { pageId: pageId },
        },
      });

      const page = pageResponse.data?.data as Record<string, unknown> | undefined;
      publishingInfo = page?.publishing || null;
    } catch (publishingError) {
      // Publishing info not critical, continue without it
      console.log('[checkPageLive] Could not fetch publishing info');
    }

    return {
      success: true,
      output: {
        pageId: pageId,
        isLive: data?.isLive ?? false,
        liveState: data,
        publishingInfo,
        note: 'Edge publication status from xmc.pages.getLivePageState.',
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to check page live state',
    };
  }
};
