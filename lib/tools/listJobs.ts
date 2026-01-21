import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'listJobs',
  description: 'Get information about background jobs currently running. Use this to check system status.',
  category: 'XMC SDK',
  inputSchema: z.object({}),
  examples: [
    {
      input: {},
      output: {
        jobs: [
          { id: 'job-1', name: 'Publishing', status: 'running', progress: 45 },
          { id: 'job-2', name: 'Indexing', status: 'completed', progress: 100 },
        ],
        count: 2,
      },
      description: 'Returns running and recent background jobs',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (_input, context) => {
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.xmapp.listJobs", {
      params: {
        query: { sitecoreContextId: context.contextId },
      },
    });

    const jobs = response.data?.data ?? [];

    return {
      success: true,
      output: {
        jobs,
        count: jobs.length,
        hasRunningJobs: jobs.length > 0,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch jobs',
    };
  }
};
