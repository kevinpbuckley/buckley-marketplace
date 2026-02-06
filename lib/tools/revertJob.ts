import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'revertJob',
  description: 'Revert the operations of a specified job. Use this to roll back changes made by a job that should be undone.',
  category: 'XMC SDK',
  inputSchema: z.object({
    jobId: z.string().describe('The ID of the job to revert'),
  }),
  examples: [
    {
      input: { jobId: '{JOB-ID}' },
      output: {
        success: true,
        message: 'Job reverted successfully',
      },
      description: 'Reverts all operations performed by the job',
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
    await context.client.mutate("xmc.agent.jobsRevertJob", {
      params: {
        path: { jobId },
        query: {
          sitecoreContextId: context.contextId,
        },
      },
    });

    return {
      success: true,
      output: { message: 'Job reverted successfully' },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to revert job',
    };
  }
};
