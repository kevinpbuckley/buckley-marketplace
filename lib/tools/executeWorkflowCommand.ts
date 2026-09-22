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

  // No SDK operation covers executing a workflow command: it is absent from both
  // xmc.pages.* and xmc.agent.* (verified against the generated catalog). The Agent API is
  // read-only for workflow data. Report that plainly rather than failing opaquely.
  return {
    success: false,
    error:
      'Executing workflow commands is not supported by the Marketplace SDK. The Agent API exposes workflow state as read-only, and no xmc.pages or xmc.agent operation performs a transition.',
    alternatives: [
      'Use getPageWorkflow to read the current state and the commands available to an author.',
      'Ask an author to perform the transition in the Sitecore Workbox.',
    ],
    requested: { pageId, commandId, comment, language },
  };
};
