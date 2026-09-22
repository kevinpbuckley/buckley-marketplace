import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';
import { hostFetch, AGENT_API } from './host-proxy';

const inputSchema = z.object({
  brandContextId: z
    .string()
    .optional()
    .describe('Brand context id. Omit to list the brand contexts in this organization.'),
  document: z
    .string()
    .optional()
    .describe(
      'Document name or id to read, e.g. "Messaging Framework". Omit to get the folder and document tree.'
    ),
});

export const definition: ToolDefinition = {
  name: 'readBrandContext',
  description:
    "Read the brand context — the organization's brand knowledge as markdown documents: audiences and personas, messaging and positioning, product, content guidelines, customer evidence and competitor findings. Call with a brandContextId to see the document tree, then add `document` to read one.",
  category: 'Brand',
  inputSchema,
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema,
});

interface TreeNode {
  brandContextItemId: string;
  displayName: string;
  type: string;
  children?: TreeNode[];
}

interface BrandContext {
  brandContextId: string;
  displayName: string;
  sourceRef?: string;
  runStatus?: string;
  children?: TreeNode[];
}

/** The tree nests folders arbitrarily deep, so flatten it before matching by name. */
function flatten(nodes: TreeNode[] = [], trail: string[] = []): Array<TreeNode & { path: string }> {
  return nodes.flatMap((node) => {
    const path = [...trail, node.displayName].join(' / ');
    return [{ ...node, path }, ...flatten(node.children, [...trail, node.displayName])];
  });
}

export const execute: ToolExecutor = async (input, context) => {
  const { brandContextId, document } = input as z.infer<typeof inputSchema>;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = context.client as any;

    if (!brandContextId) {
      const contexts = (await hostFetch(
        client,
        `${AGENT_API}/api/v1/brand-contexts`
      )) as BrandContext[];
      return {
        success: true,
        output: {
          brandContexts: (contexts ?? []).map((c) => ({
            id: c.brandContextId,
            name: c.displayName,
            status: c.runStatus,
          })),
          next: 'Call again with a brandContextId to see its documents.',
        },
      };
    }

    // One call returns the whole nested tree; only document content is fetched separately.
    const tree = (await hostFetch(
      client,
      `${AGENT_API}/api/v1/brand-contexts/${brandContextId}`
    )) as BrandContext;
    const all = flatten(tree.children);
    const documents = all.filter((n) => n.type !== 'folder');

    if (!document) {
      return {
        success: true,
        output: {
          brandContextId,
          name: tree.displayName,
          documents: documents.map((d) => d.path),
          next: 'Call again with `document` set to one of these names to read its markdown.',
        },
      };
    }

    const needle = document.trim().toLowerCase();
    const match =
      documents.find((d) => d.brandContextItemId.toLowerCase() === needle) ??
      documents.find((d) => d.displayName.toLowerCase() === needle) ??
      documents.find((d) => d.path.toLowerCase().includes(needle));

    if (!match) {
      return {
        success: false,
        error: `No document matching "${document}".`,
        availableDocuments: documents.map((d) => d.path),
      };
    }

    const batch = (await hostFetch(
      client,
      `${AGENT_API}/api/v1/brand-contexts/${brandContextId}/items?ids=${match.brandContextItemId}`
    )) as { data?: Array<{ displayName: string; content?: string; fetchStatusMessage?: string }> };

    const entry = batch.data?.[0];
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
