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
  timeoutMs: z
    .number()
    .int()
    .min(1000)
    .max(300000)
    .optional()
    .describe(
      'Optional request timeout in ms (default 30000). Only raise it to retry an operation that failed with code TIMEOUT, e.g. a large search or a screenshot.'
    ),
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
  const { key, kind, params, timeoutMs } = input as InvokeInput;

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    const resolved = buildParams(key, params, context.contextId);
    const options =
      resolved || timeoutMs ? { ...(resolved && { params: resolved }), ...(timeoutMs && { timeoutMs }) } : undefined;

    // The SDK's key unions are generated per namespace; this tool is deliberately generic.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = context.client as any;
    const response =
      kind === 'mutation' ? await client.mutate(key, options) : await client.query(key, options);

    // `query` never throws: a bridge failure (timeout, unknown key, host error) comes back on
    // `error`, and only `mutate` rethrows it.
    if (response?.isError) return failure(key, response.error);

    // The generated xmc/ai clients don't throw on HTTP errors either; they resolve with
    // `{ data: undefined, error, response }`.
    const envelope = kind === 'mutation' ? response : response?.data;
    if (envelope && typeof envelope === 'object' && envelope.error && envelope.data === undefined) {
      return {
        success: false,
        error: `${key} returned HTTP ${envelope.response?.status ?? 'error'}`,
        details: envelope.error,
        hint: 'Call describeOperation to confirm the parameter shape. A 401 or 403 means the app registration lacks that scope.',
      };
    }

    const payload = response?.data?.data ?? response?.data ?? response;

    return { success: true, output: { key, kind, result: capLongStrings(payload) } };
  } catch (err) {
    return failure(key, err);
  }
};

const MAX_STRING = 10_000;

/**
 * Everything returned here goes into the model's context. A page's HTML or a screenshot's
 * base64 can run to megabytes, so cut any single string past MAX_STRING and say so.
 */
function capLongStrings(value: unknown, depth = 0): unknown {
  if (typeof value === 'string') {
    return value.length > MAX_STRING
      ? `${value.slice(0, MAX_STRING)}…[truncated: ${value.length} chars in full]`
      : value;
  }
  if (depth > 20 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => capLongStrings(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, capLongStrings(v, depth + 1)])
  );
}

/** Since SDK 0.5 bridge errors are `CoreError`s whose `code` and `details.reason` survive the host. */
function failure(key: string, err: unknown) {
  const { code, details } = (err ?? {}) as { code?: string; details?: { reason?: string } };
  const message = err instanceof Error ? err.message : `Failed to invoke ${key}`;

  return {
    success: false as const,
    error: code ? `${code}: ${message}` : message,
    ...(details?.reason && { reason: details.reason }),
    hint:
      code === 'TIMEOUT'
        ? 'The request timed out. Retry once with a larger timeoutMs, or narrow the query.'
        : code === 'METHOD_NOT_FOUND'
          ? 'This host does not support that operation. Use searchOperations to find another.'
          : 'Call describeOperation to confirm the parameter shape, and check that kind matches (query vs mutation).',
  };
}
