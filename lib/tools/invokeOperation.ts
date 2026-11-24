import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';
import { callOperation, capLongStrings } from './operation-client';
import { isLocalOperation, runLocalOperation } from '../operations';
import { changesTree, parentOfOpenPageBeingDeleted, refreshEditorAfter } from '../operations/editor-refresh';

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
    'Run any Sitecore Marketplace SDK operation, or a buckley.* composite operation. Use the params a skill or search hit gave you, otherwise call describeOperation first — guessing parameter names will fail. For destructive operations, confirm with the user before calling. After a create, delete or rename that changes the Pages tree, the editor is refreshed automatically and the result says how under `editor`.',
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

  // A delete of the open page leaves the editor on a missing item; find where to go first.
  const parentOfDeleted =
    kind === 'mutation' && changesTree(key) ? await parentOfOpenPageBeingDeleted(context, key, params) : undefined;

  const result = await callOperation(context, key, kind, params, timeoutMs);
  if (result.ok === false) {
    const { error, details, reason, hint } = result;
    return { success: false, error, ...(details !== undefined && { details }), ...(reason && { reason }), hint };
  }

  const editor =
    kind === 'mutation' && changesTree(key)
      ? await refreshEditorAfter(context, key, params, result.data as Record<string, unknown>, parentOfDeleted)
      : undefined;

  return {
    success: true,
    output: { key, kind, result: capLongStrings(result.data), ...(editor && { editor }) },
  };
};
