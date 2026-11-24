import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition } from './types';
import {
  searchOperations,
  listNamespaces,
  catalogMeta,
  compactParams,
  findOperations,
  requestTypes,
} from '../catalog';

/**
 * The top hits come back with their params, so the usual search -> describe -> invoke chain
 * loses a model round trip. Beyond three, the extra shapes cost more context than they save.
 */
const DETAILED_HITS = 3;

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
    `Search the Sitecore Marketplace SDK for operations. The SDK exposes ${catalogMeta.count} operations and only the most common ones have dedicated tools — use this to find anything else, then invokeOperation to run it. The top ${DETAILED_HITS} hits include their params (and request types under \`types\`), so you can invoke one of those directly; call describeOperation only for other hits or for a response shape. Use this whenever no dedicated tool covers the request.`,
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

    const types: Record<string, string> = {};
    const detailed = results.map((result, index) => {
      if (index >= DETAILED_HITS) return result;
      const op = findOperations(result.key).find((o) => o.kind === result.kind);
      if (!op?.params) return result;
      Object.assign(types, requestTypes(op));
      return { ...result, params: compactParams(op.params) };
    });

    return {
      success: true,
      count: results.length,
      results: detailed,
      ...(Object.keys(types).length && { types }),
      next: 'Invoke a hit that has params directly. For the others, or for a response shape, call describeOperation with all the keys you need.',
    };
  },
});
