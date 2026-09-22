import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';
import type {
  BrandContextDetail,
  BrandContextItems,
  BrandContextNode,
  BrandContextSummary,
} from '../sdk/brand-module';
import { isBrandFailure } from '../sdk/brand-module';

/** ClientSDK wraps the module result in `data`; some Agent API payloads wrap again. */
function unwrap<T>(payload: unknown): T | undefined {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data?: unknown }).data;
    if (inner !== undefined && inner !== null) return inner as T;
  }
  return payload as T | undefined;
}

const inputSchema = z.object({
  brandContextId: z
    .string()
    .optional()
    .describe('Brand context id. Omit to list the brand contexts in this organization.'),
  document: z
    .string()
    .optional()
    .describe('Document name, e.g. "Messaging Framework". Omit to get the document tree.'),
});

export const definition: ToolDefinition = {
  name: 'readBrandContext',
  description:
    "Read the brand context — the organization's brand knowledge as markdown documents: audiences and personas, messaging and positioning, product, content guidelines, customer evidence. Call with a brandContextId to see the documents, then add `document` to read one.",
  category: 'Brand',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

/** The tree nests folders arbitrarily deep, so flatten it before matching by name. */
function flatten(
  nodes: BrandContextNode[] = [],
  trail: string[] = []
): Array<BrandContextNode & { path: string }> {
  return nodes.flatMap((node) => {
    const path = [...trail, node.displayName].join(' / ');
    return [{ ...node, path }, ...flatten(node.children, [...trail, node.displayName])];
  });
}

export const execute: ToolExecutor = async (input, context) => {
  const { brandContextId, document } = input as z.infer<typeof inputSchema>;

  try {
    if (!brandContextId) {
      const response = await context.client.query('brand.contexts.list');
      const listed = unwrap<BrandContextSummary[] | unknown>(response.data);
      if (isBrandFailure(listed)) return { success: false, error: listed.message };
      const contexts = (Array.isArray(listed) ? listed : []) as BrandContextSummary[];
      return {
        success: true,
        output: {
          brandContexts: contexts.map((c) => ({
            id: c.brandContextId,
            name: c.displayName,
            status: c.runStatus,
          })),
          next: 'Call again with a brandContextId to see its documents.',
        },
      };
    }

    // One call returns the whole nested tree; only document content is fetched separately.
    const response = await context.client.query('brand.contexts.getById', {
      params: { path: { brandContextId } },
    });
    const tree = unwrap<BrandContextDetail>(response.data);
    if (isBrandFailure(tree)) return { success: false, error: tree.message };
    const documents = flatten(tree?.children).filter((n) => n.type !== 'folder');

    if (!document) {
      return {
        success: true,
        output: {
          brandContextId,
          name: tree?.displayName,
          documents: documents.map((d) => d.path),
          next: 'Call again with `document` set to one of these to read its markdown.',
        },
      };
    }

    const needle = document.trim().toLowerCase();
    const match =
      documents.find((d) => d.displayName.toLowerCase() === needle) ??
      documents.find((d) => d.path.toLowerCase().includes(needle));

    if (!match) {
      return {
        success: false,
        error: `No document matching "${document}".`,
        availableDocuments: documents.map((d) => d.path),
      };
    }

    const itemsResponse = await context.client.query('brand.contexts.items', {
      params: {
        path: { brandContextId },
        query: { ids: match.brandContextItemId },
      },
    });
    // This payload has a `data` array of its own, so only unwrap when the envelope is absent.
    const raw = itemsResponse.data as unknown;
    const items =
      raw && typeof raw === 'object' && 'requested' in raw
        ? (raw as BrandContextItems)
        : unwrap<BrandContextItems>(raw);
    const entry = items?.data?.[0];

    if (!entry?.content) {
      return {
        success: false,
        error: entry?.fetchStatusMessage ?? `No content returned for "${match.displayName}".`,
      };
    }

    return {
      success: true,
      output: { brandContextId, document: match.path, content: entry.content },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to read the brand context',
    };
  }
};
