import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPageWorkflow',
  description: 'Get detailed workflow information for a page including available workflow commands, current state, and warnings. Use this to understand what workflow actions can be performed on a page.',
  category: 'Pages API',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page'),
    language: z.string().optional().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: { pageId: 'page-123', language: 'en' },
      output: {
        workflow: {
          id: '77ac7ce9-803a-42e3-bb05-f79fca73cbce',
          displayName: 'Page Workflow',
          currentState: 'Draft',
          canEdit: true,
          commands: [
            { id: 'cmd-1', displayName: 'Submit for Review' },
            { id: 'cmd-2', displayName: 'Approve' },
          ],
        },
      },
      description: 'Returns workflow information including available commands',
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
    // Try the standard agent API first - it returns workflow info but without commands
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

    // Extract workflow information if available
    const workflow = page.workflow as Record<string, unknown> | undefined;

    if (!workflow) {
      return {
        success: true,
        output: {
          pageId,
          workflow: null,
          note: 'No workflow assigned to this page',
        },
      };
    }

    // Note: The Agent API returns workflow info but may not include the commands array
    // The full Pages API (GET /api/v1/pages/{pageId}) includes workflow.commands
    // which lists executable workflow commands
    return {
      success: true,
      output: {
        pageId,
        workflow: {
          id: workflow.id,
          displayName: workflow.displayName,
          currentState: workflow.state || workflow.displayName,
          finalState: workflow.finalState,
          canEdit: workflow.canEdit,
          warnings: workflow.warnings || [],
          commands: workflow.commands || [],
          icon: workflow.icon,
          note: Array.isArray(workflow.commands) && workflow.commands.length === 0
            ? 'No executable commands available in current state'
            : undefined,
        },
        publishing: page.publishing || null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch workflow information',
    };
  }
};
