import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listJobOperations',
  description: 'Get detailed list of all operations associated with a specific job. Use this to understand what changes were made by a job and track operation details.',
  category: 'XMC SDK',
  inputSchema: z.object({
    jobId: z.string().describe('The ID of the job to get operations for'),
  }),
  examples: [
    {
      input: { jobId: '{JOB-ID}' },
      output: {
        operations: [
          {
            id: '{OP-ID-1}',
            type: 'create',
            status: 'completed',
            itemId: '{ITEM-ID}',
          },
          {
            id: '{OP-ID-2}',
            type: 'update',
            status: 'completed',
            itemId: '{ITEM-ID-2}',
          },
        ],
      },
      description: 'Returns list of operations performed by the job',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { jobId } = input as { jobId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.jobsListOperations", {
      params: {
        path: { jobId },
        query: {
          sitecoreContextId: context.contextId,
        },
      },
    });

    return {
      success: true,
      output: response.data,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch job operations',
    };
  }
};
