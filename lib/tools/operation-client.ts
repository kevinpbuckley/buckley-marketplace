import type { ToolExecutorContext } from './types';

export type OperationKind = 'query' | 'mutation';

export type OperationResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; details?: unknown; reason?: string; hint: string };

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

/**
 * Runs one SDK operation and normalises the three ways it can fail (bridge error on `query`,
 * thrown error on `mutate`, HTTP error envelope from the generated clients) into one shape.
 * Shared by invokeOperation and the composite tools so they all read results the same way.
 */
export async function callOperation(
  context: ToolExecutorContext,
  key: string,
  kind: OperationKind,
  params?: Record<string, unknown>,
  timeoutMs?: number
): Promise<OperationResult> {
  if (!context.contextId) {
    return { ok: false, error: 'No context ID available', hint: 'Reopen the app from SitecoreAI.' };
  }

  try {
    const resolved = buildParams(key, params, context.contextId);
    const options =
      resolved || timeoutMs ? { ...(resolved && { params: resolved }), ...(timeoutMs && { timeoutMs }) } : undefined;

    // The SDK's key unions are generated per namespace; this helper is deliberately generic.
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
        ok: false,
        error: `${key} returned HTTP ${envelope.response?.status ?? 'error'}`,
        details: envelope.error,
        hint: 'Call describeOperation to confirm the parameter shape. A 401 or 403 means the app registration lacks that scope.',
      };
    }

    return { ok: true, data: response?.data?.data ?? response?.data ?? response };
  } catch (err) {
    return failure(key, err);
  }
}

/** Since SDK 0.5 bridge errors are `CoreError`s whose `code` and `details.reason` survive the host. */
function failure(key: string, err: unknown): OperationResult {
  const { code, details } = (err ?? {}) as { code?: string; details?: { reason?: string } };
  const message = err instanceof Error ? err.message : `Failed to invoke ${key}`;

  return {
    ok: false,
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

/** Readable text for an error result, including the API's details when it sent any. */
export function describeFailure(result: Extract<OperationResult, { ok: false }>): string {
  const extra = result.reason ?? (result.details ? JSON.stringify(result.details) : '');
  return extra ? `${result.error}: ${extra}` : result.error;
}

const MAX_STRING = 10_000;

/**
 * Everything returned to the model goes into its context. A page's HTML or a screenshot's
 * base64 can run to megabytes, so cut any single string past MAX_STRING and say so.
 */
export function capLongStrings(value: unknown, depth = 0): unknown {
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

/** Sitecore returns GUIDs braced, upper-cased or hyphen-less depending on the API. */
export function sameId(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (id: string) => id.replace(/[{}-]/g, '').toLowerCase();
  return Boolean(a && b && norm(a) === norm(b));
}

/** Reloads the Pages canvas when the page that changed is the one open in the editor. */
export async function reloadCanvasIfCurrent(
  context: ToolExecutorContext,
  pageId: string
): Promise<boolean> {
  if (!sameId(context.pagesContext?.pageInfo?.id, pageId)) return false;
  const result = await callOperation(context, 'pages.reloadCanvas', 'mutation');
  return result.ok;
}
