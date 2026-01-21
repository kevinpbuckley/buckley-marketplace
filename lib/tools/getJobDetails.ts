import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getJobDetails',
  description: 'Get detailed information about a specific background job. Use this to check job status and troubleshoot issues.',
  category: 'XMC SDK',
  inputSchema: z.object({
    jobHandle: z.string().describe('The handle/ID of the job to get details for'),
  }),
  examples: [
    {
      input: { jobHandle: 'job-123' },
      output: {
        jobHandle: 'job-123',
        status: 'completed',
        type: 'publish',
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T10:05:00Z',
      },
      description: 'Returns detailed job information',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { jobHandle } = input as { jobHandle: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.xmapp.retrieveJob", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { jobHandle: jobHandle },
      },
    });

    const job = response.data?.data;
    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    return {
      success: true,
      output: {
        job: job,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get job details',
    };
  }
};
