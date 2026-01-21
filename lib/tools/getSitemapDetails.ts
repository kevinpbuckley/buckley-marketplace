import { z } from 'zod';
import { normalizeGuid, formatGuidWithBraces } from '../sitecore-utils';
import { tool } from 'ai';
import type { ToolDefinition, ToolExecutor } from './types';


export const definition: ToolDefinition = {
  name: 'getSitemapDetails',
  description: 'Get detailed information about a Sitecore sitemap configuration by providing a site item ID. The tool navigates the site structure (Site -> Settings -> Sitemap) to find and analyze the sitemap settings, including cache configuration, generation options, and field values with resolved item references.',
  category: 'XMC SDK',
  inputSchema: z.object({
    siteItemId: z.string().describe('The item ID of the site (without braces) to analyze. The tool will find the sitemap under Site/Settings/Sitemap.'),
  }),
  examples: [
    {
      input: { siteItemId: 'ee5c791590a24d7e88fccc443cbf6ac6' },
      output: {
        sitemap: {
          id: '6fca0bed0f5b4c359561e79dc595d8cb',
          name: 'Sitemap',
          path: '/sitecore/content/nextjs-starter/nextjs-skate-park/Settings/Sitemap',
          template: 'Sitemap Settings',
          parent: {
            id: 'eae2e8d025714688a6e3b256df642c33',
            name: 'Settings',
            path: '/sitecore/content/nextjs-starter/nextjs-skate-park/Settings'
          },
          fields: {
            'GenerateSitemapMediaItems': '1',
            'Cache Expiration': '60',
            'Cache Type': {
              id: '{AF52EB2D-A852-45A7-ABD6-C931EEDBFC9D}',
              name: 'Stored in file',
              path: '/sitecore/system/Settings/Foundation/Experience Accelerator/SiteMetadata/Enums/SitemapStatus/Stored in file'
            }
          },
          children: []
        },
        summary: {
          fieldCount: 13,
          childrenCount: 0,
          hasParent: true,
          resolvedReferences: 2
        }
      },
      description: 'Returns complete sitemap configuration details including resolved field references',
    },
  ],
  clientSide: true,
};

export const aiTool = tool({
  description: definition.description,
  inputSchema: definition.inputSchema,
});

import { logDebug } from './debugLogger';

// Type for sitemap details result
type SitemapDetailsResult = {
  sitemap: {
    id: string;
    name: string;
    path: string;
    template: string;
    parent: {
      id: string;
      name: string;
      path: string;
    } | null;
    fields: Record<string, string | { id: string; name: string; path: string }>;
    children: Array<{
      id: string;
      name: string;
      path: string;
      template: string;
    }>;
  };
  summary: {
    fieldCount: number;
    childrenCount: number;
    hasParent: boolean;
    rawFieldCount: number;
    resolvedReferences: number;
  };
};

export const execute: ToolExecutor = async (input, context) => {
  const { siteItemId } = input as { siteItemId: string };

  if (!context.contextId) {
    return { success: false, error: 'No context ID available' };
  }

  // Helper function to build GraphQL query for getting children of an item by path
  function buildChildrenQueryByPath(): string {
    return `
      query GetChildren($path: String!) {
        item(where: { database: "master", path: $path, language: "en" }) {
          itemId
          name
          path
          children {
            nodes {
              itemId
              name
              path
              template {
                name
              }
            }
          }
        }
      }
    `;
  }

  // Helper function to get children using GraphQL by path
  async function getChildrenByGraphQL(parentPath: string): Promise<Array<{ id: string; name: string; path: string; templateName: string }>> {
    try {
      console.log('Executing GraphQL query for parent path:', parentPath);
      logDebug('Executing GraphQL query for parent path:', parentPath);

      const query = buildChildrenQueryByPath();

      // Use SDK mutate signature: client.mutate(methodName, { params: { query: { sitecoreContextId }, body: { query, variables }}})
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (context.client as any).mutate('xmc.authoring.graphql', {
        params: {
          query: {
            sitecoreContextId: context.contextId
          },
          body: {
            query: query.trim(),
            variables: { path: parentPath }
          }
        }
      });

      logDebug('GraphQL request:', query.trim());
      logDebug('GraphQL variables:', { path: parentPath });
      logDebug('GraphQL response:', response && typeof response === 'object' ? JSON.stringify(response, null, 2) : response);
      console.log('GraphQL response received for path:', parentPath);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (response as any).data as Record<string, unknown> | undefined;
      const innerData = data?.data as Record<string, unknown> | undefined;
      const item = innerData?.item as Record<string, unknown> | undefined;
      const children = item?.children as Record<string, unknown> | undefined;
      const results = children?.nodes as Array<Record<string, unknown>> | undefined;

      if (!results) {
        console.log('No children nodes found. Item:', item);
        return [];
      }

      return results.map(child => {
        const template = child.template as Record<string, unknown> | undefined;

        return {
          id: (child.itemId as string || '').replace(/[{}]/g, ''),
          name: child.name as string || '',
          path: child.path as string || '',
          templateName: template?.name as string || '',
        };
      });
    } catch (err) {
      console.error('GraphQL error:', err);
      return [];
    }
  }

  // Helper function to resolve item references
  async function resolveItemReference(itemId: string): Promise<{ id: string; name: string; path: string } | null> {
    try {
      const normalizedId = normalizeGuid(itemId);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (context.client as any).query("xmc.agent.contentGetContentItemById", {
        params: {
          query: { sitecoreContextId: context.contextId },
          path: { itemId: normalizedId },
        },
      });

      const item = response?.data?.data as Record<string, unknown> | undefined;
      if (item) {
        return {
          id: (item.itemId as string || '').replace(/[{}]/g, ''),
          name: item.name as string || '',
          path: item.path as string || '',
        };
      }
    } catch (err) {
      console.warn(`Could not resolve item reference for ${itemId}:`, err);
    }
    return null;
  }

  // Helper function to resolve item references in fields
  async function resolveItemReferences(fields: Record<string, string>): Promise<Record<string, string | { id: string; name: string; path: string }>> {
    const resolvedFields: Record<string, string | { id: string; name: string; path: string }> = {};

    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      // Skip system fields that start with __
      if (fieldName.startsWith('__')) {
        continue;
      }

      if (fieldValue && typeof fieldValue === 'string' && fieldValue.match(/^\{[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}\}$/i)) {
        // This looks like an item ID, try to resolve it
        const resolved = await resolveItemReference(fieldValue);
        if (resolved) {
          resolvedFields[fieldName] = resolved;
        } else {
          resolvedFields[fieldName] = fieldValue;
        }
      } else {
        // Regular field value
        resolvedFields[fieldName] = fieldValue;
      }
    }

    return resolvedFields;
  }

  try {
    console.log('Finding site and its Settings/Sitemap structure for site ID:', siteItemId);
    const normalizedSiteId = normalizeGuid(siteItemId);
    console.log('Normalized site ID:', normalizedSiteId);

    // Step 1: Get the site with nested children using GraphQL (like the working script)
    // Note: Inline the GUID directly in the query instead of using variables (GraphQL schema issue)
    const findSiteQuery = `
      query FindSite {
        site: item(where: { database: "master", itemId: "${normalizedSiteId}", language: "en" }) {
          itemId
          name
          path
          children {
            nodes {
              itemId
              name
              path
              template {
                name
              }
              children {
                nodes {
                  itemId
                  name
                  path
                  template {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    console.log('Querying site with nested children...');
    console.log('[DEBUG] Query to execute:', findSiteQuery.trim());
    logDebug('[DEBUG] Query to execute:', findSiteQuery.trim());
    
    // Match the JS example: inline the GUID in the query (no variables)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const siteResponse = await (context.client as any).mutate('xmc.authoring.graphql', {
      params: {
        query: { sitecoreContextId: context.contextId },
        body: { query: findSiteQuery.trim() }
      }
    });

    console.log('[DEBUG] Full siteResponse:', JSON.stringify(siteResponse, null, 2));
    logDebug('[DEBUG] Full siteResponse:', JSON.stringify(siteResponse, null, 2));

    // Check for GraphQL errors in the response (like the JS example does)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const siteRespData = (siteResponse as any).data as Record<string, unknown> | undefined;
    if (siteRespData?.errors) {
      console.error('[ERROR] GraphQL errors in site response:', JSON.stringify(siteRespData.errors, null, 2));
      logDebug('[ERROR] GraphQL errors:', siteRespData.errors);
    }

    let siteData = siteRespData as Record<string, unknown> | undefined;
    console.log('[DEBUG] siteData:', JSON.stringify(siteData, null, 2));
    logDebug('[DEBUG] siteData:', JSON.stringify(siteData, null, 2));
    
    let siteInnerData = siteData?.data as Record<string, unknown> | undefined;
    console.log('[DEBUG] siteInnerData:', JSON.stringify(siteInnerData, null, 2));
    logDebug('[DEBUG] siteInnerData:', JSON.stringify(siteInnerData, null, 2));
    
    let site = siteInnerData?.site as Record<string, unknown> | undefined;
    console.log('[DEBUG] site result:', site ? 'found' : 'null');

    // If initial lookup failed, try alternate GUID formats (braced/uppercase/lowercase/no-braces)
    if (!site) {
      logDebug('Initial site lookup returned null. Attempting fallback GUID formats...');
      console.log('Initial site lookup failed for site ID:', siteItemId);
      console.log('Normalized site ID:', normalizedSiteId);

      const attempts: Array<{ label: string; siteIdValue: string }> = [
        { label: 'braced-lower', siteIdValue: formatGuidWithBraces(normalizedSiteId) },
        { label: 'braced-upper', siteIdValue: formatGuidWithBraces(normalizedSiteId).toUpperCase() },
        { label: 'no-braces-lower', siteIdValue: normalizedSiteId },
        { label: 'no-braces-upper', siteIdValue: normalizedSiteId.toUpperCase() },
        { label: 'original', siteIdValue: siteItemId },
      ];

      for (const attempt of attempts) {
        try {
          console.log(`Attempting fallback lookup with format: ${attempt.label} = ${attempt.siteIdValue}`);
          logDebug(`Trying site lookup with format: ${attempt.label}`, attempt.siteIdValue);
          
          // Build query with inlined GUID (no variables)
          const fallbackQuery = `
            query FindSite {
              site: item(where: { database: "master", itemId: "${attempt.siteIdValue}", language: "en" }) {
                itemId
                name
                path
                children {
                  nodes {
                    itemId
                    name
                    path
                    template {
                      name
                    }
                    children {
                      nodes {
                        itemId
                        name
                        path
                        template {
                          name
                        }
                      }
                    }
                  }
                }
              }
            }
          `;
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const retryResp = await (context.client as any).mutate('xmc.authoring.graphql', {
            params: {
              query: { sitecoreContextId: context.contextId },
              body: { query: fallbackQuery.trim() }
            }
          });

          // Check for GraphQL errors
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const retryRespData = (retryResp as any).data as Record<string, unknown> | undefined;
          if (retryRespData?.errors) {
            console.log(`  ✗ GraphQL error for format ${attempt.label}:`, JSON.stringify(retryRespData.errors, null, 2));
            logDebug(`GraphQL error for ${attempt.label}:`, retryRespData.errors);
            continue;
          }

          siteData = retryRespData as Record<string, unknown> | undefined;
          siteInnerData = siteData?.data as Record<string, unknown> | undefined;
          site = siteInnerData?.site as Record<string, unknown> | undefined;

          if (site) {
            console.log(`✓ Found site using format: ${attempt.label}`);
            logDebug(`Found site using format: ${attempt.label}`);
            break;
          } else {
            console.log(`  ✗ No site found for format ${attempt.label}`);
          }
        } catch (err) {
          console.log(`✗ Error during fallback attempt ${attempt.label}:`, err instanceof Error ? err.message : err);
          logDebug(`Error during fallback attempt ${attempt.label}:`, err);
        }
      }
    }

    if (!site) {
      const errorMsg = `Site not found with ID: ${siteItemId} (normalized: ${normalizedSiteId}). Tried multiple GUID formats (braced/unbraced, upper/lowercase).`;
      console.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    console.log('Found site:', site.name, 'at path:', site.path);

    // Step 2: Find the Settings child
    const siteChildren = site.children as Record<string, unknown> | undefined;
    const siteChildrenNodes = siteChildren?.nodes as Array<Record<string, unknown>> | undefined;
    const settingsChild = siteChildrenNodes?.find(child =>
      (child.name as string)?.toLowerCase() === 'settings' ||
      (child.template as Record<string, unknown>)?.name?.toString()?.toLowerCase().includes('settings')
    );

    if (!settingsChild) {
      const availableChildren = siteChildrenNodes?.map(c => `${c.name} (${(c.template as Record<string, unknown>)?.name})`).join(', ') || 'none';
      return {
        success: false,
        error: `Settings folder not found under site: ${site.path}. Available children: ${availableChildren}. Note: The provided site ID may point to a sub-site or item without a Settings folder.`,
      };
    }

    console.log('Found Settings folder:', settingsChild.name, 'at path:', settingsChild.path);

    // Step 3: Find the Sitemap child under Settings
    const settingsChildren = settingsChild.children as Record<string, unknown> | undefined;
    const settingsChildrenNodes = settingsChildren?.nodes as Array<Record<string, unknown>> | undefined;
    const sitemapChild = settingsChildrenNodes?.find(child =>
      (child.name as string)?.toLowerCase() === 'sitemap' ||
      (child.template as Record<string, unknown>)?.name?.toString()?.toLowerCase().includes('sitemap')
    );

    if (!sitemapChild) {
      return {
        success: false,
        error: `Sitemap not found under Settings: ${settingsChild.path}. Available children: ${settingsChildrenNodes?.map(c => `${c.name} (${(c.template as Record<string, unknown>)?.name})`).join(', ')}`,
      };
    }

    console.log('Found sitemap:', sitemapChild.name, 'at path:', sitemapChild.path);

    // Step 4: Get full sitemap details using GraphQL
    const sitemapId = sitemapChild.itemId as string;
    const normalizedSitemapId = normalizeGuid(sitemapId);
    const sitemapQuery = `
      query GetSitemapDetails {
        sitemap: item(where: { database: "master", itemId: "${normalizedSitemapId}", language: "en" }) {
          itemId
          name
          path
          template {
            name
          }
          parent {
            itemId
            name
            path
          }
          fields {
            nodes {
              name
              value
            }
          }
          children {
            nodes {
              itemId
              name
              path
              template {
                name
              }
            }
          }
        }
      }
    `;

    console.log('Querying sitemap details...');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await (context.client as any).mutate('xmc.authoring.graphql', {
      params: {
        query: { sitecoreContextId: context.contextId },
        body: { query: sitemapQuery.trim() }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (response as any).data as Record<string, unknown> | undefined;
    const innerData = data?.data as Record<string, unknown> | undefined;
    const sitemap = innerData?.sitemap as Record<string, unknown> | undefined;

    if (!sitemap) {
      return {
        success: false,
        error: `Sitemap not found with ID: ${sitemapChild.id}`,
      };
    }

    console.log('Retrieved sitemap details:', sitemap.name, sitemap.path);

    // Convert fields to a map (similar to the GraphQL example)
    const rawFields: Record<string, string> = {};
    const fields = sitemap.fields as Record<string, unknown> | undefined;
    const fieldNodes = fields?.nodes as Array<Record<string, unknown>> | undefined;
    if (fieldNodes) {
      fieldNodes.forEach(field => {
        const name = field.name as string;
        const value = field.value as string;
        if (name) rawFields[name] = value || '';
      });
    }

    console.log('Resolving item references in fields...');
    const resolvedFields = await resolveItemReferences(rawFields);

    // Get children information from GraphQL response
    const children = (sitemap.children as Record<string, unknown>)?.nodes as Array<Record<string, unknown>> | undefined || [];

    const result: SitemapDetailsResult = {
      sitemap: {
        id: sitemap.itemId as string,
        name: sitemap.name as string,
        path: sitemap.path as string,
        template: (sitemap.template as Record<string, unknown>)?.name as string,
        parent: sitemap.parent ? {
          id: (sitemap.parent as Record<string, unknown>).itemId as string,
          name: (sitemap.parent as Record<string, unknown>).name as string,
          path: (sitemap.parent as Record<string, unknown>).path as string,
        } : null,
        fields: resolvedFields,
        children: children.map(child => ({
          id: child.itemId as string,
          name: child.name as string,
          path: child.path as string,
          template: (child.template as Record<string, unknown>)?.name as string,
        })),
      },
      summary: {
        fieldCount: Object.keys(resolvedFields).length,
        childrenCount: children.length,
        hasParent: !!sitemap.parent,
        rawFieldCount: Object.keys(rawFields).length,
        resolvedReferences: Object.values(resolvedFields).filter(v => typeof v === 'object' && v && 'id' in v).length,
      },
    };

    return {
      success: true,
      output: result,
    };

  } catch (err) {
    console.error('Error getting sitemap details:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to get sitemap details',
    };
  }
};