import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

export const definition: ToolDefinition = {
  name: 'getCurrentUser',
  description:
    'Get the signed-in Sitecore user from the Marketplace host. Use this to address the user by name, or to check who would be recorded as the author of a change.',
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
    const response = await context.client.query('host.user');
    return { success: true, output: { user: response.data ?? null } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to read host user',
    };
  }
};
