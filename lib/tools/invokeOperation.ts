import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

const inputSchema = z.object({
  key: z.string().describe('Operation key from searchOperations, e.g. "xmc.pages.renamePage"'),
  kind: z
    .enum(['query', 'mutation'])
    .describe('Must match the kind reported by describeOperation: query reads, mutation writes'),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Params object matching describeOperation, with path / query / body keys as applicable'),
});

export const definition: ToolDefinition = {
  name: 'invokeOperation',
  description:
    'Run any Sitecore Marketplace SDK operation found via searchOperations. Always call describeOperation first so the params match — guessing parameter names will fail. For destructive operations, confirm with the user before calling.',
  category: 'Catalog',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

type InvokeInput = z.infer<typeof inputSchema>;

/**
 * Only the XM Cloud and AI services take `sitecoreContextId`. Host-bridge keys
 * (`host.user`, `site.context`, `pages.reloadCanvas`) take no params at all, and passing a
 * query bag to them fails, so leave those untouched.
 */
function buildParams(
  key: string,
  params: Record<string, unknown> | undefined,
  contextId: string
): Record<string, unknown> | undefined {
  const isServiceCall = key.startsWith('xmc.') || key.startsWith('ai.');
  if (!isServiceCall) return params && Object.keys(params).length ? params : undefined;

  const next = { ...(params ?? {}) };
  const query = (next.query ?? {}) as Record<string, unknown>;
  if (query.sitecoreContextId === undefined) {
    next.query = { ...query, sitecoreContextId: contextId };
  }
  return next;
}

export const execute: ToolExecutor = async (input, context) => {
  const { key, kind, params } = input as InvokeInput;

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const resolved = buildParams(key, params, context.contextId);
    const options = resolved ? { params: resolved } : undefined;

    // The SDK's key unions are generated per namespace; this tool is deliberately generic.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = context.client as any;
    const response =
      kind === 'mutation' ? await client.mutate(key, options) : await client.query(key, options);

    const payload = response?.data?.data ?? response?.data ?? response;

    return { success: true, output: { key, kind, result: payload } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : `Failed to invoke ${key}`,
      hint: 'Call describeOperation to confirm the parameter shape, and check that kind matches (query vs mutation).',
    };
  }
};
