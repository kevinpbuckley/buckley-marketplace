import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';
import { callOperation, capLongStrings, describeFailure } from './operation-client';

const MAX_QUERIES = 10;

const inputSchema = z.object({
  queries: z
    .array(
      z.object({
        key: z.string().describe('Query operation key, e.g. "xmc.agent.contentGetContentItemById"'),
        params: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Params matching describeOperation, with path / query keys as applicable'),
      })
    )
    .min(1)
    .max(MAX_QUERIES)
    .describe(`Up to ${MAX_QUERIES} independent read operations`),
});

export const definition: ToolDefinition = {
  name: 'invokeQueries',
  description:
    `Run up to ${MAX_QUERIES} independent READ operations (kind "query") in one call, e.g. fetching several content items or a page plus its components. Results come back in the same order, each with its own success flag, so one failure does not hide the others. Never use it for writes: mutations go through invokeOperation one at a time.`,
  category: 'Catalog',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { queries } = input as z.infer<typeof inputSchema>;

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  // Always `client.query`: a mutation key sent here fails rather than writing anything.
  const results = await Promise.all(
    queries.map(async ({ key, params }) => {
      const result = await callOperation(context, key, 'query', params);
      return result.ok === true
        ? { key, success: true, result: capLongStrings(result.data) }
        : { key, success: false, error: describeFailure(result), hint: result.hint };
    })
  );

  return {
    success: true,
    output: {
      succeeded: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    },
  };
};
