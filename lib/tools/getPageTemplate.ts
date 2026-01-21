import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getPageTemplate',
  description: 'Get detailed information about a page template including its field definitions with types. Use this to review template structure, check field types (Treelist vs TreelistEx, etc.), and validate template configuration.',
  category: 'XMC SDK',
  inputSchema: z.object({
    templateId: z.string().describe('The ID of the page template to retrieve'),
  }),
  examples: [
    {
      input: { templateId: '{76036F5E-CBCE-46D1-AF0A-4143F9B557AA}' },
      output: {
        template: {
          templateId: '{76036F5E-CBCE-46D1-AF0A-4143F9B557AA}',
          name: 'Article Page',
          fields: [
            { name: 'Title', type: 'Single-Line Text', validation: true },
            { name: 'Body', type: 'Rich Text', validation: false },
            { name: 'Categories', type: 'TreelistEx', validation: false },
          ],
        },
      },
      description: 'Returns template details with field definitions',
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
    const response = await context.client.query("xmc.agent.pagesGetPageTemplateById", {
      params: {
        query: { 
          sitecoreContextId: context.contextId,
          templateId: templateId 
        },
      },
    });

    const template = response.data?.data;
    if (!template) {
      return { success: false, error: 'Template not found' };
    }

    return {
      success: true,
      output: { template },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to fetch page template',
    };
  }
};
