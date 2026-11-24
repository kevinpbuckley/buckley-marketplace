import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition } from './types';
import {
  compactParams,
  findOperations,
  replacementFor,
  searchOperations,
  type CatalogOperation,
} from '../catalog';

const MAX_KEYS = 8;

const inputSchema = z.object({
  keys: z
    .array(z.string())
    .min(1)
    .max(MAX_KEYS)
    .optional()
    .describe(`Full operation keys, e.g. ["xmc.pages.addPageVersion", "xmc.agent.pagesGetPage"]. Up to ${MAX_KEYS}.`),
  key: z.string().optional().describe('A single operation key. Prefer keys to describe several at once.'),
});

export const definition: ToolDefinition = {
  name: 'describeOperation',
  description:
    'Get the parameter and response shapes of one or more Marketplace SDK operations before calling them with invokeOperation. Pass every key you are about to use in one call. Shared types are listed once under `types`.',
  category: 'Catalog',
  inputSchema,
  clientSide: false,
};

function describe(op: CatalogOperation, types: Record<string, string>) {
  // Operations share request and response types, so each is listed once across the batch.
  for (const [name, body] of Object.entries(op.referencedTypes ?? {})) types[name] ??= body;

  return {
    key: op.key,
    kind: op.kind,
    summary: op.summary,
    ...(op.deprecated && { deprecated: true, useInstead: replacementFor(op.key) }),
    params: op.params ? compactParams(op.params) : 'not typed by the SDK',
    ...(op.response
      ? { returns: op.responseType, responseShape: op.response }
      : {
          returns: op.responseType ?? 'not typed by the SDK',
          responseNote: 'The SDK does not type this response. Inspect what comes back rather than assuming a shape.',
        }),
  };
}

export const aiTool = tool({
  description: definition.description,
  inputSchema,
  execute: async ({ keys, key }) => {
    const requested = [...new Set([...(keys ?? []), ...(key ? [key] : [])])];
    if (requested.length === 0) {
      return { success: false, error: 'Pass `keys`, the operation keys to describe.' };
    }

    const types: Record<string, string> = {};
    const operations = [];
    const notFound = [];

    for (const k of requested) {
      const matches = findOperations(k);
      if (matches.length) operations.push(...matches.map((op) => describe(op, types)));
      else notFound.push({ key: k, didYouMean: searchOperations(k.split('.').pop() ?? k, { limit: 5 }).map((r) => r.key) });
    }

    if (operations.length === 0) {
      return { success: false, error: `No operation ${requested.map((k) => `"${k}"`).join(', ')}.`, notFound };
    }

    return {
      success: true,
      operations,
      ...(Object.keys(types).length && { types }),
      ...(notFound.length && { notFound }),
      next: 'Call invokeOperation with a key, its kind, and params matching the shape above. sitecoreContextId is added for you.',
    };
  },
});
