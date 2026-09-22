import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

const inputSchema = z.object({
  pageId: z.string().describe('The ID of the page'),
  language: z.string().optional().describe('Language code (e.g. "en")'),
  version: z.number().optional().describe('Page version number (default: 1)'),
  width: z.number().optional().describe('Viewport width in pixels'),
  height: z.number().optional().describe('Viewport height in pixels'),
});

export const definition: ToolDefinition = {
  name: 'getPageScreenshot',
  description:
    'Capture a screenshot of a live page as a base64-encoded image. Use this to review how a page actually renders, including layout problems that are not visible in the content or HTML.',
  category: 'Pages',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, language, version, width, height } = input as z.infer<typeof inputSchema>;

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query('xmc.agent.pagesGetPageScreenshot', {
      params: {
        path: { pageId },
        query: {
          version: version ?? 1,
          ...(language && { language }),
          ...(width && { width }),
          ...(height && { height }),
          sitecoreContextId: context.contextId,
        },
      },
    });

    return { success: true, output: response.data?.data ?? response.data ?? null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to capture screenshot',
    };
  }
};
