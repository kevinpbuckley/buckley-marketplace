import type { ToolExecutorContext, ToolExecutorResult } from '../tools/types';
import type { LocalOperation } from './types';
import { moveComponent } from './moveComponent';
import { addComponentWithContent } from './addComponentWithContent';

/**
 * Composite operations, keyed like SDK operations. Their catalog entries (summary, params,
 * response) live in lib/catalog so search and describe treat them like any other operation.
 */
const LOCAL_OPERATIONS = new Map<string, LocalOperation>(
  [moveComponent, addComponentWithContent].map((op): [string, LocalOperation] => [op.key, op])
);

export const LOCAL_OPERATION_KEYS = [...LOCAL_OPERATIONS.keys()];

export function isLocalOperation(key: string): boolean {
  return LOCAL_OPERATIONS.has(key);
}

export async function runLocalOperation(
  key: string,
  kind: 'query' | 'mutation',
  params: unknown,
  context: ToolExecutorContext
): Promise<ToolExecutorResult & Record<string, unknown>> {
  const op = LOCAL_OPERATIONS.get(key);
  if (!op) return { success: false, error: `No local operation "${key}".` };

  if (op.kind !== kind) {
    return { success: false, error: `${key} is a ${op.kind}, not a ${kind}.`, hint: `Invoke it with kind "${op.kind}".` };
  }

  const parsed = op.schema.safeParse(params ?? {});
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid params for ${key}.`,
      issues: parsed.error.issues.map((issue) => `${issue.path.join('.') || 'params'}: ${issue.message}`),
      hint: 'Pass the params directly, not under path/query/body. Call describeOperation for the shape.',
    };
  }

  return op.execute(parsed.data, context);
}
