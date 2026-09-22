import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition } from './types';
import { describeOperation, replacementFor, searchOperations } from '../catalog';

const inputSchema = z.object({
  key: z.string().describe('Full operation key, e.g. "xmc.pages.addPageVersion"'),
});

export const definition: ToolDefinition = {
  name: 'describeOperation',
  description:
    'Get the parameter shape of a Marketplace SDK operation before calling it with invokeOperation. Returns the TypeScript type of the params, including path, query and body fields.',
  category: 'Catalog',
  inputSchema,
  clientSide: false,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
  execute: async ({ key }) => {
    const op = describeOperation(key);

    if (!op) {
      return {
        success: false,
        error: `No operation "${key}".`,
        didYouMean: searchOperations(key.split('.').pop() ?? key, { limit: 5 }),
      };
    }

    return {
      success: true,
      key: op.key,
      kind: op.kind,
      summary: op.summary,
      deprecated: op.deprecated,
      ...(op.deprecated && { useInstead: replacementFor(op.key) }),
      params: op.params,
      ...(op.response
        ? { returns: op.responseType, responseShape: op.response }
        : {
            returns: op.responseType ?? 'not typed by the SDK',
            responseNote:
              'The SDK does not type this response. Inspect what comes back rather than assuming a shape.',
          }),
      ...(op.referencedTypes && { referencedTypes: op.referencedTypes }),
      next: `Call invokeOperation with key "${op.key}" and params matching the shape above.`,
    };
  },
});
