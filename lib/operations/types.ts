import type { z } from 'zod';
import type { ToolExecutorContext, ToolExecutorResult } from '../tools/types';

/**
 * An operation Buckley runs itself, composed from several SDK calls. It is listed in the
 * catalog under `buckley.*` and invoked through invokeOperation like any SDK operation; the
 * params are passed directly, not under path/query/body.
 */
export interface LocalOperation<S extends z.ZodTypeAny = z.ZodTypeAny> {
  key: string;
  kind: 'query' | 'mutation';
  schema: S;
  execute: (params: z.infer<S>, context: ToolExecutorContext) => Promise<ToolExecutorResult>;
}
