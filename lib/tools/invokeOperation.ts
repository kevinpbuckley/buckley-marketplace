import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';
import { callOperation, capLongStrings } from './operation-client';
import { isLocalOperation, runLocalOperation } from '../operations';

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

export const execute: ToolExecutor = async (input, context) => {
  const { key, kind, params, timeoutMs } = input as InvokeInput;

  // `buckley.*` operations are composed here from several SDK calls rather than sent to the SDK.
  if (isLocalOperation(key)) {
    const local = await runLocalOperation(key, kind, params, context);
    return local.success === true ? { success: true, output: { key, kind, result: local.output } } : local;
  }

  const result = await callOperation(context, key, kind, params, timeoutMs);
  if (result.ok === false) {
    const { error, details, reason, hint } = result;
    return { success: false, error, ...(details !== undefined && { details }), ...(reason && { reason }), hint };
  }

  return { success: true, output: { key, kind, result: capLongStrings(result.data) } };
};
