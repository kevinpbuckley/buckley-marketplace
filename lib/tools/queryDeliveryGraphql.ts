import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

const inputSchema = z.object({
  query: z.string().describe('A GraphQL query string'),
  variables: z.record(z.string(), z.unknown()).optional().describe('GraphQL variables'),
  target: z
    .enum(['preview', 'live'])
    .describe('preview = unpublished authoring content, live = what is published to Edge'),
});

export const definition: ToolDefinition = {
  name: 'queryDeliveryGraphql',
  description:
    'Run a read-only GraphQL query against the Preview or Live (Edge) content APIs. Use "live" to check what visitors actually see, and "preview" for unpublished content. This is different from the Authoring GraphQL used by the content tools.',
  category: 'XMC SDK',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { query, variables, target } = input as z.infer<typeof inputSchema>;

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const key = target === 'live' ? 'xmc.live.graphql' : 'xmc.preview.graphql';
    const response = await context.client.mutate(key, {
      params: {
        body: { query, ...(variables && { variables }) },
        query: { sitecoreContextId: context.contextId },
      },
    });

    return { success: true, output: { target, result: response.data ?? null } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : `Failed to run ${target} GraphQL query`,
    };
  }
};
