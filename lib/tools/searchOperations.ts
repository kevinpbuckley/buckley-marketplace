import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition } from './types';
import { searchOperations, listNamespaces, catalogMeta } from '../catalog';

const inputSchema = z.object({
  query: z
    .string()
    .describe('What you want to do, in keywords, e.g. "create page version", "rename site", "brand review"'),
  namespace: z
    .string()
    .optional()
    .describe('Restrict to a namespace, e.g. "xmc.pages", "xmc.sites", "xmc.agent", "ai.skills"'),
  kind: z.enum(['query', 'mutation']).optional().describe('query = read, mutation = write'),
});

export const definition: ToolDefinition = {
  name: 'searchOperations',
  description:
    `Search the Sitecore Marketplace SDK for operations. The SDK exposes ${catalogMeta.count} operations and only the most common ones have dedicated tools — use this to find anything else, then call describeOperation for its parameters and invokeOperation to run it. Use this whenever no dedicated tool covers the request.`,
  category: 'Catalog',
  inputSchema,
  clientSide: false,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
  execute: async ({ query, namespace, kind }) => {
    const results = searchOperations(query, { namespace, kind });

    if (results.length === 0) {
      return {
        success: true,
        results: [],
        message: `No operation matched "${query}".`,
        availableNamespaces: listNamespaces(),
      };
    }

    return {
      success: true,
      count: results.length,
      results,
      next: 'Call describeOperation with a key to see its parameters.',
    };
  },
});
