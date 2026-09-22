import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getSiteContext',
  description:
    'Get the current site context from the Marketplace host, including the site name, hosts, language settings and the brandKitId. This is the only way to obtain a brandKitId, which a brand review requires.',
  category: 'Host',
  inputSchema: z.object({}),
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: z.object({}),
});

export const execute: ToolExecutor = async (_input, context) => {
  try {
    const response = await context.client.query('site.context');
    const site = response.data;

    if (!site) {
      return { success: false, error: 'Host returned no site context' };
    }

    return {
      success: true,
      output: {
        site,
        brandKitId: (site as { brandKitId?: string }).brandKitId ?? null,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to read site context',
    };
  }
};
