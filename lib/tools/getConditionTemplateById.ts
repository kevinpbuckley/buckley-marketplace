import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getConditionTemplateById',
  description: 'Get detailed information about a specific personalization condition template including its parameters and configuration. Use this to understand what parameters are needed when creating personalized variants.',
  category: 'XMC SDK',
  inputSchema: z.object({
    templateId: z.string().describe('The ID of the condition template to retrieve'),
  }),
  examples: [
    {
      input: { templateId: '{TEMPLATE-ID}' },
      output: {
        template: {
          id: '{TEMPLATE-ID}',
          name: 'Visitor Segment',
          description: 'Target by visitor segment',
          parameters: [
            {
              name: 'segment',
              type: 'string',
              required: true,
            },
          ],
        },
      },
      description: 'Returns condition template details with parameter definitions',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { templateId } = input as { templateId: string };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.query("xmc.agent.personalizationGetConditionTemplateById", {
      params: {
        path: { template_id: templateId },
        query: {
          sitecoreContextId: context.contextId,
        },
      },
    });

    const template = response.data?.data;
    if (!template) {
      return { success: false, error: 'Condition template not found' };
    }

    return {
      success: true,
      output: { template },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch condition template',
    };
  }
};
