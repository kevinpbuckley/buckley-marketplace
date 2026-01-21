import { z } from 'zod';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';

/**
 * Format a GUID with hyphens (required by XM Cloud GraphQL item queries)
 * Input can be with or without hyphens, with or without braces
 */
function formatGuidWithHyphens(guid: string): string {
  // Remove braces and convert to lowercase
  const clean = (guid || '').replace(/[{}]/g, '').toLowerCase().replace(/-/g, '');
  
  // If it's 32 characters, insert hyphens in the standard GUID format
  if (clean.length === 32) {
    return `${clean.slice(0, 8)}-${clean.slice(8, 12)}-${clean.slice(12, 16)}-${clean.slice(16, 20)}-${clean.slice(20)}`;
  }
  
  // Already has hyphens or invalid format, return as-is (lowercase, no braces)
  return (guid || '').replace(/[{}]/g, '').toLowerCase();
}

export const definition: ToolDefinition = {
  name: 'findNodesExceedingChildLimit',
  description: 'Scan an entire site to find all nodes (pages/items) that exceed the recommended child count limit. Best practice is ≤100 items per node (Section 5.3). Returns a list of violating nodes with their child counts.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteId: z.string().describe('The site ID or site item ID to scan'),
    limit: z.number().optional().describe('Custom limit (default: 100)'),
  }),
  examples: [
    {
      input: { siteId: 'site-abc' },
      output: {
        totalNodesScanned: 245,
        violatingNodes: [
          {
            id: '{ABC-123}',
            name: 'Products',
            path: '/sitecore/content/site/home/products',
            childCount: 150,
            limit: 100,
            exceededBy: 50,
          },
          {
            id: '{DEF-456}',
            name: 'Articles',
            path: '/sitecore/content/site/home/articles',
            childCount: 125,
            limit: 100,
            exceededBy: 25,
          },
        ],
        violationCount: 2,
        status: 'WARNING',
      },
      description: 'Site scan found 2 nodes exceeding child count limit',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

export const execute: ToolExecutor = async (input, context) => {
  const { siteId, limit = 100 } = input as { siteId: string; limit?: number };
  
  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  try {
    // First, get the site details to find the root item ID
    // The siteId from listSites is not the same as the content item ID
    let rootItemId: string | undefined;
    
    console.log('[findNodesExceedingChildLimit] Looking up site details for siteId:', siteId);
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const siteResponse = await (context.client as any).query("xmc.agent.sitesGetSiteDetails", {
        params: {
          query: { sitecoreContextId: context.contextId },
          path: { siteId: siteId },
        },
      });
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const siteDetails = (siteResponse as any)?.data?.data;
      console.log('[findNodesExceedingChildLimit] Site details response:', JSON.stringify(siteDetails, null, 2));
      
      // Try to get the rootPath or siteItemId from the site details
      rootItemId = siteDetails?.rootItemId || siteDetails?.siteItemId || siteDetails?.homePageId;
      console.log('[findNodesExceedingChildLimit] Found rootItemId:', rootItemId);
      
      // If we have a rootPath, we can try to look up the item by path
      if (!rootItemId && siteDetails?.rootPath) {
        console.log('[findNodesExceedingChildLimit] Looking up item by path:', siteDetails.rootPath);
        const pathQuery = `
          query GetItemByPath {
            item(where: { path: "${siteDetails.rootPath}", database: "master" }) {
              itemId
            }
          }
        `;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pathResponse = await (context.client as any).mutate('xmc.authoring.graphql', {
          params: {
            query: { sitecoreContextId: context.contextId },
            body: { query: pathQuery.trim() }
          }
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rootItemId = (pathResponse as any)?.data?.data?.item?.itemId;
        console.log('[findNodesExceedingChildLimit] Looked up rootItemId from path:', rootItemId);
      }
    } catch (lookupErr) {
      // If site lookup fails, assume siteId is already an item ID
      console.log('[findNodesExceedingChildLimit] Site lookup failed, using siteId as itemId:', lookupErr instanceof Error ? lookupErr.message : lookupErr);
    }

    // Use the found rootItemId, or fall back to the provided siteId
    // IMPORTANT: XM Cloud GraphQL requires GUIDs WITH hyphens
    const itemIdToScan = formatGuidWithHyphens(rootItemId || siteId);
    
    console.log('[findNodesExceedingChildLimit] Scanning with itemId:', itemIdToScan, 'original siteId:', siteId);
    
    // GraphQL query to get items with nested children (4 levels deep)
    // XM Cloud limits query depth to 13. 4 levels = ~11 depth, which is safe.
    const query = `
      query FindNodesWithManyChildren {
        site: item(where: { database: "master", itemId: "${itemIdToScan}" }) {
          itemId
          name
          path
          template { name }
          children {
            nodes {
              itemId
              name
              path
              template { name }
              children {
                nodes {
                  itemId
                  name
                  path
                  template { name }
                  children {
                    nodes {
                      itemId
                      name
                      path
                      template { name }
                      children {
                        nodes {
                          itemId
                          name
                          path
                          template { name }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    const response = await context.client.mutate('xmc.authoring.graphql', {
      params: {
        query: {
          sitecoreContextId: context.contextId
        },
        body: {
          query: query.trim()
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const siteData = (response as any)?.data?.data?.site;
    
    console.log('[findNodesExceedingChildLimit] GraphQL response site data:', siteData ? 'found' : 'null');
    
    if (!siteData) {
      console.log('[findNodesExceedingChildLimit] Full response:', JSON.stringify((response as any)?.data, null, 2));
      return {
        success: false,
        error: `Site not found or no access. ItemId: ${itemIdToScan}`,
      };
    }

    // Recursively traverse the tree and collect violations (in-memory only, no API calls)
    const violations: Array<{
      id: string;
      name: string;
      path: string;
      template: string;
      childCount: number;
      limit: number;
      exceededBy: number;
    }> = [];

    let totalNodesScanned = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scanNode = (nodeData: any): void => {
      if (!nodeData) return;
      totalNodesScanned++;

      // Count children by array length (totalCount not available in this schema)
      const childCount = nodeData.children?.nodes?.length ?? 0;
      
      // Check if this node violates the limit
      if (childCount > limit) {
        violations.push({
          id: nodeData.itemId,
          name: nodeData.name,
          path: nodeData.path,
          template: nodeData.template?.name ?? 'Unknown',
          childCount,
          limit,
          exceededBy: childCount - limit,
        });
      }

      // Recursively scan children (in-memory)
      const children = nodeData.children?.nodes ?? [];
      for (const child of children) {
        scanNode(child);
      }
    };

    // Start scanning from site root (including the root itself)
    scanNode(siteData);

    return {
      success: true,
      output: {
        totalNodesScanned,
        violatingNodes: violations,
        violationCount: violations.length,
        status: violations.length === 0 ? 'OK' : 'WARNING',
        recommendation: violations.length > 0
          ? `Found ${violations.length} node(s) exceeding the recommended limit of ${limit} children. Consider restructuring these content hierarchies.`
          : `All nodes are within the recommended limit of ${limit} children.`,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to scan site for child count violations',
    };
  }
};
