import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'createPersonalizationVersion',
  description: 'Create a new personalization version for a page with a variant. Use this to set up targeted content variations based on visitor conditions.',
  category: 'XMC SDK',
  inputSchema: z.object({
    pageId: z.string().describe('The ID of the page to create personalization for'),
    name: z.string().describe('The name for this personalization version'),
    variantName: z.string().describe('The name of the personalization variant'),
    audienceName: z.string().describe('The name of the target audience'),
    conditionTemplateId: z.string().describe('The condition template ID for targeting'),
    conditionParams: z.record(z.string(), z.unknown()).describe('Parameters for the condition'),
    language: z.string().optional().describe('The language for the personalization (default: en)'),
  }),
  examples: [
    {
      input: {
        pageId: '{PAGE-ID}',
        name: 'Homepage Personalization',
        variantName: 'VIP Customers',
        audienceName: 'VIP Segment',
        conditionTemplateId: '{CONDITION-TEMPLATE-ID}',
        conditionParams: { segment: 'vip' },
        language: 'en',
      },
      output: {
        success: true,
        versionId: '{VERSION-ID}',
      },
      description: 'Creates a personalization version with a targeted variant',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { pageId, name, variantName, audienceName, conditionTemplateId, conditionParams, language } = input as { 
    pageId: string; 
    name: string;
    variantName: string;
    audienceName: string;
    conditionTemplateId: string;
    conditionParams: Record<string, unknown>;
    language?: string;
  };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const response = await context.client.mutate("xmc.agent.personalizationCreatePersonalizationVersion", {
      params: {
        path: { pageId },
        body: {
          name,
          variant_name: variantName,
          audience_name: audienceName,
          condition_template_id: conditionTemplateId,
          condition_params: conditionParams,
          language: language || null,
        },
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
      error: err instanceof Error ? err.message : 'Failed to create personalization version',
    };
  }
};
