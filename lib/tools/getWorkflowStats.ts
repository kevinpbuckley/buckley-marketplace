import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getWorkflowStats',
  description: 'Get workflow statistics for a site including workflow states and the number of pages in each state. Use this to review workflow configuration and check if workflows are enabled.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The ID of the site to get workflow statistics for'),
  }),
  examples: [
    {
      input: { siteId: 'site-123' },
      output: {
        workflows: [
          {
            name: 'Sample Workflow',
            states: [
              { name: 'Draft', pageCount: 5 },
              { name: 'Awaiting Approval', pageCount: 2 },
              { name: 'Approved', pageCount: 10 },
            ],
          },
        ],
        hasWorkflow: true,
        totalStates: 3,
      },
      description: 'Returns workflow configuration and page counts per state',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteId } = input as { siteId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.sites.retrieveWorkflowStatistics", {
      params: {
        query: { sitecoreContextId: context.contextId },
        path: { siteId: siteId },
      },
    });

    const data = response.data?.data;
    
    return {
      success: true,
      output: {
        workflows: data,
        hasWorkflow: data && Object.keys(data).length > 0,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch workflow statistics',
    };
  }
};
