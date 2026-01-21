import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPageHtml',
  description: 'Get the rendered HTML of a page. Use this to verify pages render without errors and check for inline styles or scripts (Section 11.3 - No inline CSS).',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page'),
    language: z.string().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: { pageId: 'page-123', language: 'en' },
      output: {
        pageId: 'page-123',
        html: '<!DOCTYPE html><html>...',
        hasInlineStyles: false,
        hasInlineScripts: false,
      },
      description: 'Returns rendered HTML with basic analysis',
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
    const response = await context.client.query("xmc.agent.pagesGetPageHtml", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          language: language,
        },
        path: { pageId: pageId },
      },
    });

    const responseData = response.data?.data;
    const html = typeof responseData === 'string' ? responseData : (responseData as { html?: string })?.html ?? '';
    
    // Basic analysis of the HTML
    const hasInlineStyles = /<[^>]+style\s*=/i.test(html) || /<style[^>]*>/i.test(html);
    const hasInlineScripts = /<script[^>]*>[^<]+<\/script>/i.test(html);
    const htmlLength = html.length;

    return {
      success: true,
      output: {
        pageId: pageId,
        html: htmlLength > 10000 ? html.substring(0, 10000) + '...[truncated]' : html,
        htmlLength: htmlLength,
        analysis: {
          hasInlineStyles: hasInlineStyles,
          hasInlineScripts: hasInlineScripts,
          recommendations: [
            ...(hasInlineStyles ? ['Consider moving inline styles to CSS files (Section 11.3)'] : []),
            ...(hasInlineScripts ? ['Consider moving inline scripts to JS files (Section 11.3)'] : []),
          ],
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get page HTML',
    };
  }
};
