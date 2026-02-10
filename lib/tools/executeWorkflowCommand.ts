import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'executeWorkflowCommand',
  description: 'Execute a workflow command on a page (e.g., Submit for Review, Approve, Reject). First use getPageWorkflow to see available commands, then execute the desired command by its ID.',
  category: 'Pages API',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page'),
    commandId: z.string().describe('The ID of the workflow command to execute'),
    comment: z.string().optional().describe('Optional comment to include with the workflow action'),
    language: z.string().optional().describe('Language code (e.g., "en")'),
  }),
  examples: [
    {
      input: {
        pageId: 'page-123',
        commandId: 'cmd-approve-123',
        comment: 'Looks good, approving for publication',
        language: 'en',
      },
      output: {
        pageId: 'page-123',
        success: true,
        newWorkflowState: 'Approved',
        message: 'Workflow command executed successfully',
      },
      description: 'Executes the workflow command and returns new state',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, commandId, comment, language } = input as {
    pageId: string;
    commandId: string;
    comment?: string;
    language?: string;
  };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    // Try potential SDK operation for workflow commands
    try {
      const response = await context.client.mutate("xmc.pages.executeWorkflowCommand" as any, {
        params: {
          path: { pageId },
          body: {
            commandId,
            comment: comment || '',
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
      console.log('[executeWorkflowCommand] SDK operation not available');
    }

    // Try alternative Agent API workflow operation if it exists
    try {
      const response = await context.client.mutate("xmc.agent.workflowExecuteCommand" as any, {
        params: {
          path: { pageId },
          body: {
            commandId,
            comment: comment || '',
          },
          query: {
            sitecoreContextId: context.contextId,
            language: language || 'en',
          },
        },
      });

      if (response.data) {
        return {
          success: true,
          output: response.data,
        };
      }
    } catch (agentError) {
      console.log('[executeWorkflowCommand] Agent API workflow operation not available');
    }

    // Return informative error about SDK limitation
    return {
      success: false,
      error: 'Workflow command execution requires Pages API integration. The Agent API is read-only for workflow data. This operation needs SDK support for POST /api/v1/pages/{pageId}/workflow/command (or similar endpoint). Please see docs/PAGES_API_INTEGRATION.md for details.',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to execute workflow command',
    };
  }
};
